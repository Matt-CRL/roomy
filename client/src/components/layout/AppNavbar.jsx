import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Button from '../common/Button'
import CompactThemeButton from './CompactThemeButton'
import LocationTrail from './LocationTrail'
import lightLogo from '../../assets/light-logo.png'
import darkLogo from '../../assets/dark-logo.png'

const DISPLAY_NAME_MAX_LENGTH = 40

function isStrongPassword(password) {
  return password.length >= 8
    && /[A-Z]/.test(password)
    && /[a-z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9\s]/.test(password)
}

export default function AppNavbar({
  onSignOut,
  displayName = 'User',
  email = '',
  onUpdateDisplayName,
  onChangePassword,
  onDeleteAccount,
  isDarkMode = false,
  onToggleTheme,
  compactTheme = false,
  location = [],
}) {
  const displayLabel = String(displayName || 'User').trim() || 'User'
  const menuRef = useRef(null)
  const userButtonRef = useRef(null)
  const profileMeasureRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [useProfileInitial, setUseProfileInitial] = useState(false)
  const [nameDraft, setNameDraft] = useState(displayLabel)
  const [newPassword, setNewPassword] = useState('')

  useLayoutEffect(() => {
    const button = userButtonRef.current
    const measure = profileMeasureRef.current
    if (!button || !measure) return undefined

    function updateProfileLabel() {
      const available = Number.parseFloat(window.getComputedStyle(button).maxWidth)
      const textWidth = measure.getBoundingClientRect().width
      const shouldUseInitial = Number.isFinite(available) && textWidth + 18 > available
      setUseProfileInitial((current) => current === shouldUseInitial ? current : shouldUseInitial)
    }

    const observer = new ResizeObserver(updateProfileLabel)
    observer.observe(button)
    observer.observe(measure)
    updateProfileLabel()
    return () => observer.disconnect()
  }, [displayLabel])
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busyAction, setBusyAction] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false)

  useEffect(() => setNameDraft(displayLabel), [displayLabel])

  useEffect(() => {
    function handleOutsidePointer(event) {
      if (event.target?.closest?.('[data-theme-toggle]')) return
      if (!menuRef.current?.contains(event.target)) setIsOpen(false)
    }

    function handleEscape(event) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('pointerdown', handleOutsidePointer)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointer)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  function openMenu() {
    setIsOpen((open) => !open)
    setShowPassword(false)
    setStatus('')
    setError('')
    setIsDeleteConfirming(false)
  }

  async function saveDisplayName(event) {
    event.preventDefault()
    const nextName = nameDraft.trim()
    if (!nextName) {
      setError('Enter a display name.')
      return
    }

    setBusyAction('name')
    setError('')
    setStatus('')
    try {
      await onUpdateDisplayName?.(nextName)
      setNameDraft(nextName)
      setStatus('Display name updated.')
    } catch (cause) {
      setError(cause.message || 'Could not update the display name.')
    } finally {
      setBusyAction('')
    }
  }

  async function savePassword(event) {
    event.preventDefault()
    if (!isStrongPassword(newPassword)) {
      setError('Use at least 8 characters with uppercase, lowercase, a number, and a symbol.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setBusyAction('password')
    setError('')
    setStatus('')
    try {
      await onChangePassword?.(newPassword)
      setNewPassword('')
      setConfirmPassword('')
      setShowPassword(false)
      setStatus('Password updated.')
    } catch (cause) {
      setError(cause.message || 'Could not update the password.')
    } finally {
      setBusyAction('')
    }
  }

  async function deleteAccount() {
    setBusyAction('delete')
    setError('')
    try {
      await onDeleteAccount?.()
    } catch (cause) {
      setError(cause.message || 'Could not delete the account.')
      setBusyAction('')
    }
  }

  return (
    <nav
      aria-label="Main navigation"
      data-main-navbar
      className="app-navbar-surface relative mx-auto mb-4 flex min-h-16 w-full max-w-none flex-wrap items-center justify-between gap-1 rounded-xl border border-slate-200 bg-white px-2 py-2 shadow-sm sm:mb-6 sm:gap-3 sm:rounded-2xl sm:px-5"
    >
      <img
        src={lightLogo}
        alt="Roomy"
        className="app-navbar-logo-light relative z-10 order-1 h-7 w-auto max-w-[30vw] shrink-0 object-contain sm:h-10 sm:max-w-none"
      />
      <img
        src={darkLogo}
        alt="Roomy"
        className="app-navbar-logo-dark relative z-10 order-1 h-7 w-auto max-w-[30vw] shrink-0 object-contain sm:h-10 sm:max-w-none"
      />

      {location.length > 0 && (
        <LocationTrail location={location} className="relative z-10 order-3 hidden min-w-0 pt-1 md:order-2 md:mx-3 md:flex md:flex-1 md:justify-center md:pt-0" />
      )}

      <div ref={menuRef} data-navbar-actions className="relative z-10 order-2 flex min-w-0 shrink-0 items-center gap-1 sm:gap-2 md:order-3">
        {onToggleTheme && compactTheme && (
          <CompactThemeButton
            isDarkMode={isDarkMode}
            onToggle={onToggleTheme}
            className="shrink-0"
          />
        )}
        <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              aria-label="Sign out"
              className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center gap-1.5 rounded-md bg-orange-500 px-2 text-xs font-semibold text-white transition-colors hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 sm:min-w-0 sm:px-3"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 sm:hidden"><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></svg>
              <span className="hidden sm:inline">Sign out</span>
            </button>
          )}
          <button
            type="button"
            aria-expanded={isOpen}
            aria-haspopup="dialog"
            aria-label={`Open user menu for ${displayLabel}`}
            title={displayLabel}
            onClick={openMenu}
            ref={userButtonRef}
            className="app-navbar-user-button relative inline-flex min-h-10 min-w-10 max-w-[21vw] items-center justify-center truncate whitespace-nowrap rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 sm:min-w-0 sm:max-w-48 sm:px-3"
          >
            <span aria-hidden="true">{useProfileInitial ? Array.from(displayLabel)[0]?.toLocaleUpperCase() : displayLabel}</span>
            <span ref={profileMeasureRef} aria-hidden="true" className="pointer-events-none absolute -z-10 whitespace-nowrap opacity-0">
              {displayLabel}
            </span>
          </button>
        </div>

        {isOpen && (
          <>
            <div
              aria-hidden="true"
              className="fixed inset-0 z-[79] bg-slate-950/60"
              onClick={() => setIsOpen(false)}
            />
            <section
              role="dialog"
              aria-modal="true"
              aria-label="Account settings"
              className="account-menu-surface fixed left-1/2 top-1/2 z-[80] max-h-[calc(100dvh-1.5rem)] w-[min(30rem,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto border border-slate-300 bg-white p-4 text-slate-900 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:p-5"
            >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Account settings</h2>
                <p className="mt-1 break-all text-xs text-slate-600">{email || 'Email unavailable'}</p>
              </div>
              <button
                type="button"
                aria-label="Close account settings"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg leading-none text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                ×
              </button>
            </div>

            <form onSubmit={saveDisplayName} className="mt-5 border-t border-slate-200 pt-4">
              <label className="block text-xs font-semibold text-slate-900">
                Display name
                <input
                  type="text"
                  value={nameDraft}
                  maxLength={DISPLAY_NAME_MAX_LENGTH}
                  onChange={(event) => setNameDraft(event.target.value)}
                  className="night-form-control mt-2 min-h-10 w-full border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
                <span className="mt-1 block text-right text-[11px] font-normal text-slate-500" aria-live="polite">
                  {nameDraft.length}/{DISPLAY_NAME_MAX_LENGTH}
                </span>
              </label>
              <div className="mt-3 flex justify-start">
                <button
                  type="submit"
                  disabled={busyAction !== ''}
                  className="min-h-9 rounded-sm bg-orange-500 px-3 text-xs font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busyAction === 'name' ? 'Saving…' : 'Save display name'}
                </button>
              </div>
            </form>

            <form onSubmit={savePassword} className="mt-5 border-t border-slate-200 pt-4">
              <h3 className="text-sm font-semibold text-slate-900">Change password</h3>
              <p className="mt-1 text-xs leading-5 text-slate-600">At least 8 characters with at least one uppercase, one lowercase, one number, and one symbol (!, @, #, $, %, etc.).</p>
              <label className="mt-3 block text-xs font-semibold text-slate-900">
                New password
                <span className="relative mt-2 block">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    autoComplete="new-password"
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="night-form-control min-h-10 w-full border border-slate-300 bg-white px-3 pr-16 text-sm font-normal text-slate-900 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password and confirmation' : 'Show password and confirmation'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="auth-password-toggle absolute inset-y-0 right-0 px-3 text-sm font-medium text-slate-600 hover:text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </span>
              </label>
              <label className="mt-3 block text-xs font-semibold text-slate-900">
                Confirm password
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  autoComplete="new-password"
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="night-form-control mt-2 min-h-10 w-full border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </label>
              <div className="mt-3 flex justify-start">
                <button
                  type="submit"
                  disabled={busyAction !== ''}
                  className="min-h-9 rounded-sm border border-slate-900 bg-white px-3 text-xs font-semibold text-slate-900 transition-colors hover:border-orange-500 hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busyAction === 'password' ? 'Updating…' : 'Update password'}
                </button>
              </div>
            </form>

            <div className="mt-5 border-t border-slate-200 pt-4">
              <h3 className="text-sm font-semibold text-slate-900">Delete account</h3>
              <p className="mt-1 text-xs leading-5 text-slate-600">Permanently removes your rooms, items, photos, and saved layouts.</p>
              {!isDeleteConfirming ? (
                <div className="mt-3 flex justify-start">
                  <button
                    type="button"
                    onClick={() => setIsDeleteConfirming(true)}
                    disabled={busyAction !== ''}
                    className="account-delete-trigger flex min-h-9 items-center justify-center rounded-sm px-3 text-xs font-semibold text-red-600 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:bg-slate-100 focus-visible:text-slate-700 focus-visible:outline-none active:bg-slate-200 active:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Delete account
                  </button>
                </div>
              ) : (
                <div className="account-delete-confirmation mt-3 border border-red-300 bg-red-50 p-3">
                  <p className="text-xs font-semibold text-red-700">This cannot be undone. Delete everything?</p>
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsDeleteConfirming(false)}
                      disabled={busyAction !== ''}
                      className="account-delete-cancel min-h-9 rounded-sm border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <Button
                      variant="danger"
                      type="button"
                      onClick={deleteAccount}
                      disabled={busyAction !== ''}
                    >
                      {busyAction === 'delete' ? 'Deleting…' : 'Delete permanently'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {(status || error) && (
              <p role={error ? 'alert' : 'status'} className={`mt-4 border-t border-slate-200 pt-3 text-xs ${error ? 'text-red-600' : 'text-emerald-600'}`}>
                {error || status}
              </p>
            )}
            </section>
          </>
        )}
      </div>
    </nav>
  )
}
