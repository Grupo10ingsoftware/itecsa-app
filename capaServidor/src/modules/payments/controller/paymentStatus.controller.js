import { response, request } from "express";

import PaymentStatusService from "../service/paymentStatus.service.js";


class PaymentStatusController {
    constructor() {
        this.service = new PaymentStatusService();
    }

    postPaymentStatus = async( req = request, res = response ) => {
        try {
            const { nombre_estado_pago, descripcion_estado_pago } = req.body ?? {}
            const result = await
            this.service.createPaymentStatus({
                nombre_estado_pago,
                descripcion_estado_pago
            })

            if ( !result ) return res.status( 500 ).json({
                message:'Error al crear estado de pago - controlador'
            })

            res.status( 200 ).json( result );
        } catch (error) {
            const statusCode = error.statusCode ?? 500;
            res.status(statusCode).json({
            message: error.message || 'Error al crear estado de pago'
            });
        }
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
            const statusCode = error.statusCode ?? 500;
            res.status( statusCode ).json({ message: error.message})
        }
    }

    getPaymentStatuses = async ( req = request, res = response ) => {
        try {
            const result = await this.service.getPaymentStatuses();

            res.status(200).json(result);
        } catch (error) {
            const statusCode = error.statusCode ?? 500;
            res.status(statusCode).json({
                message: error.message || "Error al obtener estados de pago",
            });
        }
    }



}

export default PaymentStatusController;
