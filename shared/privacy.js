// Derechos y permisos de privacidad separados del catálogo de negocio (P11 pendiente).
export const PRIVACY_RIGHTS = Object.freeze(['access', 'rectification', 'erasure', 'opposition', 'portability', 'blocking']);
export const PRIVACY_LABELS = Object.freeze({ access: 'Acceso', rectification: 'Rectificación', erasure: 'Supresión', opposition: 'Oposición', portability: 'Portabilidad', blocking: 'Bloqueo' });
export const PRIVACY_PERMISSIONS = Object.freeze({ READ: 'read:privacy-cases', MANAGE: 'manage:privacy-cases' });
export const PRIVACY_DOMAINS = Object.freeze(['users', 'orders', 'payments', 'messages', 'history', 'metrics', 'calendar', 'production', 'clients']);
export const PRIVACY_SYSTEMS = Object.freeze(['mysql', 'auth0', 'email', 'logs', 'exports', 'backups', 'free_text', 'historical', 'source']);
