import { response, request } from "express";

import ClientService from "../service/clients.service.js";
import { sendControllerError } from "../../../shared/httpResponse.js";
/**
 *
 *  = async ( req = request, res = response ) => {}
 */

class ClientController {
    constructor() {
        this.service = new ClientService;
    }

    postClient = async ( req = request, res = response ) => {
        try {
            const {
                rut_cliente,
                nombre_cliente,
                razon_social,
                estado_cliente
            } = req.body ?? {};

            const result = await
            this.service.createClient({
                rut_cliente,
                nombre_cliente,
                razon_social,
                estado_cliente
            })

            if( !result ) return res.status( 500 ).json({
                message:'Error al crear cliente - controlador'
            })
            res.status( 200 ).json( result );
        } catch (error) {
            return sendControllerError(req, res, error, "Error al crear cliente");
        }
    }

    getClient = async ( req = request, res = response ) => {
        try {
            const id_cliente = req.params.id_cliente ?? req.params.clientId;
            if (!id_cliente) return res.status( 400 ).json({msg:'Missing ID'});
            const result = await
            this.service.getClient(  id_cliente  );
            if ( !result ) return res.status( 404 ).json({msg:'Cliente no encontrado'})
            res.status( 200 ).json( result )
        } catch (error) {
            return sendControllerError(req, res, error, "Error al obtener cliente");
        }
    }

    getClientByRut = async (req = request, res = response) => {
        try {
            const { rutCliente } = req.params;

            const client = await this.service.getClientByRut( rutCliente );

            res.status( 200 ).json( client );
        } catch ( error ) {
            return sendControllerError(req, res, error, "Error al buscar cliente por RUT");
        }
    };

}

export default ClientController;
