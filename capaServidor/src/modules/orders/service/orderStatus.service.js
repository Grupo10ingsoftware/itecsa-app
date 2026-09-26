import { AppError } from "../../../errors/AppError.js";

import OrderStatusRepository from "../repo/orderStatus.repo.js";


class OrderStatusService {
    constructor({ repo } = {}) {
        this.repo = repo ?? new OrderStatusRepository();
    }

    async createOrderStatus( data ) {


        const { nombre_etapa, orden_kanban, descripcion_estado} = data;
        console.log(nombre_etapa);
        console.log(orden_kanban);
        console.log( descripcion_estado);

        if (!nombre_etapa || orden_kanban === undefined) {
            const error = new AppError(400, "Faltan datos obligatorios");
            throw error;
        }
        return await this.repo.create( {
            nombre_etapa,
            orden_kanban,
            descripcion_estado
        } )

    }

    async getAll() {
        try {
            const statuses = await this.repo.getAll()
            return statuses || []

        } catch (error) {
            throw error;

        }
    }

    async getById( statusId ) {
        try {
            const status = this.repo.get( statusId );
            if (!status) throw new Error('No se encontró el pedido')

            return status
        } catch (error) {
            throw error;
        }
    }




}

export default OrderStatusService;
