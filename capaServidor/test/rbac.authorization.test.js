import assert from 'node:assert/strict';
import { test } from 'node:test';
import { once } from 'node:events';
import express from 'express';
import { BUSINESS_PERMISSIONS, ROLE_PERMISSIONS, ROLES, ROLES_CLAIM, manageableRoles } from '../../shared/authorization.js';
import { createOrderRouter } from '../src/modules/orders/routes/order.routes.js';
import { createAdminUsersRouter } from '../src/modules/users/routes/adminUsers.routes.js';
import { createProductionCapacityRouter } from '../src/modules/productionCapacity/routes/productionCapacity.routes.js';
import { createProductionCalendarRouter } from '../src/modules/productionCalendar/routes/productionCalendar.routes.js';
import { createProductionLoadRouter } from '../src/modules/productionLoad/routes/productionLoad.routes.js';
import { createOrderHistoryRouter } from '../src/modules/history/routes/orderHistory.routes.js';
import { createMessageRouter } from '../src/modules/messages/routes/message.routes.js';
import { createRequireActiveIdentity } from '../src/middlewares/requireActiveIdentity.js';
import { createRequirePin } from '../src/middlewares/requirePin.js';
import { PinServiceError } from '../src/modules/auth/service/pin.service.js';

const {ADMINISTRADOR: AP, ADMIN_VENTAS: AV, ADMIN_COBRANZAS: AC, PRODUCCION: OP, VENTAS: OV, COBRANZAS: OC, GERENCIA: G, SOPORTE: S} = ROLES;
const all = [AP,AV,AC,OP,OV,OC,G,S];
const authenticate = (req,res,next) => {
  if (!req.headers['x-test-role']) return res.sendStatus(401);
  req.auth = {payload:{sub:'auth0|actor',[ROLES_CLAIM]:[req.headers['x-test-role']],permissions:req.headers['x-no-permissions'] ? [] : BUSINESS_PERMISSIONS}};
  next();
};
const validatePin = createRequirePin({pins:{async validate(sub,pin) {
  assert.equal(sub,'auth0|actor');
  if (pin !== '123456') throw new PinServiceError('PIN_INVALID','PIN incorrecto.',{status:403});
  return {idUsuario:1};
}}});
const ok = (_req,res) => res.sendStatus(204);
const controller = Object.fromEntries(['getOrders','getOrder','getSalesNote','createOrder','updatePaymentStatus','updateGeneralStep','sendToReview','cancelProduction','rollbackSubprocess','reevaluate','setLabel','updateDeliveryDate','completeSubprocess','list','update','calculateOperationalLoad','getToday','saveToday','listOrders','getOrderHistory','getInbox','getNotifications','clearNotifications','hideNotification','markAsRead','getMessage'].map(k=>[k,ok]));
async function listen(app,t) {const s=app.listen(0); t.after(()=>s.close()); await once(s,'listening'); return `http://127.0.0.1:${s.address().port}`;}

// Expected access is literal and independent of ROLE_PERMISSIONS. Tokens deliberately
// contain excessive scopes: a misconfigured Auth0 grant must not expand functional roles.
const endpoints = [
 ['GET','/orders',all],['GET','/orders/kanban',all],['GET','/orders/1',all],
 ['GET','/orders/sales-notes/NV1',[AV,OV,S]],['POST','/orders',[AV,OV,S]],
 ['PATCH','/orders/1/payment-status',[AC,OC,S],true],
 ['PATCH','/orders/1/move',[AP,OP,S],true],['PATCH','/orders/1/review',[AP,S]],
 ['PATCH','/orders/1/cancel-production',[AP,S],true],['PATCH','/orders/1/reevaluate',[AV,OV,S]],
 ['PATCH','/orders/1/labels',[AP,S]],['PATCH','/orders/1/delivery-date',[AP,S],true],
 ['PATCH','/orders/1/details/1/subprocesses/1/complete',[AP,OP,S],true],
 ['PATCH','/orders/1/details/1/subprocesses/1/rollback',[AP,S],true],
 ['GET','/capacity',all],['PATCH','/capacity',[AP,S]],
 ['GET','/load/today',all],['PATCH','/load/today',[AP,S]],
 ['POST','/calendar/operational-load',[AP,AV,OV,S]],
 ['GET','/history/orders',all],['GET','/history/orders/1',all],
 ['GET','/messages',all],['GET','/messages/notifications',all],['GET','/messages/1',all],
 ['PATCH','/messages/notifications',all],['PATCH','/messages/notifications/1',all],['PATCH','/messages/1/read',all],
];
test('matriz HTTP por rol, permisos y PIN: llamadas directas', async t => {
 const app=express();app.use(express.json());
 for (const [path, factory] of [['/orders',createOrderRouter],['/capacity',createProductionCapacityRouter],['/load',createProductionLoadRouter],['/calendar',createProductionCalendarRouter],['/history',createOrderHistoryRouter],['/messages',createMessageRouter]]) app.use(path,factory({authenticate,controller,validatePin}));
 const base=await listen(app,t);
 for(const [method,path,allowed,pin] of endpoints) {
  for(const role of all) await t.test(`${role} ${method} ${path} => ${allowed.includes(role)?204:403}`, async()=> {
    const response=await fetch(base+path,{method,headers:{'x-test-role':role,'content-type':'application/json'},...(method==='GET'?{}:{body:JSON.stringify({pin:'123456'})})});
    assert.equal(response.status,allowed.includes(role)?204:403);
  });
  await t.test(`sin permiso + PIN correcto ${method} ${path} => 403`,async()=>{
   const res=await fetch(base+path,{method,headers:{'x-test-role':S,'x-no-permissions':'1','content-type':'application/json'},...(method==='GET'?{}:{body:JSON.stringify({pin:'123456'})})});assert.equal(res.status,403);
  });
  if(pin) await t.test(`Soporte con permiso + PIN incorrecto ${path} => 403`,async()=>{
   const res=await fetch(base+path,{method,headers:{'x-test-role':S,'content-type':'application/json'},body:JSON.stringify({pin:'000000'})});assert.equal(res.status,403);
  });
 }
 assert.equal((await fetch(base+'/orders')).status,401);
});

test('gestion de usuarios: departamento, escalamiento y revinculacion RNF02',async t=>{
 let targetRole=OP, writes=0, listFilters;
 const target=()=>({idUsuario:2,idAuth0:'auth0|target',rolUsuario:targetRole,estadoUsuario:'Desvinculado',correoUsuario:'target@example.com'});
 const users={async findByAuth0Id(){return target();},async findByEmail(){return null;},async list(filters){listFilters=filters;return {usuarios:[],total:0};},async getSummary(){return {};},async updateStatusByAuth0Id(){writes++;return {...target(),estadoUsuario:'Vinculado'};},async updateByAuth0Id(){writes++;return target();}};
 const app=express();app.use(express.json());app.use('/admin',createAdminUsersRouter({authenticate,validatePin,users,updateStatus:async()=>{},updateUser:async()=>{},pins:{async ensureProvisioned(){}}}));
 const base=await listen(app,t);
 async function request(role,path,method='GET',body) {return fetch(base+'/admin'+path,{method,headers:{'x-test-role':role,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});}
 for(const actor of all) for(const deptRole of [OP,OV,OC,G,S]) await t.test(`${actor} revincula ${deptRole}`,async()=>{
  targetRole=deptRole;const before=writes;
  const allowed=(actor===AP&&deptRole===OP)||(actor===AV&&deptRole===OV)||(actor===AC&&deptRole===OC)||(actor===S&&deptRole!==S);
  const res=await request(actor,'/users/auth0%7Ctarget/status','PATCH',{estadoUsuario:'Vinculado',pin:'123456'});
  assert.equal(res.status,allowed?200:403);assert.equal(writes-before,allowed?1:0);
 });
 for(const [actor,own,other] of [[AP,OP,OV],[AV,OV,OC],[AC,OC,OP]]) {
  assert.equal((await request(actor,'/users?search=target')).status,200);assert.deepEqual(listFilters.allowedRoles,[actor,own]);
  assert.equal((await request(actor,'/users?rolUsuario='+encodeURIComponent(other))).status,403);
  assert.equal((await request(actor,'/users?rolUsuario=Gerencia')).status,403);
  targetRole=own;const before=writes;
  const edit={nombreUsuario:'Ana',apellidoUsuario:'Perez',correoUsuario:'ana@example.com',rolUsuario:other,pin:'123456'};
  assert.equal((await request(actor,'/users/auth0%7Ctarget','PATCH',edit)).status,403);
  assert.equal((await request(actor,'/users/auth0%7Ctarget','PATCH',{...edit,rolUsuario:own,departamento:'otro'})).status,400);
  assert.equal(writes,before);
 }
 for(const actor of all) assert.equal(manageableRoles(actor).includes(S),false);
});

test('contrato de identidad: denegacion antes de ejecutar operaciones',async()=>{
 const valid={sub:'auth0|actor',[ROLES_CLAIM]:[AP],permissions:['read:orders']};
 for(const [name,payload,user,status] of [
  ['valido',valid,{estadoUsuario:'Activo',rolUsuario:AP},204],
  ['sin identidad',{},null,401],['sin rol',{...valid,[ROLES_CLAIM]:[]},null,403],
  ['multiples',{...valid,[ROLES_CLAIM]:[AP,AV]},null,403],['obsoleto',{...valid,[ROLES_CLAIM]:['Administrador']},null,403],
  ['sin permisos',{...valid,permissions:undefined},null,403],['desvinculado',valid,{estadoUsuario:'Desvinculado',rolUsuario:AP},403],
  ['token de rol anterior',valid,{estadoUsuario:'Activo',rolUsuario:OP},403],['sin usuario',valid,null,403],
 ]) {
  let actual;const middleware=createRequireActiveIdentity({repository:{async findByAuth0Id(){return user;}}});
  const res={status(s){actual=s;return this;},json(){}};
  await middleware({auth:{payload}},res,()=>{actual=204;});assert.equal(actual,status,name);
 }
 assert.deepEqual([...ROLE_PERMISSIONS[S]].sort(),[...BUSINESS_PERMISSIONS].sort());
 for(const forbidden of ['create:clients','update:resource_servers','delete:users','update:connections']) assert.equal(ROLE_PERMISSIONS[S].includes(forbidden),false);
});

test('rutas auxiliares no permiten fabricar escrituras fuera del flujo de negocio',async t=>{
 const factories=await Promise.all([
  import('../src/modules/clients/routes/clients.routes.js').then(m=>m.createPaymentStatusRouter),
  import('../src/modules/products/routes/product.routes.js').then(m=>m.createProductTypeRouter),
  import('../src/modules/orders/routes/orderStatus.routes.js').then(m=>m.createOrderStatusRouter),
  import('../src/modules/payments/routes/paymentStatus.routes.js').then(m=>m.createPaymentStatusRouter),
  import('../src/modules/orders/routes/orderDetail.routes.js').then(m=>m.createOrderDetailRouter),
  import('../src/modules/payments/routes/paymentRecord.routes.js').then(m=>m.createPaymentRecordRouter),
 ]);
 const paths=['/clients','/products','/order-status','/payment-status','/orders/1/details','/orders/1/payment-records'];
 const app=express();app.use(express.json());
 factories.forEach((factory,i)=>app.use(paths[i],factory({authenticate})));
 const base=await listen(app,t);
 for(const role of all)for(const path of paths)await t.test(`${role} POST ${path} => 403`,async()=>{
  const response=await fetch(base+path,{method:'POST',headers:{'x-test-role':role,'content-type':'application/json'},body:JSON.stringify({pin:'123456',id_usuario:999,id_estado_pago:2,id_estado_subproceso:2})});
  assert.equal(response.status,403);
 });
});
