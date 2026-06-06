import styles from '../pages/UserManagementPage.module.css'

const VARIANT_CLASS = Object.freeze({
  primary: styles.userButtonPrimary,
  secondary: styles.userButtonSecondary,
  danger: styles.userButtonDanger,
  ghost: styles.userButtonGhost,
})

export default function UserButton({
  children,
  className = '',
  icon,
  type = 'button',
  variant = 'secondary',
  ...props
}) {
  const variantClass = VARIANT_CLASS[variant] ?? VARIANT_CLASS.secondary

  return (
    <button className={`${styles.userButton} ${variantClass} ${className}`.trim()} type={type} {...props}>
      {icon && <i className={`bi ${icon}`} aria-hidden="true" />}
      <span>{children}</span>
    </button>
  )
}
