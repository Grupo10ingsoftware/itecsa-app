export default function TextInput({
  label,
  name,
  value,
  onChange,
  type = 'text',
  placeholder,
  disabled = false,
  error,
  id,
  readOnly = false,
  required = false,
  maxLength,
  describedBy,
  autoComplete,
}) {
  const handleChange = (e) => {
    if (readOnly) return
    onChange(e)
  }

  return (
    <div className="mb-3">
      {label && (
        <label htmlFor={id || name} className="form-label text-secondary">
          {label}
        </label>
      )}
      <input
        id={id || name}
        name={name}
        type={type}
        className={`form-control ${error ? 'is-invalid' : ''}`}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        maxLength={maxLength}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={[describedBy, error ? `${id || name}-error` : null].filter(Boolean).join(' ') || undefined}
      />
      {error && <div id={`${id || name}-error`} className="invalid-feedback d-block">{error}</div>}
    </div>
  )
}
