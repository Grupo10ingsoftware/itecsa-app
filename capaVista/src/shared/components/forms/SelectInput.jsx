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
}) {
  return (
    <label className={className} htmlFor={id}>
      <span className="form-label">{label}</span>
      <select
        className="form-select"
        disabled={disabled}
        id={id}
        name={name}
        onChange={onChange}
        value={value}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
