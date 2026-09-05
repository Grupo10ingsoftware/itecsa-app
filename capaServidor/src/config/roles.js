export const ROLES = Object.freeze({
    ADMINISTRADOR: "Administrador Producción",
    SOPORTE: "Soporte",
    GERENCIA: "Gerencia",
    PRODUCCION: "Operario Producción",
    VENTAS: "Operario Ventas",
    COBRANZAS: "Operario Cobranzas",
});

export const OFFICIAL_ROLES = new Set(Object.values(ROLES));
export const ADMINISTRATIVE_ROLES = new Set([
    ROLES.ADMINISTRADOR,
    ROLES.SOPORTE,
]);
