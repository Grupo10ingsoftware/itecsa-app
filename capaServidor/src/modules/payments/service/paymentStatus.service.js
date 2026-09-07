import PaymentStatusRepo from "../repo/paymentStatus.repo.js";

class PaymentStatusService {
    constructor({ repo } = {}) {
        this.repo = repo ?? new PaymentStatusRepo();
    }

    async getPaymentStatus(id) {
        const paymentStatus = await this.repo.get(id);

        if (!paymentStatus) {
            const error = new Error("No se encontro el estado de pago solicitado");
            error.statusCode = 404;
            throw error;
        }

        return paymentStatus;
    }

    async getPaymentStatuses() {
        return this.repo.getAll();
    }
}

export default PaymentStatusService;
