import {
  getBySalesNoteNumberOperation,
  existsBySalesNoteNumberOperation,
  getAllOrdersOperation,
  getPaymentOrdersOperation,
  getPaymentOrderOperation,
  getOperation,
  getTransitionStateOperation,
  getProductSubprocessesOperation,
} from './orderReadOperations.js';
import { lockPaymentOrderOperation, updatePaymentStatusOperation } from './orderPaymentOperations.js';
import {
  recordCreationOperation,
  createOperation,
  addLabelsOperation,
  createUntrackedItemsOperation,
  updateOperation,
  setOrderLabelOperation,
  updateDeliveryDateOperation,
} from './orderWriteOperations.js';
import {
  transitionGeneralStageOperation,
  updateGeneralStepOperation,
  sendToReviewOperation,
  cancelProductionOperation,
} from './orderStageOperations.js';
import { reevaluateFromSalesNoteOperation } from './orderSalesNoteOperations.js';
import {
  notifyProductionAdministratorsOperation,
  notifyCollectionsAdministratorsOperation,
  notifyAdministratorsByRoleOperation,
  notifyOrderReadyOperation,
} from './orderNotificationOperations.js';
import { lockProductionOrderOperation, completeSubprocessOperation, rollbackSubprocessOperation } from './orderSubprocessOperations.js';
import getPrismaClient from '../../../database/prisma.js';
import { listOrderViewsOperation, getOrderViewOperation, listPaymentViewsOperation } from './orderViewOperations.js';

// Keep the public repository API and the injected transaction client in one place.
// Operation modules receive this repository so cross-operation calls use that same client.
class OrderRepository {
  constructor({ prisma } = {}) {
    this.prisma = prisma;
  }

  get client() {
    if (!this.prisma) {
      this.prisma = getPrismaClient();
    }

    return this.prisma;
  }

  async getBySalesNoteNumber(...args) {
    return getBySalesNoteNumberOperation(this, ...args);
  }

  async existsBySalesNoteNumber(...args) {
    return existsBySalesNoteNumberOperation(this, ...args);
  }

  async getAllOrders(...args) {
    return getAllOrdersOperation(this, ...args);
  }

  async listOrderViews(...args) {
    return listOrderViewsOperation(this, ...args);
  }

  async getOrderView(...args) {
    return getOrderViewOperation(this, ...args);
  }

  async listPaymentViews(...args) {
    return listPaymentViewsOperation(this, ...args);
  }

  async getPaymentOrders(...args) {
    return getPaymentOrdersOperation(this, ...args);
  }

  async getPaymentOrder(...args) {
    return getPaymentOrderOperation(this, ...args);
  }

  async lockPaymentOrder(...args) {
    return lockPaymentOrderOperation(this, ...args);
  }

  async get(...args) {
    return getOperation(this, ...args);
  }

  async getTransitionState(...args) {
    return getTransitionStateOperation(this, ...args);
  }

  async recordCreation(...args) {
    return recordCreationOperation(this, ...args);
  }

  async create(...args) {
    return createOperation(this, ...args);
  }

  async addLabels(...args) {
    return addLabelsOperation(this, ...args);
  }

  async createUntrackedItems(...args) {
    return createUntrackedItemsOperation(this, ...args);
  }

  async getProductSubprocesses(...args) {
    return getProductSubprocessesOperation(this, ...args);
  }

  async update(...args) {
    return updateOperation(this, ...args);
  }

  async transitionGeneralStage(...args) {
    return transitionGeneralStageOperation(this, ...args);
  }

  async setOrderLabel(...args) {
    return setOrderLabelOperation(this, ...args);
  }

  async updateGeneralStep(...args) {
    return updateGeneralStepOperation(this, ...args);
  }

  async sendToReview(...args) {
    return sendToReviewOperation(this, ...args);
  }

  async cancelProduction(...args) {
    return cancelProductionOperation(this, ...args);
  }

  async reevaluateFromSalesNote(...args) {
    return reevaluateFromSalesNoteOperation(this, ...args);
  }

  async updateDeliveryDate(...args) {
    return updateDeliveryDateOperation(this, ...args);
  }

  async updatePaymentStatus(...args) {
    return updatePaymentStatusOperation(this, ...args);
  }

  async notifyProductionAdministrators(...args) {
    return notifyProductionAdministratorsOperation(this, ...args);
  }

  async notifyCollectionsAdministrators(...args) {
    return notifyCollectionsAdministratorsOperation(this, ...args);
  }

  async notifyAdministratorsByRole(...args) {
    return notifyAdministratorsByRoleOperation(this, ...args);
  }

  async notifyOrderReady(...args) {
    return notifyOrderReadyOperation(this, ...args);
  }

  // Se invoca dentro de la transacción del servicio, antes de leer los detalles.
  // Serializa cierres y retrocesos del mismo pedido sin bloquear otros pedidos.
  async lockProductionOrder(...args) {
    return lockProductionOrderOperation(this, ...args);
  }

  async completeSubprocess(...args) {
    return completeSubprocessOperation(this, ...args);
  }

  async rollbackSubprocess(...args) {
    return rollbackSubprocessOperation(this, ...args);
  }
}

export default OrderRepository;
