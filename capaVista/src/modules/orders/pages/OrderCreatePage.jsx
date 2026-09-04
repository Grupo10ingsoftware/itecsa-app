import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import OrderCreateHeader from '../components/OrderCreateHeader'
import OrderCreateConfirmModal from '../components/OrderCreateConfirmModal'
import OrderCreateSuccess from '../components/OrderCreateSuccess'
import OrderNotice from '../components/OrderNotice'
import SalesNoteStep from '../components/SalesNoteStep'
import { ORDER_CREATE_VIEW_MODE, useOrderCreateFlow } from '../../../hooks/useOrderCreateFlow'
import styles from './OrderCreatePage.module.css'

export default function OrderCreatePage() {
  const navigate = useNavigate()
  const { auth0User, user } = useAuth()
  const flow = useOrderCreateFlow({ navigate })
  const { actions } = flow
  const responsibleUserName = [
    user?.nombreUsuario,
    user?.apellidoUsuario,
  ].filter(Boolean).join(' ')
    || user?.correoUsuario
    || user?.email
    || auth0User?.name
    || auth0User?.email
    || 'Usuario no identificado'

  if (flow.viewMode === ORDER_CREATE_VIEW_MODE.SUCCESS && flow.registeredOrder) {
    return (
      <main className={styles.page}>
        <OrderCreateSuccess
          onCreateAnother={actions.resetFlow}
          onGoKanban={actions.goToKanban}
        />
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <section className={styles.dashboardShell}>
        <OrderCreateHeader />

        <div className={styles.content}>
          <OrderNotice notice={flow.notice} />

          <SalesNoteStep
            draft={flow.draft}
            errors={flow.errors}
            isSearching={flow.isSearching}
            onChange={actions.updateDraftField}
            onPriorityChange={actions.updatePriority}
            onSearch={actions.handleSearchSalesNote}
            responsibleUserName={responsibleUserName}
          />

          <div className={styles.footerActions}>
            <button
              className={styles.registerButton}
              disabled={!flow.salesNoteIsValid || flow.isRegistering}
              onClick={actions.handleOpenConfirmModal}
              type="button"
            >
              <i className="bi bi-plus-circle" aria-hidden="true" />
              {flow.isRegistering ? 'Registrando...' : 'Registrar pedido'}
            </button>
          </div>
        </div>
      </section>

      {flow.showConfirmModal && (
        <OrderCreateConfirmModal
          draft={flow.draft}
          isRegistering={flow.isRegistering}
          onCancel={() => actions.setShowConfirmModal(false)}
          onConfirm={actions.handleConfirmRegister}
        />
      )}
    </main>
  )
}
