const baseStyles = [
  'inline-flex min-h-11 items-center justify-center gap-2',
  'rounded-sm px-4 py-2.5',
  'text-sm font-semibold',
  'transition-colors duration-150',
  'focus-visible:outline-none',
  'focus-visible:ring-2 focus-visible:ring-orange-500',
  'focus-visible:ring-offset-2',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ')

const variantStyles = {
  primary: [
    'bg-orange-500 text-white',
    'hover:bg-orange-600',
    'active:bg-orange-700',
  ].join(' '),

  secondary: [
    'border border-slate-900 bg-transparent text-slate-900',
    'hover:bg-slate-100',
    'active:bg-slate-200',
  ].join(' '),

  tertiary: [
    'text-slate-700',
    'hover:bg-slate-100',
    'active:bg-slate-200',
  ].join(' '),

  danger: [
    'border border-red-600 bg-red-600 text-white',
    'hover:bg-red-700',
    'active:bg-red-800',
  ].join(' '),
}

export default function Button({
  children,
  variant = 'primary',
  type = 'button',
  className = '',
  ...props
}) {
  const styles = variantStyles[variant] ?? variantStyles.primary

  return (
    <button
      type={type}
      className={`${baseStyles} ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
