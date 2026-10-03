import express from 'express';
import cors from 'cors';
import { requestContext, errorHandler } from './errors/httpErrors.js';
import { resolveEnvironmentConfig } from './config/environment.js';

import { createAuthRouter } from './modules/auth/routes/auth.routes.js';
import adminUsersRoutes from './modules/users/routes/adminUsers.routes.js';
import demoOrdersRoutes from './modules/demoOrders/routes/demoOrders.routes.js';
import healthRoutes from './modules/health/routes/health.routes.js';
import { createInternalHealthRouter } from './modules/health/routes/health.routes.js';
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
import { notFoundHandler } from './middlewares/errorHandler.js';
import { currentAppEnvironment, parseTrustedProxy } from './config/environment.js';
import { safeLogger } from './shared/safeLogger.js';
import supportAudit from './middlewares/supportAudit.js';
import { createPrivacyRouter } from './modules/privacy/routes/privacy.routes.js';
import PrivacyController from './modules/privacy/controller/privacy.controller.js';
import PrivacyRequestService from './modules/privacy/service/privacyRequest.service.js';
import { createIncidentReportRouter } from './modules/security/routes/incidentReport.routes.js';
import IncidentReportController from './modules/security/controller/incidentReport.controller.js';
import IncidentReportService from './modules/security/service/incidentReport.service.js';
class Server {
  constructor({ env = process.env, appEnvironment = currentAppEnvironment(), logger = safeLogger } = {}) {
    // Creamos como propiedad misma de la clase servidor
    this.app = express();
    this.port = env.PORT; // definido en .env
    this.appEnvironment = appEnvironment;
    this.logger = logger;
    this.app.locals.errorLogger = logger;
    this.env = env;
    this.environment = resolveEnvironmentConfig(env);
    this.paths = {
        // Rutas cuando las tengamos

        //* orders
        auth : '/api/auth',
        orders : '/api/orders',
        orderDetail: '/api/order-details',
        admin: '/api/admin',
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

    this.app.set('trust proxy', parseTrustedProxy(this.env.TRUST_PROXY));
    this.app.disable('x-powered-by');
    this.app.use(requestContext);
    this.app.use((_req, res, next) => {
      res.set('X-Content-Type-Options', 'nosniff');
      res.set('Referrer-Policy', 'no-referrer');
      next();
    });
    this.app.use(supportAudit);

    // Cors
    this.app.use(cors( {origin : this.env.FRONTEND_ORIGIN}));

    // Parseo y lectura del Body - Recibir datos

    this.app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '100kb' }));

    // Directorio publico
    this.app.use(express.static("public"));



  }

  routes() {

    this.app.use('/api/security/incident-reports', createIncidentReportRouter({ controller: new IncidentReportController({ service: new IncidentReportService({ env: this.env, logger: this.logger }) }) }));

    this.app.use('/api/privacy', createPrivacyRouter({ controller: new PrivacyController({ service: new PrivacyRequestService({ env: this.env }) }) }));

    // Configurar rutas
    this.app.use(this.paths.orders, orderRoutes)
    this.app.use(
      this.paths.auth,
      createAuthRouter({
        includeDebugRoutes: this.environment.demoFeaturesEnabled && this.appEnvironment !== "production",
      }),
    )
    this.app.use( this.paths.admin, adminUsersRoutes)
    if (this.environment.demoFeaturesEnabled && this.appEnvironment !== "production") {
      this.app.use(this.paths.demoOrders, demoOrdersRoutes)
    }
    this.app.use( this.paths.health, healthRoutes)
    this.app.use('/internal', createInternalHealthRouter({ logger: this.logger }))
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

    this.app.use(notFoundHandler)
    this.app.use(errorHandler)


  }

  listen() {
    const httpServer = this.app.listen(this.port, () => {
      this.logger.info("server.started", { outcome: "ok" });
    });
    httpServer.requestTimeout = Number(process.env.HTTP_REQUEST_TIMEOUT_MS ?? 15000);
    httpServer.headersTimeout = Number(process.env.HTTP_HEADERS_TIMEOUT_MS ?? 10000);
    httpServer.keepAliveTimeout = Number(process.env.HTTP_KEEP_ALIVE_TIMEOUT_MS ?? 5000);
    return httpServer;
  }
}

export default Server;
