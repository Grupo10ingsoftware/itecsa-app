import express from 'express';
import cors from 'cors';

class Server {
  constructor() {
    // Creamos como propiedad misma de la clase servidor
    this.app = express();
    this.port = process.env.PORT; // definido en .env
    this.paths = {
        // Rutas cuando las tengamos
        }

    // Middlewares
    this.middlewares();
    // rutas de mi aplicacion
    this.routes();
  }



  // aca mismo podemos tener una función asincrona para conectar a la base de datos cuando este disponible
  middlewares() {
      
    // Cors
    this.app.use(cors({ origin: process.env.FRONTEND_ORIGIN }));

    // Parseo y lectura del Body - Recibir datos

    this.app.use( express.json() );

    // Directorio publico
    this.app.use(express.static("public"));

    
  }

  routes() {
    // Configurar rutas
    /**
     * Un ejemplo sería    
     * this.app.use(this.paths.users, user_route);

     * Esto se definira cuando tengamos nuestros rutas definidas para cada API
     */
  }

  listen() {
    this.app.listen(this.port, () => {
      console.log("Servidor corriendo en puerto", this.port);
    });
  }
}

export default Server;
