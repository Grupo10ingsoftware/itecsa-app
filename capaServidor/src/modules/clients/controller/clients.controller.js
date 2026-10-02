import { respondError } from "../../../errors/httpErrors.js";
import { AppError } from "../../../errors/AppError.js";
import { response, request } from "express";

import ClientService from "../service/clients.service.js";
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

            if( !result ) return respondError(new Error(), req, res)
            res.status( 200 ).json( result );
        } catch (error) {
            return respondError(error, req, res);
        }
    }

    getClient = async ( req = request, res = response ) => {
        try {
            const id_cliente = req.params.id_cliente ?? req.params.clientId;
            if (!id_cliente) {
                return respondError(new AppError(400, "El ID del cliente es obligatorio"), req, res);
            }
            const result = await
            this.service.getClient(  id_cliente  );
            res.status( 200 ).json( result )
        } catch (error) {
            return respondError(error, req, res);
        }
    }

    getClientByRut = async (req = request, res = response) => {
        try {
            const { rutCliente } = req.params;

            const client = await this.service.getClientByRut( rutCliente );

            res.status( 200 ).json( client );
        } catch ( error ) {
            return respondError(error, req, res);
        }
    };

}

export default ClientController;
