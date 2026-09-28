import {
    createCipheriv,
    createDecipheriv,
    createHmac,
    hkdfSync,
    randomBytes,
    randomInt,
    scrypt as scryptCallback,
    timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

import getPrismaClient from "../../../database/prisma.js";
import {
    defaultPinRecoveryDelivery,
    PinDeliveryUnavailableError,
} from "./pinDelivery.service.js";
import { currentAppEnvironment } from "../../../config/environment.js";
import {
    ACTIVE_USER_STATUSES,
    isActiveUserStatus,
} from "../../../config/userLifecycle.js";

import { ROLES, roleFromPayload, can, PERMISSIONS } from "../../../../../shared/authorization.js";

const scrypt = promisify(scryptCallback);
const PIN_PATTERN = /^\d{6}$/;
const RECOVERY_CODE_PATTERN = /^\d{6}$/;
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;
const RECOVERY_TTL_MS = 15 * 60 * 1000;

export class PinServiceError extends Error {
    constructor(code, message, { status = 400, details } = {}) {
        super(message);
        this.name = "PinServiceError";
        this.code = code;
        this.status = status;
        this.details = details;
    }
}

function decodeSecret(value) {
    const normalized = String(value ?? "").trim();
    const decoded = Buffer.from(normalized, "base64");

    if (
        !normalized ||
        decoded.length !== 32 ||
        decoded.toString("base64").replace(/=+$/, "") !==
            normalized.replace(/=+$/, "")
    ) {
        throw new PinServiceError(
            "PIN_CONFIGURATION_ERROR",
            "PIN_SECRET debe contener exactamente 32 bytes codificados en base64.",
            { status: 500 },
        );
    }

    return decoded;
}

function deriveKey(secret, purpose) {
    return Buffer.from(
        hkdfSync("sha256", secret, Buffer.alloc(0), Buffer.from(purpose), 32),
    );
}

async function hashValue(value, salt = randomBytes(16)) {
    const derived = await scrypt(value, salt, 32, { N: 16384, r: 8, p: 1 });

    return {
        hash: Buffer.from(derived).toString("base64"),
        salt: salt.toString("base64"),
    };
}

async function matchesHash(value, hash, salt) {
    if (!hash || !salt) return false;

    const expected = Buffer.from(hash, "base64");
    const actual = Buffer.from(
        await scrypt(value, Buffer.from(salt, "base64"), expected.length, {
            N: 16384,
            r: 8,
            p: 1,
        }),
    );

    return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function sixDigits() {
    return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function pinStatus(user) {
    return user.pin_accepted_at ? "active" : "pending_acknowledgement";
}

function assertActiveUser(user) {
    if (!user || !isActiveUserStatus(user.estado_usuario)) {
        throw new PinServiceError(
            "PIN_USER_UNAVAILABLE",
            "El usuario autenticado no esta activo o no esta vinculado.",
            { status: 403 },
        );
    }
}

export class PinService {
    constructor({
        prisma,
        secret,
        delivery = defaultPinRecoveryDelivery,
        now = () => new Date(),
    } = {}) {
        this.prisma = prisma;
        this.secretValue = secret;
        this.delivery = delivery;
        this.now = now;
    }

    get client() {
        return this.prisma ?? getPrismaClient();
    }

    get keys() {
        const root = decodeSecret(this.secretValue ?? process.env.PIN_SECRET);

        return {
            encryption: deriveKey(root, "itecsa-pin-encryption-v1"),
            fingerprint: deriveKey(root, "itecsa-pin-fingerprint-v1"),
        };
    }

    fingerprint(pin) {
        return createHmac("sha256", this.keys.fingerprint).update(pin).digest("hex");
    }

    encrypt(pin) {
        const iv = randomBytes(12);
        const cipher = createCipheriv("aes-256-gcm", this.keys.encryption, iv);
        const ciphertext = Buffer.concat([
            cipher.update(pin, "utf8"),
            cipher.final(),
        ]);

        return {
            ciphertext: ciphertext.toString("base64"),
            iv: iv.toString("base64"),
            tag: cipher.getAuthTag().toString("base64"),
        };
    }

    decrypt(user) {
        try {
            const decipher = createDecipheriv(
                "aes-256-gcm",
                this.keys.encryption,
                Buffer.from(user.pin_pending_iv, "base64"),
            );
            decipher.setAuthTag(Buffer.from(user.pin_pending_tag, "base64"));

            return Buffer.concat([
                decipher.update(Buffer.from(user.pin_pending_ciphertext, "base64")),
                decipher.final(),
            ]).toString("utf8");
        } catch {
            throw new PinServiceError(
                "PIN_PENDING_DATA_INVALID",
                "No fue posible recuperar el PIN pendiente.",
                { status: 500 },
            );
        }
    }

    async buildCredential() {
        const pin = sixDigits();
        const hashed = await hashValue(pin);
        const encrypted = this.encrypt(pin);

        return {
            pin,
            data: {
                pin_hash: hashed.hash,
                pin_salt: hashed.salt,
                pin_fingerprint: this.fingerprint(pin),
                pin_pending_ciphertext: encrypted.ciphertext,
                pin_pending_iv: encrypted.iv,
                pin_pending_tag: encrypted.tag,
                pin_accepted_at: null,
                pin_failed_attempts: 0,
                pin_locked_until: null,
            },
        };
    }

    async findUser(auth0UserId) {
        return this.client.usuario.findUnique({
            where: { id_auth0: auth0UserId },
        });
    }

    async provisionByUserId(userId) {
        for (let attempt = 0; attempt < 20; attempt += 1) {
            const credential = await this.buildCredential();

            try {
                const result = await this.client.usuario.updateMany({
                    where: { id_usuario: Number(userId), pin_hash: null },
                    data: credential.data,
                });

                if (result.count === 1) return "pending_acknowledgement";

                const current = await this.client.usuario.findUnique({
                    where: { id_usuario: Number(userId) },
                });

                return current ? pinStatus(current) : null;
            } catch (error) {
                if (error?.code !== "P2002") throw error;
            }
        }

        throw new PinServiceError(
            "PIN_GENERATION_FAILED",
            "No fue posible generar un PIN unico.",
            { status: 500 },
        );
    }

    async ensureProvisioned(auth0UserId) {
        let user = await this.findUser(auth0UserId);
        assertActiveUser(user);

        if (!user.pin_hash) {
            await this.provisionByUserId(user.id_usuario);
            user = await this.findUser(auth0UserId);
        }

        return pinStatus(user);
    }

    async reveal(auth0UserId) {
        const user = await this.findUser(auth0UserId);
        assertActiveUser(user);

        if (
            user.pin_accepted_at ||
            !user.pin_pending_ciphertext ||
            !user.pin_pending_iv ||
            !user.pin_pending_tag
        ) {
            throw new PinServiceError(
                "PIN_NOT_REVEALABLE",
                "El PIN ya no puede volver a mostrarse.",
                { status: 409 },
            );
        }

        return this.decrypt(user);
    }

    async acknowledge(auth0UserId) {
        const user = await this.findUser(auth0UserId);
        assertActiveUser(user);

        if (!user.pin_hash) {
            throw new PinServiceError(
                "PIN_NOT_PROVISIONED",
                "El usuario aun no tiene un PIN.",
                { status: 409 },
            );
        }

        if (user.pin_accepted_at) return;

        await this.client.usuario.update({
            where: { id_usuario: user.id_usuario },
            data: {
                pin_accepted_at: this.now(),
                pin_pending_ciphertext: null,
                pin_pending_iv: null,
                pin_pending_tag: null,
            },
        });
    }

    async validate(auth0UserId, pin) {
        if (!PIN_PATTERN.test(String(pin ?? ""))) {
            throw new PinServiceError(
                "PIN_FORMAT_INVALID",
                "El PIN debe contener seis digitos.",
            );
        }

        const user = await this.findUser(auth0UserId);
        assertActiveUser(user);

        if (!user.pin_hash || !user.pin_accepted_at) {
            throw new PinServiceError(
                "PIN_NOT_ACKNOWLEDGED",
                "Debes recibir y aceptar tu PIN antes de usarlo.",
                { status: 403 },
            );
        }

        const now = this.now();

        if (user.pin_locked_until && user.pin_locked_until > now) {
            throw new PinServiceError("PIN_LOCKED", "El PIN esta temporalmente bloqueado.", {
                status: 423,
                details: {
                    retryAfterSeconds: Math.ceil((user.pin_locked_until - now) / 1000),
                },
            });
        }

        const valid = await matchesHash(pin, user.pin_hash, user.pin_salt);

        if (!valid) {
            const attempts = (user.pin_failed_attempts ?? 0) + 1;
            const lockedUntil =
                attempts >= MAX_ATTEMPTS ? new Date(now.getTime() + LOCK_MS) : null;

            await this.client.usuario.update({
                where: { id_usuario: user.id_usuario },
                data: {
                    pin_failed_attempts: attempts >= MAX_ATTEMPTS ? 0 : attempts,
                    pin_locked_until: lockedUntil,
                },
            });

            throw new PinServiceError("PIN_INVALID", "El PIN ingresado no es valido.", {
                status: 403,
            });
        }

        if (user.pin_failed_attempts || user.pin_locked_until) {
            await this.client.usuario.update({
                where: { id_usuario: user.id_usuario },
                data: { pin_failed_attempts: 0, pin_locked_until: null },
            });
        }

        return {
            idUsuario: user.id_usuario,
            correoUsuario: user.correo_usuario,
            nombreUsuario: user.nombre_usuario,
            apellidoUsuario: user.apellido_usuario,
        };
    }

    async debugReset(payload) {
        if (currentAppEnvironment() !== "development") {
            throw new PinServiceError("PIN_DEBUG_DISABLED", "La generacion debug solo esta disponible en desarrollo.", { status: 403 });
        }
        if (!payload?.sub || roleFromPayload(payload) !== ROLES.SOPORTE ||
            !can(ROLES.SOPORTE, payload.permissions, PERMISSIONS.MANAGE_PIN)) {
            throw new PinServiceError("PIN_DEBUG_FORBIDDEN", "Esta accion requiere el rol Soporte.", { status: 403 });
        }
        const user = await this.findUser(payload.sub);
        assertActiveUser(user);
        if (user.rol_usuario !== ROLES.SOPORTE) {
            throw new PinServiceError("PIN_DEBUG_FORBIDDEN", "Renueva tu sesion para verificar tu rol.", { status: 403 });
        }
        for (let attempt = 0; attempt < 20; attempt += 1) {
            const credential = await this.buildCredential();
            if (await matchesHash(credential.pin, user.pin_hash, user.pin_salt)) continue;
            try {
                await this.client.$transaction(async (tx) => {
                    const result = await tx.usuario.updateMany({
                        where: {
                            id_usuario: user.id_usuario,
                            rol_usuario: ROLES.SOPORTE,
                            estado_usuario: { in: [...ACTIVE_USER_STATUSES] },
                            pin_hash: user.pin_hash,
                        },
                        data: credential.data,
                    });
                    if (result.count !== 1) {
                        throw new PinServiceError("PIN_DEBUG_CONFLICT", "La cuenta cambio. Actualiza tu sesion e intenta nuevamente.", { status: 409 });
                    }
                    await tx.pinRecoveryChallenge.updateMany({
                        where: { id_usuario: user.id_usuario, used_at: null },
                        data: { used_at: this.now() },
                    });
                });
                return "pending_acknowledgement";
            } catch (error) {
                if (error?.code !== "P2002") throw error;
            }
        }
        throw new PinServiceError("PIN_GENERATION_FAILED", "No fue posible generar un PIN unico.", { status: 500 });
    }

    async requestRecovery(auth0UserId) {
        const user = await this.findUser(auth0UserId);
        assertActiveUser(user);

        const code = sixDigits();
        const hashed = await hashValue(code);
        const now = this.now();
        const challenge = await this.client.pinRecoveryChallenge.create({
            data: {
                id_usuario: user.id_usuario,
                code_hash: hashed.hash,
                code_salt: hashed.salt,
                expires_at: new Date(now.getTime() + RECOVERY_TTL_MS),
                delivery_status: "pending",
            },
        });

        try {
            await this.delivery.sendCode({
                to: user.correo_usuario,
                code,
                expiresAt: challenge.expires_at,
            });
            await this.client.pinRecoveryChallenge.update({
                where: {
                    id_pin_recovery_challenge:
                        challenge.id_pin_recovery_challenge,
                },
                data: { delivery_status: "delivered" },
            });
        } catch (error) {
            await this.client.pinRecoveryChallenge.update({
                where: {
                    id_pin_recovery_challenge:
                        challenge.id_pin_recovery_challenge,
                },
                data: { delivery_status: "failed", used_at: now },
            });

            if (error instanceof PinDeliveryUnavailableError) throw error;

            throw new PinServiceError(
                "PIN_RECOVERY_DELIVERY_FAILED",
                "No fue posible enviar el codigo de recuperacion.",
                { status: 503 },
            );
        }
    }

    async confirmRecovery(auth0UserId, code) {
        if (!RECOVERY_CODE_PATTERN.test(String(code ?? ""))) {
            throw new PinServiceError(
                "PIN_RECOVERY_CODE_FORMAT_INVALID",
                "El codigo debe contener seis digitos.",
            );
        }

        const user = await this.findUser(auth0UserId);
        assertActiveUser(user);

        const challenge = await this.client.pinRecoveryChallenge.findFirst({
            where: {
                id_usuario: user.id_usuario,
                used_at: null,
                delivery_status: "delivered",
            },
            orderBy: { created_at: "desc" },
        });

        if (!challenge || challenge.expires_at <= this.now()) {
            throw new PinServiceError(
                "PIN_RECOVERY_CODE_EXPIRED",
                "El codigo expiro o no existe.",
                { status: 410 },
            );
        }

        if (challenge.failed_attempts >= MAX_ATTEMPTS) {
            throw new PinServiceError(
                "PIN_RECOVERY_ATTEMPTS_EXHAUSTED",
                "Se agotaron los intentos del codigo.",
                { status: 429 },
            );
        }

        if (!(await matchesHash(code, challenge.code_hash, challenge.code_salt))) {
            const failedAttempts = challenge.failed_attempts + 1;

            await this.client.pinRecoveryChallenge.update({
                where: {
                    id_pin_recovery_challenge:
                        challenge.id_pin_recovery_challenge,
                },
                data: {
                    failed_attempts: failedAttempts,
                    used_at: failedAttempts >= MAX_ATTEMPTS ? this.now() : null,
                },
            });

            throw new PinServiceError(
                "PIN_RECOVERY_CODE_INVALID",
                "El codigo ingresado no es valido.",
            );
        }

        for (let attempt = 0; attempt < 20; attempt += 1) {
            const credential = await this.buildCredential();

            try {
                await this.client.$transaction([
                    this.client.usuario.update({
                        where: { id_usuario: user.id_usuario },
                        data: credential.data,
                    }),
                    this.client.pinRecoveryChallenge.update({
                        where: {
                            id_pin_recovery_challenge:
                                challenge.id_pin_recovery_challenge,
                        },
                        data: { used_at: this.now() },
                    }),
                    this.client.pinRecoveryChallenge.updateMany({
                        where: { id_usuario: user.id_usuario, used_at: null },
                        data: { used_at: this.now() },
                    }),
                ]);

                return "pending_acknowledgement";
            } catch (error) {
                if (error?.code !== "P2002") throw error;
            }
        }

        throw new PinServiceError(
            "PIN_GENERATION_FAILED",
            "No fue posible generar un PIN unico.",
            { status: 500 },
        );
    }

    async invalidateByAuth0Id(auth0UserId) {
        const user = await this.findUser(auth0UserId);
        if (!user) return;

        await this.client.$transaction([
            this.client.usuario.update({
                where: { id_usuario: user.id_usuario },
                data: {
                    pin_hash: null,
                    pin_salt: null,
                    pin_fingerprint: null,
                    pin_pending_ciphertext: null,
                    pin_pending_iv: null,
                    pin_pending_tag: null,
                    pin_accepted_at: null,
                    pin_failed_attempts: 0,
                    pin_locked_until: null,
                },
            }),
            this.client.pinRecoveryChallenge.updateMany({
                where: { id_usuario: user.id_usuario, used_at: null },
                data: { used_at: this.now() },
            }),
        ]);
    }
}

export default new PinService();
