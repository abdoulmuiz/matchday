import { useState } from 'react'

const Input = ({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  disabled = false,
  required = false,
  style: customStyle,
  ...props
}) => {
  const [focused, setFocused] = useState(false)

  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label className="field-label">
          {label}
          {required && <span style={{ color: 'var(--accent-lime)', marginLeft: 4 }}>*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        style={{
          borderColor: error
            ? 'var(--error-red)'
            : focused
              ? 'var(--accent-lime)'
              : undefined,
          boxShadow: focused && !error ? '0 0 0 3px var(--accent-lime-soft)' : undefined,
          ...customStyle,
        }}
        onFocus={(e) => {
          setFocused(true)
          props.onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          props.onBlur?.(e)
        }}
        {...props}
      />
      {error && <p className="error" style={{ marginTop: 8 }}>{error}</p>}
    </div>
  )
}

export default Input
