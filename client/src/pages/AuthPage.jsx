import { useEffect, useRef, useState } from 'react'
import { supabase } from '../api/supabase'
import { toPublicPath } from '../utils/appBasePath'
import CompactThemeButton from '../components/layout/CompactThemeButton'
import ThemeToggleButton from '../components/layout/ThemeToggleButton'
import ImageCursorTrail from '../components/effects/ImageCursorTrail'
import { authPageTitle } from '../utils/pageTitle'
import useThemeControlMode from '../hooks/useThemeControlMode'
import darkLogo from '../assets/dark-logo.png'
import lightLogo from '../assets/light-logo.png'

const DISPLAY_NAME_MAX_LENGTH = 40
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getPasswordChecks(password, confirmPassword) {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9\s]/.test(password),
    matching: Boolean(confirmPassword) && password === confirmPassword,
  }
}

function getInitialAuthError() {
  const query = new URLSearchParams(window.location.search)
  return query.has('error') || query.has('error_code')
    ? 'That password reset link is invalid or has expired. Request a new one.'
    : ''
}

function AuthLogo({ className = '' }) {
  const imageClassName = 'h-8 w-auto max-w-[42vw] object-contain sm:h-10'

  return (
    <div className={className}>
      <img src={lightLogo} alt="Roomy" className={`app-navbar-logo-light ${imageClassName}`} />
      <img src={darkLogo} alt="Roomy" className={`app-navbar-logo-dark ${imageClassName}`} />
    </div>
  )
}

export default function AuthPage({ demoMode = false, onDemoSignIn, isDarkMode: savedDarkMode, onToggleTheme, passwordRecovery = false, onPasswordRecoveryComplete }) {
  const { compact: compactTheme } = useThemeControlMode(`auth:${passwordRecovery}`)
  const authLeftPanelRef = useRef(null)
  const [mode, setMode] = useState(passwordRecovery ? 'update-password' : 'sign-in')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [localIsDarkMode, setLocalIsDarkMode] = useState(false)
  const [busy, setBusy] = useState(false)
  const [passwordUpdated, setPasswordUpdated] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(getInitialAuthError)

  const isSignIn = mode === 'sign-in'
  const isSignUp = mode === 'sign-up'
  const isPasswordResetRequest = mode === 'forgot-password'
  const isUpdatingPassword = mode === 'update-password'
  const isDarkMode = savedDarkMode ?? localIsDarkMode
  const passwordChecks = getPasswordChecks(password, confirmPassword)
  const passwordIsValid = Object.entries(passwordChecks)
    .filter(([key]) => key !== 'matching')
    .every(([, isValid]) => isValid)
  const emailIsInvalid = email.length > 0 && !EMAIL_PATTERN.test(email)
  const formHeading = passwordUpdated
    ? 'Password updated'
    : isUpdatingPassword
      ? 'Choose a new password'
      : isPasswordResetRequest
        ? 'Reset your password'
        : isSignIn ? 'Welcome to Roomy' : 'Create your account'
  const formDescription = passwordUpdated
    ? 'Your new password is ready to use.'
    : isUpdatingPassword
      ? 'Choose a new password for your Roomy account.'
      : isPasswordResetRequest
        ? 'Enter your account email and we will send a password reset link.'
        : isSignIn
          ? 'Sign in to manage rooms, inventory, and saved layouts.'
          : 'Create a private account to organize your rooms and belongings.'

  useEffect(() => {
    if (passwordRecovery) {
      setMode('update-password')
      setPasswordUpdated(false)
    }
  }, [passwordRecovery])

  useEffect(() => {
    document.title = authPageTitle(mode, passwordUpdated)
  }, [mode, passwordUpdated])

  function changeMode(nextMode) {
    setMode(nextMode)
    setPasswordUpdated(false)
    setError('')
    setMessage('')
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')

    try {
      if (!isUpdatingPassword && !EMAIL_PATTERN.test(email)) {
        throw new Error('Enter a valid email address.')
      }

      if (isSignUp) {
        if (!displayName.trim()) throw new Error('Enter a display name.')
      }
      if (isSignUp || isUpdatingPassword) {
        if (!passwordIsValid) throw new Error('Choose a password that meets all requirements.')
        if (password !== confirmPassword) throw new Error('Passwords do not match.')
      }

      if (isPasswordResetRequest) {
        if (!supabase) throw new Error('Password recovery is unavailable in demo mode.')
        const redirectTo = new URL(toPublicPath('/login?flow=recovery'), window.location.origin).toString()
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
        if (resetError) throw resetError
        setMessage('If an account exists for that email, you will receive a password reset link shortly.')
        return
      }

      if (isUpdatingPassword) {
        if (!supabase) throw new Error('Password recovery is unavailable in demo mode.')
        const { error: updateError } = await supabase.auth.updateUser({ password })
        if (updateError) throw updateError
        setPassword('')
        setConfirmPassword('')
        setPasswordUpdated(true)
        setMessage('Your password has been updated. Continue to open Roomy.')
        return
      }

      if (demoMode) {
        onDemoSignIn?.(isSignIn ? undefined : displayName.trim())
        return
      }

      const result = isSignIn
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName.trim(), roomy_theme: isDarkMode ? 'dark' : 'light' } },
        })

      if (result.error) throw result.error

      if (!isSignIn && !result.data.session) {
        setMessage('Check your email to confirm your account, then sign in.')
      }
    } catch (cause) {
      setError(cause.message || 'Authentication failed')
    } finally {
      setBusy(false)
    }
  }

  function toggleTheme() {
    if (onToggleTheme) {
      onToggleTheme()
      return
    }
    setLocalIsDarkMode((current) => !current)
  }

  function handleAuthCursorMove(event) {
    if (!isDarkMode || event.pointerType === 'touch') return

    const panel = event.currentTarget
    const bounds = panel.getBoundingClientRect()
    panel.style.setProperty('--auth-cursor-glow-x', `${event.clientX - bounds.left}px`)
    panel.style.setProperty('--auth-cursor-glow-y', `${event.clientY - bounds.top}px`)
    panel.style.setProperty('--auth-cursor-glow-opacity', '1')
  }

  function handleAuthCursorLeave(event) {
    event.currentTarget.style.setProperty('--auth-cursor-glow-opacity', '0')
  }

  return (
    <main className={`theme-transition isolate min-h-screen text-slate-900 ${isDarkMode ? 'night-mode' : 'bg-slate-50'}`}>
      <ThemeToggleButton isDarkMode={isDarkMode} onToggle={toggleTheme} isCompact={compactTheme} />
      {compactTheme && (
        <CompactThemeButton
          isDarkMode={isDarkMode}
          onToggle={toggleTheme}
          className="fixed right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.75rem,env(safe-area-inset-top))] z-[90]"
        />
      )}
      <div className="relative z-[1] grid min-h-screen lg:grid-cols-[1.15fr_0.85fr]">
        <section
          ref={authLeftPanelRef}
          onPointerMove={isDarkMode ? handleAuthCursorMove : undefined}
          onPointerLeave={isDarkMode ? handleAuthCursorLeave : undefined}
          className={`auth-theme-surface relative isolate hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:px-16 lg:py-14 xl:px-24 ${isDarkMode ? 'auth-night-left-cursor-glow bg-[#0c0920]' : 'bg-[#f7f8fa]'}`}
        >
          {!isDarkMode && <ImageCursorTrail scopeRef={authLeftPanelRef} />}
          {isDarkMode && (
            <>
              <div aria-hidden="true" className="auth-night-left-lamp-glow" />
              <div aria-hidden="true" className="auth-night-left-gradient" />
            </>
          )}
          <AuthLogo className="relative z-[1]" />

          <div className="relative z-[1] grid max-w-3xl items-center gap-3 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] xl:grid-cols-[minmax(210px,1.1fr)_minmax(320px,1fr)] xl:gap-4">
            <img
              src="/roomy-mascot-transparent.png"
              alt="Roomy mascot emerging from a box"
              className="hidden w-full max-w-sm min-w-0 justify-self-start object-contain lg:order-first lg:block"
            />
            <div className="min-w-0">
              <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-slate-900 xl:text-5xl">
                Know what you own—and where it lives.
              </h1>
              <p className="mt-6 max-w-md text-base leading-7 text-slate-600">
                Keep a personal room inventory and arrange larger items on a simple top-down planner.
              </p>
            </div>
          </div>

          <div className="relative z-[1] grid w-full max-w-xl grid-cols-3 gap-8 self-center">
            {[
              ['01', 'Organize items by room'],
              ['02', 'See storage contents'],
              ['03', 'Plan approximate layouts'],
            ].map(([number, label]) => (
              <div key={number}>
                <div className="mb-3 h-px bg-slate-700" />
                <p className="text-[10px] font-bold tracking-wide text-slate-900">{number}</p>
                <p className="mt-1 text-[10px] leading-4 text-slate-600">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="auth-theme-surface auth-login-panel flex min-h-[100dvh] items-start justify-center bg-white px-4 py-8 sm:px-10 sm:py-10 lg:items-center lg:px-16 lg:py-12">
          <div className="w-full max-w-md">
            <AuthLogo className="lg:hidden" />

            <div className="mt-10 lg:mt-0">
              <p className="text-sm font-semibold tracking-wide text-slate-700 lg:hidden">WELCOME HOME</p>
              <h2 className="mt-7 text-4xl font-bold leading-tight tracking-tight text-slate-900 lg:mt-0 lg:text-2xl">
                <span className="lg:hidden">{isSignIn || isSignUp ? 'Know what you own—and where it lives.' : formHeading}</span>
                <span className="hidden lg:inline">{isSignIn || isSignUp ? 'Welcome to Roomy' : formHeading}</span>
              </h2>
              <p className="mt-4 max-w-md text-base leading-6 text-slate-600 lg:mt-2 lg:text-sm">
                <span className="lg:hidden">{formDescription}</span>
                <span className="hidden lg:inline">{formDescription}</span>
              </p>

              {!isPasswordResetRequest && !isUpdatingPassword && !passwordUpdated && <div role="tablist" aria-label="Account access" className="auth-mode-switch relative isolate mt-8 grid grid-cols-2 overflow-hidden lg:mt-7">
                <span aria-hidden="true" className={`auth-mode-indicator ${isSignIn ? '' : 'auth-mode-indicator-signup'}`} />
                <button
                  type="button"
                  role="tab"
                  aria-selected={isSignIn}
                  onClick={() => changeMode('sign-in')}
                  className={`auth-mode-tab min-h-12 px-3 text-sm font-semibold ${isSignIn ? 'auth-mode-tab-active' : ''}`}
                >
                  Log in
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={!isSignIn}
                  onClick={() => changeMode('sign-up')}
                  className={`auth-mode-tab min-h-12 px-3 text-sm font-semibold ${!isSignIn ? 'auth-mode-tab-active' : ''}`}
                >
                  <span className="lg:hidden">Register</span>
                  <span className="hidden lg:inline">Create account</span>
                </button>
              </div>}

              <form onSubmit={submit} className="mt-7 space-y-5">
                {!passwordUpdated && isSignUp && (
                  <label className="block text-sm font-semibold text-slate-900">
                    Display name
                    <input
                      required
                      maxLength={DISPLAY_NAME_MAX_LENGTH}
                      type="text"
                      autoComplete="name"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      className="auth-form-input mt-2 min-h-12 w-full border border-slate-300 bg-white px-3 text-base font-normal text-slate-900 outline-none placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    />
                    <span className="mt-1 block text-xs font-normal text-slate-500">
                      {displayName.length}/{DISPLAY_NAME_MAX_LENGTH}
                    </span>
                  </label>
                )}

                {!passwordUpdated && !isUpdatingPassword && (
                  <label className="block text-sm font-semibold text-slate-900">
                    Email
                    <input
                      required
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="roomy@example.com"
                      aria-invalid={emailIsInvalid}
                      className="auth-form-input mt-2 min-h-12 w-full border border-slate-300 bg-white px-3 text-base font-normal text-slate-900 outline-none placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    />
                    {emailIsInvalid && <span className="mt-1 block text-xs font-normal text-red-600">Enter a valid email address.</span>}
                  </label>
                )}

                {!passwordUpdated && !isPasswordResetRequest && <label className="block text-sm font-semibold text-slate-900">
                  Password
                  <span className="relative mt-2 block">
                    <input
                      required
                      minLength={isSignIn ? 1 : 8}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={isSignIn ? 'current-password' : 'new-password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      onFocus={() => setIsPasswordFocused(true)}
                      onBlur={() => setIsPasswordFocused(false)}
                      className="auth-form-input min-h-12 w-full border border-slate-300 bg-white px-3 pr-16 text-base font-normal tracking-[0.18em] text-slate-900 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      className="auth-password-toggle absolute inset-y-0 right-0 px-3 text-sm font-medium tracking-normal text-slate-600 hover:text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </span>
                  {!isSignIn && isPasswordFocused && (
                    <>
                      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-normal text-slate-500" aria-label="Password requirements">
                        {[
                          ['length', 'At least 8 characters'],
                          ['uppercase', 'At least one uppercase letter'],
                          ['lowercase', 'At least one lowercase letter'],
                          ['number', 'At least one number'],
                          ['symbol', 'At least one symbol (!, @, #, $, %, etc.)'],
                        ].map(([key, label]) => (
                          <li key={key} className={passwordChecks[key] ? 'text-emerald-600' : ''}>
                            <span aria-hidden="true" className="mr-1">{passwordChecks[key] ? '✓' : '○'}</span>
                            {label}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </label>}

                {!passwordUpdated && (isSignUp || isUpdatingPassword) && (
                  <label className="block text-sm font-semibold text-slate-900">
                    Confirm password
                    <input
                      required
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      aria-invalid={Boolean(confirmPassword) && !passwordChecks.matching}
                      className="auth-form-input mt-2 min-h-12 w-full border border-slate-300 bg-white px-3 text-base font-normal tracking-[0.18em] text-slate-900 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    />
                    {confirmPassword && (
                      <span className={`mt-1 block text-xs font-normal ${passwordChecks.matching ? 'text-emerald-600' : 'text-red-600'}`}>
                        {passwordChecks.matching ? 'Passwords match.' : 'Passwords do not match.'}
                      </span>
                    )}
                  </label>
                )}

                {!passwordUpdated && isSignIn && (
                  <div className="flex items-center justify-between gap-4 text-sm text-slate-600">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(event) => setRememberMe(event.target.checked)}
                        className="h-4 w-4 accent-slate-900"
                      />
                      Remember me
                    </label>
                    <button type="button" onClick={() => changeMode('forgot-password')} className="text-right hover:text-orange-500 hover:underline">
                      Forgot password?
                    </button>
                  </div>
                )}

                {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
                {message && <p role="status" className="text-sm text-slate-600">{message}</p>}

                {!passwordUpdated ? (
                  <div className={isSignIn ? undefined : 'pt-2'}>
                    <button
                      type="submit"
                      disabled={busy}
                      className="min-h-12 w-full rounded-sm bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busy ? 'Please wait…' : isPasswordResetRequest ? 'Send reset link' : isUpdatingPassword ? 'Update password' : isSignIn ? 'Log in' : 'Create account'}
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={onPasswordRecoveryComplete} className="min-h-12 w-full rounded-sm bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600">
                    Continue to Roomy
                  </button>
                )}
              </form>

              {(isPasswordResetRequest || isUpdatingPassword) && !passwordUpdated && (
                <button
                  type="button"
                  onClick={() => isUpdatingPassword ? onPasswordRecoveryComplete?.() : changeMode('sign-in')}
                  className="mt-4 w-full text-center text-sm font-medium text-slate-600 hover:text-orange-500 hover:underline"
                >
                  Back to log in
                </button>
              )}

            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
