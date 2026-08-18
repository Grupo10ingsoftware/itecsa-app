import { useNavigate } from 'react-router-dom'
import OrderCreateHeader from '../components/OrderCreateHeader'
import OrderCreateStepper from '../components/OrderCreateStepper'
import OrderCreateConfirmModal from '../components/OrderCreateConfirmModal'
import OrderCreateSuccess from '../components/OrderCreateSuccess'
import OrderNotice from '../components/OrderNotice'
import OrderRequirementSummary from '../components/OrderRequirementSummary'
import SalesNoteStep from '../components/SalesNoteStep'
import DesignFilesStep from '../components/DesignFilesStep'
import OrderReviewStep from '../components/OrderReviewStep'
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
          registeredOrder={flow.registeredOrder}
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

          <div className={styles.createGrid}>
            <div className={styles.createMainColumn}>
              <OrderCreateStepper currentStep={flow.currentStep} />

              {flow.currentStep === 1 && (
                <SalesNoteStep
                  draft={flow.draft}
                  errors={flow.errors}
                  onChange={actions.updateDraftField}
                  onSearch={actions.handleSearchSalesNote}
                />
              )}

              {flow.currentStep === 2 && (
                <DesignFilesStep
                  draft={flow.draft}
                  error={flow.designFileError}
                  onFileRemove={actions.handleRemoveDesignFile}
                  onFileReplace={actions.handleReplaceDesignFile}
                  onFilesAdd={actions.handleAddDesignFiles}
                />
              )}

              {flow.currentStep === 3 && (
                <OrderReviewStep
                  draft={flow.draft}
                  onCommentsChange={(value) => actions.updateDraftField('comments', value)}
                />
              )}
            </div>

            <OrderRequirementSummary
              canContinue={flow.salesNoteIsValid}
              currentStep={flow.currentStep}
              draft={flow.draft}
              onBack={actions.goBackOneStep}
              onContinue={actions.continueFromCurrentStep}
            />
          </div>
        </div>
      </section>

      {flow.showConfirmModal && (
        <OrderCreateConfirmModal
          draft={flow.draft}
          isSubmitting={flow.isSubmitting}
          onCancel={() => actions.setShowConfirmModal(false)}
          onConfirm={actions.handleConfirmRegister}
        />
      )}
    </main>
  )
}
