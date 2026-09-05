export const ROLES = Object.freeze({
    ADMINISTRADOR: "Administrador Produccion",
    SOPORTE: "Soporte",
    GERENCIA: "Gerencia",
    PRODUCCION: "Operario Produccion",
    VENTAS: "Operario Ventas",
    COBRANZAS: "Operario Cobranzas",
});

export const OFFICIAL_ROLES = new Set(Object.values(ROLES));
export const ADMINISTRATIVE_ROLES = new Set([
    ROLES.ADMINISTRADOR,
    ROLES.SOPORTE,
]);
