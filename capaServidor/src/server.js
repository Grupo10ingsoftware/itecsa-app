import express from 'express';
import cors from 'cors';

import orderRoutes from './modules/orders/routes/order.routes.js';
import authRoutes from './modules/auth/routes/auth.routes.js';
import adminUsersRoutes from './modules/users/routes/adminUsers.routes.js';
import healthRoutes from './modules/health/routes/health.routes.js';

class Server {
  constructor() {
    // Creamos como propiedad misma de la clase servidor
    this.app = express();
    this.port = process.env.PORT; // definido en .env
    this.paths = {
        // Rutas cuando las tengamos

        //* orders
        auth : '/api/auth',
        orders : '/api/orders',
        orderDetail: '/api/order-details',
        admin: '/api/admin',
        health: '/api/health',

        //* Estados


        }

    // Middlewares
    this.middlewares();
    // rutas de mi aplicacion
    this.routes();
  }



  // aca mismo podemos tener una función asincrona para conectar a la base de datos cuando este disponible
  middlewares() {
      
    // Cors
    this.app.use(cors( {origin : process.env.FRONTEND_ORIGIN}));

    // Parseo y lectura del Body - Recibir datos

    this.app.use( express.json() );

    // Directorio publico
    this.app.use(express.static("public"));

    
  }

  routes() {
    
    // Configurar rutas
    this.app.use(this.paths.orders, orderRoutes)
    /**
     * Un ejemplo sería    
     * this.app.use(this.paths.users, user_route);

     * Esto se definira cuando tengamos nuestros rutas definidas para cada API
     */
    this.app.use( this.paths.auth, authRoutes)
    this.app.use( this.paths.admin, adminUsersRoutes)
    this.app.use( this.paths.health, healthRoutes)

  }

  listen() {
    this.app.listen(this.port, () => {
      console.log("Servidor corriendo en puerto", this.port);
    });
  }
}

export default Server;
