import { ORDER_FLOW_STEPS } from '../mocks/orderCreate.mock'
import styles from './OrderCreateStepper.module.css'


export default function OrderCreateStepper({ currentStep }) { 
  return (
    <nav aria-label="Progreso del registro de pedido" className={styles.stepper}>
      {ORDER_FLOW_STEPS.map((step) => {
        const isActive = step.id === currentStep
        const isCompleted = step.id < currentStep
        const itemClassName = [
          styles.stepItem,
          isActive ? styles.active : '',
          isCompleted ? styles.completed : '',
        ].filter(Boolean).join(' ')

        return (
          <div className={itemClassName} key={step.id} aria-current={isActive ? 'step' : undefined}>
            <span className={styles.stepNumber}>
              {isCompleted ? <i className="bi bi-check-lg" aria-hidden="true" /> : step.id}
            </span>
            <p className={styles.stepTitle}>{step.title}</p>
          </div>
        )
      })}
    </nav>
  )
}