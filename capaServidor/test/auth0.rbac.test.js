import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { actionCode, compare, expected } from '../../scripts/rbac.mjs';
import { RECOGNIZED_ROLES, ROLES_CLAIM } from '../../shared/authorization.js';
test('Action solo emite identidad ITECSA con un rol oficial y audience de negocio',async()=>{
 const context={exports:{}};vm.runInNewContext(actionCode,context);
 for(const role of RECOGNIZED_ROLES) {
  const claims={};let denied=false;
  await context.exports.onExecutePostLogin({resource_server:{identifier:'https://api.itecsa.local'},authorization:{roles:[role]},user:{email:'test@example.com'}},{access:{deny(){denied=true;}},accessToken:{setCustomClaim(k,v){claims[k]=v;}}});
  assert.equal(denied,false);assert.deepEqual(Array.from(claims[ROLES_CLAIM]),[role]);assert.equal(claims.permissions,undefined);assert.equal(claims.scope,undefined);
 }
 for(const roles of [[],['Administrador'],['Soporte','Gerencia'],['Administrador Produccion','Administrador Ventas']]) {
  let denied=false;await context.exports.onExecutePostLogin({resource_server:{identifier:'https://api.itecsa.local'},authorization:{roles}},{access:{deny(){denied=true;}},accessToken:{setCustomClaim(){assert.fail('No emitir claims');}}});assert.equal(denied,true);
 }
 await context.exports.onExecutePostLogin({resource_server:{identifier:'https://itecsa-sistema.us.auth0.com/api/v2/'}},{access:{deny(){assert.fail();}},accessToken:{setCustomClaim(){assert.fail();}}});
});
test('auditoria declarativa falla ante asociaciones desconocidas, scopes extra y binding sin verificar',()=>{
 assert.ok(compare({resourceServer:expected.resourceServer}).some(s=>s.includes('Soporte: sin verificar')));
 const full={...expected,actionCode,postLoginBound:true};assert.deepEqual(compare(full),[]);
 assert.ok(compare({...full,roles:{...full.roles,Soporte:[...full.roles.Soporte,'delete:users']}}).some(s=>s.includes('sobra delete:users')));
});


test('catálogo generado coincide con el modelo y no contiene permisos visuales retirados',()=>{
 assert.equal(expected.resourceServer.scopes.length,25);
 for(const scope of expected.resourceServer.scopes) assert.ok(scope.description?.trim(),scope.value);
 for(const permission of ['view:kanban-module','view:payments-module']) assert.equal(expected.resourceServer.scopes.some(s=>s.value===permission),false);
 const saved=JSON.parse(readFileSync(new URL('../../docs/auth0/rbac.expected.json',import.meta.url),'utf8'));
 assert.deepEqual(saved,expected);
});
