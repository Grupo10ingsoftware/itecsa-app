import express from 'express';
import cors from 'cors';

import authRoutes from './modules/auth/routes/auth.routes.js';
import adminUsersRoutes from './modules/users/routes/adminUsers.routes.js';
import documentRoutes from './modules/documents/routes/document.routes.js';
import demoOrdersRoutes from './modules/demoOrders/routes/demoOrders.routes.js';
import healthRoutes from './modules/health/routes/health.routes.js';
import productionCalendarRoutes from './modules/productionCalendar/routes/productionCalendar.routes.js';
import productionCapacityRoutes from './modules/productionCapacity/routes/productionCapacity.routes.js';
import productionLoadRoutes from './modules/productionLoad/routes/productionLoad.routes.js';

import orderRoutes from './modules/orders/routes/order.routes.js';
import orderDetailRoutes from './modules/orders/routes/orderDetail.routes.js';
import orderStatusRoutes from './modules/orders/routes/orderStatus.routes.js';

import productRoutes from './modules/products/routes/product.routes.js';


import paymentStatusRoutes from './modules/payments/routes/paymentStatus.routes.js'

import clientsRoutes from './modules/clients/routes/clients.routes.js';
import messageRoutes from './modules/messages/routes/message.routes.js';
import orderHistoryRoutes from './modules/history/routes/orderHistory.routes.js';
import metricsRoutes from './modules/metrics/routes/metrics.routes.js';
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
        documents: '/api/documents',
        demoOrders: '/api/demo-orders',
        health: '/api/health',
        messages: '/api/messages',
        history: '/api/history',
        productionCalendar: '/api/production-calendar',
        productionCapacity: '/api/production-capacity',
        productionLoad: '/api/production-load',
        metrics: '/api/metrics',

        //* Estados
        orderStatus: '/api/order-status',
        paymentStatus: '/api/payment-status',

        //* Clientes
        client: '/api/clients',

        //* Productos
        product: '/api/products'

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
    this.app.use( this.paths.documents, documentRoutes)
    this.app.use( this.paths.demoOrders, demoOrdersRoutes)
    this.app.use( this.paths.health, healthRoutes)
    this.app.use( this.paths.messages, messageRoutes)
    this.app.use( this.paths.history, orderHistoryRoutes)
    this.app.use( this.paths.productionCalendar, productionCalendarRoutes)
    this.app.use( this.paths.productionCapacity, productionCapacityRoutes)
    this.app.use( this.paths.productionLoad, productionLoadRoutes)
    this.app.use( this.paths.metrics, metricsRoutes)
    this.app.use(this.paths.paymentStatus, paymentStatusRoutes);
    this.app.use(this.paths.orderStatus, orderStatusRoutes);
    this.app.use(this.paths.orderDetail, orderDetailRoutes );

    this.app.use(this.paths.product, productRoutes)

    this.app.use(this.paths.client, clientsRoutes)


  }

  listen() {
    this.app.listen(this.port, () => {
      console.log("Servidor corriendo en puerto", this.port);
    });
  }
}

export default Server;
