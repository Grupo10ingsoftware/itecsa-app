import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BUSINESS_PERMISSIONS, ROLE_PERMISSIONS, ROLES, RECOGNIZED_ROLES, ROLES_CLAIM } from '../shared/authorization.js';
export const audience = 'https://api.itecsa.local';
export const requirements = {
 'read:own-profile':'RF04, RF10', 'manage:own-pin':'RF06–07', 'read:orders':'RF17–18, RF20, RF23, RF32, RF64–68',
 'read:production-capacity':'RF25', 'read:own-messages':'RF56–63', 'update:own-messages':'RF56–63',
 'manage:users':'RF10–16, RNF02; departamento obligatorio', 'read:sales-notes':'RF42–45', 'create:orders':'RF42–48',
 'reevaluate:orders':'RF34', 'read:payments':'RF35, RF37–39', 'update:payment-status':'RF36; PIN',
 'revise:payment-status':'RF40; AC, motivo y PIN; aprobaciones pendientes fuera de alcance',
 'move:orders':'RF19; PIN; solo transiciones manuales', 'start:production':'RF19 y decisión del usuario: AP',
 'update:production-subprocesses':'RF21–22; PIN, producción y pago confirmado', 'rollback:production-subprocesses':'RF30; PIN y motivo',
 'manage:production-capacity':'RF24', 'manage:order-tags':'RF26–27', 'review:orders':'RF28',
 'cancel:orders':'RF29; PIN y motivo', 'read:production-calendar':'RF49, RF52; AV/OV solo lectura',
 'update:order-delivery-date':'RF51 y decisión del usuario: PIN obligatorio',
};
export const expected = {
 resourceServer:{identifier:audience,enforce_policies:true,token_dialect:'access_token_authz',signing_alg:'RS256',scopes:BUSINESS_PERMISSIONS.map(value=>({value,description:requirements[value]}))},
 roles: ROLE_PERMISSIONS,
};
export const actionCode = `// Generado por node scripts/rbac.mjs --generate. No usar app_metadata como RBAC.\nexports.onExecutePostLogin = async (event, api) => {\n  if (event.resource_server?.identifier !== ${JSON.stringify(audience)}) return;\n  const recognized = ${JSON.stringify(RECOGNIZED_ROLES)};\n  const assigned = event.authorization?.roles;\n  const roles = Array.isArray(assigned) ? assigned.filter(role => recognized.includes(role)) : [];\n  if (roles.length !== 1) {\n    api.access.deny('Se requiere exactamente un rol ITECSA vigente.');\n    return;\n  }\n  api.accessToken.setCustomClaim(${JSON.stringify(ROLES_CLAIM)}, roles);\n  if (event.user?.email) api.accessToken.setCustomClaim('https://itecsa.local/email', event.user.email);\n  // Auth0 RBAC emite permissions para esta API; nunca copiar scopes de Management API.\n};\n`;
export function compare(actual) {
 const differences=[];
 const resource=actual.resourceServer;
 if(!resource) differences.push('Falta evidencia del Resource Server');
 else {
  for(const key of ['identifier','enforce_policies','token_dialect','signing_alg']) if(resource[key]!==expected.resourceServer[key]) differences.push(`API: ${key} no coincide`);
  compareSet('API permissions',BUSINESS_PERMISSIONS,resource.scopes?.map(s=>s.value));
 }
 for(const [role,permissions] of Object.entries(ROLE_PERMISSIONS)) compareSet(role,permissions,actual.roles?.[role]);
 if(actual.actionCode!==actionCode) differences.push('Action desplegada: falta evidencia o código diferente');
 if(actual.postLoginBound!==true) differences.push('Binding Post Login sin verificar');
 function compareSet(label,want,have) {
  if(!Array.isArray(have)){differences.push(`${label}: sin verificar`);return;}
  for(const p of want)if(!have.includes(p)) differences.push(`${label}: falta ${p}`);
  for(const p of have)if(!want.includes(p)) differences.push(`${label}: sobra ${p}`);
 }
 return differences;
}
if(process.argv[1] === fileURLToPath(import.meta.url)) {
 const command=process.argv[2];
 if(command==='--generate') {
  writeFileSync(new URL('../docs/auth0/rbac.expected.json',import.meta.url),JSON.stringify(expected,null,2)+'\n');
  writeFileSync(new URL('../docs/auth0/itecsa-post-login.cjs',import.meta.url),actionCode);
  const lines=['# Asignación manual de permisos ITECSA','', 'Generado desde `shared/authorization.js` con `node scripts/rbac.mjs --generate`. No editar las listas a mano en este archivo.','',
  '**API:** ITECSA API · **Identifier:** `https://api.itecsa.local`.', '',
  'En Auth0: User Management → Roles → elegir rol → Permissions → Add Permissions → ITECSA API. Asignar exactamente la lista del rol. Los nombres técnicos usan `Produccion` sin tilde.', '',
  'No seleccionar Auth0 Management API. No conceder permisos directos adicionales a usuarios. Cada usuario debe tener exactamente un rol ITECSA y coincidir con su registro interno. Soporte se asigna únicamente por el equipo técnico.', '',
  'Estado: el usuario confirmó la configuración manual del dashboard. El MCP no ofrece herramientas de roles, por lo que las asociaciones no se han releído de forma independiente. Falta validar sesiones nuevas.', '',
  'Los ocho scopes antiguos ya se eliminaron de ITECSA API por solicitud del usuario. El catálogo contiene exactamente estos 23 permisos. Asignar las listas a los roles y renovar las sesiones. Soporte debe recibir los 23; nunca scopes de Management API.', ''];
  for(const [role,permissions] of Object.entries(ROLE_PERMISSIONS)) {
   lines.push('## '+role,'',role===ROLES.SOPORTE?'Rol técnico de desarrollo/testing. Todos los **23 permisos funcionales**; conserva PIN y reglas de estado. No se ofrece en formularios.':'Rol funcional. Mínimo privilegio según requisitos vigentes.','',...permissions.map(p=>'- `'+p+'`'),'');
  }
  lines.push('## Trazabilidad del catálogo','','| Permission | Justificación / condición |','| --- | --- |',...BUSINESS_PERMISSIONS.map(p=>'| `'+p+'` | '+requirements[p]+' |'),'');
  writeFileSync(new URL('../docs/auth0/RBAC-PERMISOS-POR-ROL.md',import.meta.url),lines.join('\n'));
 } else if(command==='--check') {
  const differences=compare(JSON.parse(readFileSync(process.argv[3],'utf8')));
  console.log(differences.length?differences.join('\n'):'API, roles y Action coinciden con el modelo esperado.');process.exitCode=differences.length?1:0;
 } else { console.log('Uso: node scripts/rbac.mjs --generate | --check snapshot.json');process.exitCode=2; }
}
