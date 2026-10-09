// Generado por node scripts/rbac.mjs --generate. No usar app_metadata como RBAC.
exports.onExecutePostLogin = async (event, api) => {
  if (event.resource_server?.identifier !== "https://api.itecsa.local") return;
  const recognized = ["Administrador Produccion","Administrador Ventas","Administrador Cobranzas","Operario Produccion","Operario Ventas","Operario Cobranzas","Gerencia","Soporte"];
  const assigned = event.authorization?.roles;
  const roles = Array.isArray(assigned) ? assigned.filter(role => recognized.includes(role)) : [];
  if (roles.length !== 1) {
    api.access.deny('Se requiere exactamente un rol ITECSA vigente.');
    return;
  }
  api.accessToken.setCustomClaim("https://itecsa.local/roles", roles);
  if (event.user?.email) api.accessToken.setCustomClaim('https://itecsa.local/email', event.user.email);
  // Auth0 RBAC emite permissions para esta API; nunca copiar scopes de Management API.
};
