import PaymentStatusRepo from "../repo/paymentStatus.repo.js";


class PaymentStatusService {

    constructor() {
        this.repo = new PaymentStatusRepo()
    }

    async createPaymentStatus( data ) {
        try {
            const { nombre_estado_pago, descripcion_estado_pago } = data;
            if ( !nombre_estado_pago || !descripcion_estado_pago) {
                const error = new Error("Faltan datos obligatorios");
                error.statusCode = 400;
                throw error;
            }

            return await this.repo.create({
                nombre_estado_pago,
                descripcion_estado_pago
            })
        } catch (error) {
            throw new Error("Error al crear estado de pago - Capa Servicio");
        }
    }

    async getPaymentStatus( id ) {
        const paymentStatus = await  this.repo.get( id );
        if (!paymentStatus) throw new Error('No se encontró el estado de pago solicitado')
        return paymentStatus
    }

}

export default PaymentStatusService;