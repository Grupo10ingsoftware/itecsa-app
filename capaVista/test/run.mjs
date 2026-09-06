import { createServer } from 'vite';
const server=await createServer({server:{middlewareMode:true,ws:false,hmr:false},appType:'custom'});
try {const {run}=await server.ssrLoadModule('/test/authorization.cases.jsx');run();} finally {await server.close();}
