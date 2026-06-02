export function createKanbanApi(apiClient) {
  return {
    
    async getOrders() {
        console.log('Llamando a getOrders')
        console.log('apiClient:', apiClient)  // ✓ Verifica que existe
        try {
            console.log('Antes de await')
            const result = await apiClient.get('/orders')
            console.log('Resultado de apiClient.get:', result)
            return result
        } catch (error) {
            console.error('Error completo:', error)
            throw error
        }
    },
    async moveOrder(orderId, generalStepId) {
        console.log('Cambiando estado');
        
      return  await apiClient.request(`/orders/${orderId}/move`, {
        method: 'PATCH',
        body: {
          generalStepId,
        },
      })
    },
  }
}
