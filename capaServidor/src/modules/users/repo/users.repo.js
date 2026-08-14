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

    buildListWhere({ search = "", estadoUsuario = "", rolUsuario = "" } = {}) {
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

        return where;
    }

    async list({ page = 1, perPage = 10, search = "", estadoUsuario = "", rolUsuario = "" } = {}) {
        const safePage = Number.isInteger(page) && page > 0 ? page : 1;
        const safePerPage =
            Number.isInteger(perPage) && perPage > 0 && perPage <= 50 ? perPage : 10;
        const where = this.buildListWhere({ search, estadoUsuario, rolUsuario });

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

    async getSummary() {
        try {
            const [totalUsuarios, desvinculados] = await Promise.all([
                this.client.usuario.count(),
                this.client.usuario.count({
                    where: { estado_usuario: "Desvinculado" },
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
        estadoUsuario,
    }) {
        try {
            const user = await this.client.usuario.update({
                where: { id_auth0: auth0UserId },
                data: {
                    correo_usuario: normalizeEmail(correoUsuario),
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
}

export default new UserRepository();
