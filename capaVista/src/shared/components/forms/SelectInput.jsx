export default function SelectInput({
  id,
  name,
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  className = '',
  required = false,
  error,
}) {
  return (
    <label className={className} htmlFor={id}>
      <span className="form-label">{label}</span>
      <select
        className={`form-select ${error ? 'is-invalid' : ''}`}
        disabled={disabled}
        id={id}
        name={name}
        onChange={onChange}
        value={value}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span id={`${id}-error`} className="invalid-feedback d-block">{error}</span>}
    </label>
  )
}
