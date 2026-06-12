import { response, request } from "express";
import { PAYMENT_CONFIRMATION_REQUIRED_MESSAGE } from "../../../config/status.js";
import OrderStatusService from "../service/orderStatus.service.js";

class OrderStatusController {

    constructor() {
        this.service = new OrderStatusService()
    }


    getOrderStatuses = async ( req = request, res = response ) => {
        try {
            const statuses = await this.service.getAll()
            res.status( 200 ).json( statuses )
        } catch( err  ){
            res.status( 500 ).json({ message:'Error al obtener estados' })
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
            console.log( error )
        }
    }


}

export default OrderStatusController;