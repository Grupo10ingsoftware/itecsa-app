export const ROLES = Object.freeze({
    ADMINISTRADOR: "Administrador",
    SOPORTE: "Soporte",
    GERENCIA: "Gerencia",
    PRODUCCION: "Producción",
    VENTAS: "Ventas",
    COBRANZAS: "Cobranzas",
});

export const OFFICIAL_ROLES = new Set(Object.values(ROLES));
export const ADMINISTRATIVE_ROLES = new Set([
    ROLES.ADMINISTRADOR,
    ROLES.SOPORTE,
]);
