import { respondError } from "../../../errors/httpErrors.js";
import { response, request } from "express";
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
            return respondError(err, req, res);
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
            if ( !result ) return respondError(new Error(), req, res)

            res.status( 200 ).json( result );

        } catch ( error ) {
            return respondError(error, req, res);
        }
    }


}

export default OrderStatusController;
