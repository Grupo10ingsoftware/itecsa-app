import { useNavigate } from 'react-router-dom'
import OrderCreateHeader from '../components/OrderCreateHeader'
import OrderCreateConfirmModal from '../components/OrderCreateConfirmModal'
import OrderCreateSuccess from '../components/OrderCreateSuccess'
import OrderNotice from '../components/OrderNotice'
import OrderRequirementSummary from '../components/OrderRequirementSummary'
import SalesNoteStep from '../components/SalesNoteStep'
import { ORDER_CREATE_VIEW_MODE, useOrderCreateFlow } from '../../../hooks/useOrderCreateFlow'
import styles from './OrderCreatePage.module.css'

export default function OrderCreatePage() {
  const navigate = useNavigate()
  const flow = useOrderCreateFlow({ navigate })
  const { actions } = flow

  if (flow.viewMode === ORDER_CREATE_VIEW_MODE.SUCCESS && flow.registeredOrder) {
    return (
      <main className={styles.page}>
        <OrderCreateSuccess
          order={flow.registeredOrder}
          onCreateAnother={actions.resetFlow}
          onGoKanban={actions.goToKanban}
        />
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <section className={styles.dashboardShell}>
        <OrderCreateHeader title="REGISTRAR PEDIDO" />

        <div className={styles.content}>
          <OrderNotice notice={flow.notice} />

          <div className={styles.createGrid}>
            <div className={styles.createMainColumn}>
              <SalesNoteStep
                draft={flow.draft}
                errors={flow.errors}
                isSearching={flow.isSearching}
                onChange={actions.updateDraftField}
                onSearch={actions.handleSearchSalesNote}
              />
            </div>

            <OrderRequirementSummary
              canRegister={flow.salesNoteIsValid}
              draft={flow.draft}
              isSearching={flow.isSearching}
              onRegister={actions.handleOpenConfirmModal}
            />
          </div>
        </div>
      </section>

      {flow.showConfirmModal && (
        <OrderCreateConfirmModal
          draft={flow.draft}
          onCancel={() => actions.setShowConfirmModal(false)}
          onConfirm={actions.handleConfirmRegister}
        />
      )}
    </main>
  )
}
