import getPrismaClient from "../../../database/prisma.js";

export class UserRepositoryError extends Error {
    constructor(code, message) {
        super(message);
        this.name = "UserRepositoryError";
        this.code = code;
    }
}

function toUserResponse(user) {
    if (!user) {
        return null;
    }

    return {
        idUsuario: user.id_usuario,
        idAuth0: user.id_auth0,
        correoUsuario: user.correo_usuario,
        rutUsuario: user.rut_usuario,
        nombreUsuario: user.nombre_usuario,
        apellidoUsuario: user.apellido_usuario,
        rolUsuario: user.rol_usuario,
        estadoUsuario: user.estado_usuario,
        rutaFirma: user.ruta_firma,
    };
}

function normalizeEmail(correoUsuario) {
    return correoUsuario.trim().toLowerCase();
}

function mapRepositoryError(error) {
    if (error?.code === "P2002") {
        return new UserRepositoryError(
            "USER_ALREADY_EXISTS",
            "Ya existe un usuario interno con ese correo o identificador externo.",
        );
    }

    return new UserRepositoryError(
        "USER_REPOSITORY_ERROR",
        "No fue posible operar sobre el usuario interno.",
    );
}

export class UserRepository {
    constructor({ prisma } = {}) {
        this.prisma = prisma;
    }

    get client() {
        if (!this.prisma) {
            this.prisma = getPrismaClient();
        }

        return this.prisma;
    }

    async findByEmail(correoUsuario) {
        try {
            const user = await this.client.usuario.findUnique({
                where: {
                    correo_usuario: normalizeEmail(correoUsuario),
                },
            });

            return toUserResponse(user);
        } catch (error) {
            throw mapRepositoryError(error);
        }
    }

    async create({
        auth0UserId,
        correoUsuario,
        rutUsuario,
        nombreUsuario,
        apellidoUsuario,
        rolUsuario,
        estadoUsuario,
        rutaFirma,
    }) {
        try {
            const user = await this.client.usuario.create({
                data: {
                    id_auth0: auth0UserId,
                    correo_usuario: normalizeEmail(correoUsuario),
                    rut_usuario: rutUsuario,
                    nombre_usuario: nombreUsuario,
                    apellido_usuario: apellidoUsuario,
                    rol_usuario: rolUsuario,
                    estado_usuario: estadoUsuario,
                    ruta_firma: rutaFirma,
                },
            });

            return toUserResponse(user);
        } catch (error) {
            throw mapRepositoryError(error);
        }
    }
}

export default new UserRepository();
