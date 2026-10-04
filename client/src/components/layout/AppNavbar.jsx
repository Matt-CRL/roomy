import { useEffect, useRef, useState } from 'react'
import Button from '../common/Button'
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
  location = [],
}) {
  const displayLabel = String(displayName || 'User').trim() || 'User'
  const menuRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [nameDraft, setNameDraft] = useState(displayLabel)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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
      className="app-navbar-surface relative mx-auto mb-6 flex min-h-16 w-full max-w-none items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm sm:px-5"
    >
      <img
        src={lightLogo}
        alt="Roomy"
        className={`app-navbar-logo-light relative z-10 h-8 w-auto shrink-0 object-contain sm:h-10 ${location.length ? 'max-w-[32vw]' : 'max-w-[42vw]'} sm:max-w-none`}
      />
      <img
        src={darkLogo}
        alt="Roomy"
        className={`app-navbar-logo-dark relative z-10 h-8 w-auto shrink-0 object-contain sm:h-10 ${location.length ? 'max-w-[32vw]' : 'max-w-[42vw]'} sm:max-w-none`}
      />

      {location.length > 0 && (
        <div className="relative z-10 mx-1 flex min-w-0 flex-1 items-center justify-center gap-1.5 sm:mx-3 sm:gap-2">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0 text-orange-500 sm:h-5 sm:w-5">
            <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          <nav aria-label="Current location" className="flex min-w-0 items-center gap-1 overflow-hidden text-xs sm:gap-1.5 sm:text-sm">
            {location.map((part, index) => (
              <span key={`${part.label}-${index}`} className="inline-flex min-w-0 items-center gap-1 sm:gap-1.5">
                {index > 0 && <span aria-hidden="true" className="shrink-0 text-slate-400">/</span>}
                {part.onClick ? (
                  <button type="button" onClick={part.onClick} className="max-w-[18vw] truncate whitespace-nowrap font-medium text-slate-500 transition-colors hover:text-orange-500 sm:max-w-[180px]">
                    {part.label}
                  </button>
                ) : (
                  <span aria-current={index === location.length - 1 ? 'page' : undefined} className="max-w-[22vw] truncate whitespace-nowrap font-semibold text-orange-500 sm:max-w-[220px]">
                    {part.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        </div>
      )}

      <div ref={menuRef} className="relative z-10 flex min-w-0 items-center gap-1.5 sm:gap-2">
        {onSignOut && (
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-md bg-orange-500 px-2.5 text-xs font-semibold text-white transition-colors hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 sm:px-3"
          >
            Sign out
          </button>
        )}
        <button
          type="button"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label={`Open user menu for ${displayLabel}`}
          title={displayLabel}
          onClick={openMenu}
          className="app-navbar-user-button inline-flex min-h-9 min-w-0 max-w-[30vw] items-center justify-center truncate whitespace-nowrap rounded-md border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 sm:max-w-48 sm:px-3"
        >
          {displayLabel}
        </button>

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
              className="account-menu-surface fixed left-1/2 top-1/2 z-[80] max-h-[calc(100vh-2rem)] w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto border border-slate-300 bg-white p-5 text-slate-900 shadow-2xl"
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
                <input
                  type="password"
                  value={newPassword}
                  autoComplete="new-password"
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="night-form-control mt-2 min-h-10 w-full border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </label>
              <label className="mt-3 block text-xs font-semibold text-slate-900">
                Confirm password
                <input
                  type="password"
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
