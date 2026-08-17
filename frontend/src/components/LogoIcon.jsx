/**
 * LostCards — Logo officiel (flame-700 + L blanc + dot signal-600).
 * Usage : <LogoIcon size={28} />
 */
export default function LogoIcon({ size = 26, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      aria-label="LostCards logo"
    >
      <rect width="100" height="100" rx="23" fill="#B4400A" />
      <rect x="28" y="20" width="14" height="58" rx="4" fill="#FFFFFF" />
      <rect x="28" y="65" width="50" height="14" rx="4" fill="#FFFFFF" />
      <circle cx="72" cy="18" r="12" fill="#0B7A4B" stroke="#FFFFFF" strokeWidth="4" />
    </svg>
  )
}
