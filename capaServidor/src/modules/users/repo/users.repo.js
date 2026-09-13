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
    };
}

function normalizeEmail(correoUsuario) {
    return correoUsuario.trim().toLowerCase();
}

function mapRepositoryError(error) {
    if (error?.code === "P2025") {
        return new UserRepositoryError(
            "USER_NOT_FOUND",
            "No existe un usuario interno con ese identificador.",
        );
    }

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

    async findByAuth0Id(auth0UserId) {
        try {
            const user = await this.client.usuario.findUnique({
                where: {
                    id_auth0: auth0UserId,
                },
            });

            return toUserResponse(user);
        } catch (error) {
            throw mapRepositoryError(error);
        }
    }

    async listRecentRecords(idUsuario, { page = 1, perPage = 10 } = {}) {
        if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
            throw new UserRepositoryError("USER_NOT_FOUND", "Usuario no válido.");
        }
        const records = await this.client.registros.findMany({
            where: { id_usuario: idUsuario },
            orderBy: [{ FECHA_HORA: "desc" }, { ID_REGISTRO: "desc" }],
            skip: (page - 1) * perPage,
            take: perPage,
            select: {
                ID_REGISTRO: true,
                FECHA_HORA: true,
                observacion: true,
                Registro_Pago: { select: {
                    Estado_Pago_Registro_Pago_id_estado_pago_nuevoToEstado_Pago: {
                        select: { nombre_estado_pago: true },
                    },
                } },
                Registro_Etapas: { select: {
                    Estado_Pedido: { select: { nombre_etapa: true } },
                } },
                registro_subprocesos: { select: {
                    Estado_Subprocesos: { select: { nombre_estado: true } },
                } },
            },
        });
        return records.map((record) => ({
            id: record.ID_REGISTRO,
            dateTime: record.FECHA_HORA,
            detail: record.Registro_Pago
                ? `Estado de pago: ${record.Registro_Pago.Estado_Pago_Registro_Pago_id_estado_pago_nuevoToEstado_Pago?.nombre_estado_pago ?? 'No informado'}`
                : record.Registro_Etapas
                    ? `Etapa del pedido: ${record.Registro_Etapas.Estado_Pedido?.nombre_etapa ?? 'No informada'}`
                    : record.registro_subprocesos
                        ? `Subproceso: ${record.registro_subprocesos.Estado_Subprocesos?.nombre_estado ?? 'No informado'}`
                        : record.observacion?.trim() || 'Actividad del pedido',
        }));
    }

    async listMovements(idUsuario, { page, perPage }) {
        const [records, total] = await Promise.all([
            this.listRecentRecords(idUsuario, { page, perPage }),
            this.client.registros.count({ where: { id_usuario: idUsuario } }),
        ]);
        return { records, total, page, perPage };
    }

    buildListWhere({ search = "", estadoUsuario = "", rolUsuario = "", allowedRoles } = {}) {
        const where = {};

        if (search) {
            where.OR = [
                { nombre_usuario: { contains: search } },
                { apellido_usuario: { contains: search } },
                { correo_usuario: { contains: search } },
                { rut_usuario: { contains: search } },
            ];
        }

        if (estadoUsuario === "Desvinculado") {
            where.estado_usuario = "Desvinculado";
        } else if (estadoUsuario === "Vinculado" || estadoUsuario === "Activo") {
            where.NOT = { estado_usuario: "Desvinculado" };
        }

        if (rolUsuario) {
            where.rol_usuario = rolUsuario;
        }

        if (allowedRoles) where.AND = [{rol_usuario: {in: allowedRoles}}];
        return where;
    }

    async list({ page = 1, perPage = 10, search = "", estadoUsuario = "", rolUsuario = "", allowedRoles } = {}) {
        const safePage = Number.isInteger(page) && page > 0 ? page : 1;
        const safePerPage =
            Number.isInteger(perPage) && perPage > 0 && perPage <= 50 ? perPage : 10;
        const where = this.buildListWhere({ search, estadoUsuario, rolUsuario, allowedRoles });

        try {
            const [users, total] = await Promise.all([
                this.client.usuario.findMany({
                    where,
                    orderBy: { id_usuario: "desc" },
                    skip: (safePage - 1) * safePerPage,
                    take: safePerPage,
                }),
                this.client.usuario.count({ where }),
            ]);

            return {
                usuarios: users.map(toUserResponse),
                total,
                page: safePage,
                perPage: safePerPage,
            };
        } catch (error) {
            throw mapRepositoryError(error);
        }
    }

    async getSummary({allowedRoles} = {}) {
        const where = allowedRoles ? {rol_usuario:{in:allowedRoles}} : {};
        try {
            const [totalUsuarios, desvinculados] = await Promise.all([
                this.client.usuario.count({where}),
                this.client.usuario.count({
                    where: { ...where, estado_usuario: "Desvinculado" },
                }),
            ]);

            return {
                totalUsuarios,
                vinculados: Math.max(0, totalUsuarios - desvinculados),
                desvinculados,
            };
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
                },
            });

            return toUserResponse(user);
        } catch (error) {
            throw mapRepositoryError(error);
        }
    }

    async updateByAuth0Id(auth0UserId, {
        correoUsuario,
        nombreUsuario,
        apellidoUsuario,
        rolUsuario,
    }) {
        try {
            const user = await this.client.usuario.update({
                where: { id_auth0: auth0UserId },
                data: {
                    correo_usuario: normalizeEmail(correoUsuario),
                    nombre_usuario: nombreUsuario,
                    apellido_usuario: apellidoUsuario,
                    rol_usuario: rolUsuario,
                },
            });

            return toUserResponse(user);
        } catch (error) {
            throw mapRepositoryError(error);
        }
    }

    async updateStatusByAuth0Id(auth0UserId, estadoUsuario) {
        try {
            const user = await this.client.usuario.update({
                where: { id_auth0: auth0UserId },
                data: { estado_usuario: estadoUsuario },
            });

            return toUserResponse(user);
        } catch (error) {
            throw mapRepositoryError(error);
        }
    }

    async updateRoleByAuth0Id(auth0UserId, rolUsuario) {
        try {
            const user = await this.client.usuario.update({
                where: { id_auth0: auth0UserId },
                data: { rol_usuario: rolUsuario },
            });

            return toUserResponse(user);
        } catch (error) {
            throw mapRepositoryError(error);
        }
    }

    async updateRoleIfCurrent(auth0UserId, currentRole, nextRole) {
        try {
            await this.client.usuario.updateMany({
                where: {
                    id_auth0: auth0UserId,
                    rol_usuario: currentRole,
                    estado_usuario: { in: ["Activo", "Vinculado"] },
                },
                data: { rol_usuario: nextRole },
            });
            return this.findByAuth0Id(auth0UserId);
        } catch (error) {
            if (error instanceof UserRepositoryError) throw error;
            throw mapRepositoryError(error);
        }
    }
}

export default new UserRepository();
