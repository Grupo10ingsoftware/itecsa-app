import { response, request } from "express";
import { PAYMENT_CONFIRMATION_REQUIRED_MESSAGE } from "../../../config/status.js";
import OrderStatusService from "../service/orderStatus.service.js";
import { sendControllerError } from "../../../shared/httpResponse.js";

class OrderStatusController {

    constructor() {
        this.service = new OrderStatusService()
    }


    getOrderStatuses = async ( req = request, res = response ) => {
        try {
            const statuses = await this.service.getAll()
            res.status( 200 ).json( statuses )
        } catch( error  ){
            return sendControllerError(req, res, error, "Error al obtener estados");
        }
    }


    postOrderStatus = async ( req = request, res = response) => {
        try {
            const { nombre_etapa, orden_kanban, descripcion_estado } = req.body ?? {};

            const result = await
            this.service.createOrderStatus(
                {
                    nombre_etapa,
                    orden_kanban,
                    descripcion_estado
                }
            )
            if ( !result ) return res.status( 500 ).json({
                message:'Error al crear pedido'
            })

            res.status( 200 ).json( result );

        } catch ( error ) {
            return sendControllerError(req, res, error, "Error al crear estado");
        }
    }


}

export default OrderStatusController;
