import { response, request } from "express";

import PaymentStatusService from "../service/paymentStatus.service.js";
import { sendPaymentError } from "./paymentError.js";


class PaymentStatusController {
    constructor() {
        this.service = new PaymentStatusService();
    }

    getPaymentStatus = async ( req = request, res = response ) => {
        try {
            const id_estado_pago = req.params.id_estado_pago ?? req.params.id;
            if (!id_estado_pago) return res.status( 400 ).json({msg:'Missing ID'});
            const result = await
            this.service.getPaymentStatus( id_estado_pago );
            if ( !result ) return res.status( 404 ).json({msg:'Estado no encontrado'})
            res.status( 200 ).json( result )
        } catch (error) {
            return sendPaymentError(res, error, undefined, { requestId: req.requestId, actorId: req.currentUser?.idUsuario });
        }
    }

    getPaymentStatuses = async ( req = request, res = response ) => {
        try {
            const result = await this.service.getPaymentStatuses();

            res.status(200).json(result);
        } catch (error) {
            return sendPaymentError(res, error, undefined, { requestId: req.requestId, actorId: req.currentUser?.idUsuario });
        }
    }



}

export default PaymentStatusController;
