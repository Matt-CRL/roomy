import { useState } from 'react'
import { supabase } from '../api/supabase'
import ThemeToggleButton from '../components/layout/ThemeToggleButton'

const DISPLAY_NAME_MAX_LENGTH = 40
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getPasswordChecks(password, confirmPassword) {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
    matching: Boolean(confirmPassword) && password === confirmPassword,
  }
}

export default function AuthPage({ demoMode = false, onDemoSignIn }) {
  const [mode, setMode] = useState('sign-in')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const isSignIn = mode === 'sign-in'
  const passwordChecks = getPasswordChecks(password, confirmPassword)
  const passwordIsValid = Object.entries(passwordChecks)
    .filter(([key]) => key !== 'matching')
    .every(([, isValid]) => isValid)
  const emailIsInvalid = email.length > 0 && !EMAIL_PATTERN.test(email)

  function changeMode(nextMode) {
    setMode(nextMode)
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
      if (!EMAIL_PATTERN.test(email)) {
        throw new Error('Enter a valid email address.')
      }

      if (!isSignIn) {
        if (!displayName.trim()) throw new Error('Enter a display name.')
        if (!passwordIsValid) throw new Error('Choose a password that meets all requirements.')
        if (password !== confirmPassword) throw new Error('Passwords do not match.')
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
            options: { data: { display_name: displayName.trim() } },
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

  function showNotAvailableMessage(label) {
    setError('')
    setMessage(`${label} will be connected in a later update.`)
  }

  function handleGoogleSignIn() {
    if (demoMode) {
      onDemoSignIn?.()
      return
    }

    showNotAvailableMessage('Google sign-in')
  }

  return (
    <main className={`theme-transition min-h-screen text-slate-900 ${isDarkMode ? 'night-mode' : 'bg-slate-50'}`}>
      <ThemeToggleButton isDarkMode={isDarkMode} onToggle={() => setIsDarkMode((current) => !current)} />
      <div className="relative z-[1] grid min-h-screen lg:grid-cols-[1.15fr_0.85fr]">
        <section className={`auth-theme-surface relative isolate hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:px-16 lg:py-14 xl:px-24 ${isDarkMode ? 'bg-[#0c0920]' : 'bg-[#eceae6]'}`}>
          {isDarkMode && (
            <>
              <div aria-hidden="true" className="auth-night-left-lamp-glow" />
              <div aria-hidden="true" className="auth-night-left-gradient" />
            </>
          )}
          <p className="relative z-[1] text-2xl font-bold tracking-tight text-orange-500">Roomy</p>

          <div className="relative z-[1] grid max-w-3xl items-center gap-6 lg:grid-cols-1 xl:grid-cols-[minmax(210px,0.8fr)_minmax(320px,1.2fr)]">
            <img
              src="/roomy-mascot-transparent.png"
              alt="Roomy mascot emerging from a box"
              className="hidden w-full max-w-xs justify-self-start object-contain lg:order-first lg:block"
            />
            <div>
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

        <section className="auth-theme-surface flex min-h-screen items-start justify-center bg-white px-6 py-10 sm:px-10 lg:items-center lg:px-16 lg:py-12">
          <div className="w-full max-w-md">
            <p className="text-3xl font-bold tracking-tight text-orange-500 lg:hidden">Roomy</p>

            <div className="mt-12 lg:mt-0">
              <p className="text-sm font-semibold tracking-wide text-slate-700 lg:hidden">WELCOME HOME</p>
              <h2 className="mt-7 text-4xl font-bold leading-tight tracking-tight text-slate-900 lg:mt-0 lg:text-2xl">
                <span className="lg:hidden">Know what you own—and where it lives.</span>
                <span className="hidden lg:inline">Welcome to Roomy</span>
              </h2>
              <p className="mt-4 max-w-md text-base leading-6 text-slate-600 lg:mt-2 lg:text-sm">
                <span className="lg:hidden">Sign in to manage rooms, inventory, and saved layouts.</span>
                <span className="hidden lg:inline">Sign in to continue, or create a private account.</span>
              </p>

              <div className="mt-8 grid grid-cols-2 overflow-hidden rounded-sm border border-slate-300 lg:mt-7 lg:rounded-none lg:border-x-0 lg:border-t-0">
                <button
                  type="button"
                  onClick={() => changeMode('sign-in')}
                  className={`min-h-12 border-b-2 px-3 text-sm font-semibold transition-colors ${isSignIn ? (isDarkMode ? 'border-orange-500 bg-[#24223a] text-orange-500 lg:bg-transparent' : 'border-orange-500 bg-orange-500 text-white lg:bg-transparent lg:text-orange-500') : 'border-transparent text-slate-500 hover:bg-slate-100'}`}
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={() => changeMode('sign-up')}
                  className={`min-h-12 border-b-2 px-3 text-sm font-semibold transition-colors ${!isSignIn ? (isDarkMode ? 'border-orange-500 bg-[#24223a] text-orange-500 lg:bg-transparent' : 'border-orange-500 bg-orange-500 text-white lg:bg-transparent lg:text-orange-500') : 'border-transparent text-slate-500 hover:bg-slate-100'}`}
                >
                  <span className="lg:hidden">Register</span>
                  <span className="hidden lg:inline">Create account</span>
                </button>
              </div>

              <form onSubmit={submit} className="mt-7 space-y-5">
                {!isSignIn && (
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

                <label className="block text-sm font-semibold text-slate-900">
                  Email
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    aria-invalid={emailIsInvalid}
                    className="auth-form-input mt-2 min-h-12 w-full border border-slate-300 bg-white px-3 text-base font-normal text-slate-900 outline-none placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                  {emailIsInvalid && <span className="mt-1 block text-xs font-normal text-red-600">Enter a valid email address.</span>}
                </label>

                <label className="block text-sm font-semibold text-slate-900">
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
                      className="absolute inset-y-0 right-0 px-3 text-sm font-medium tracking-normal text-slate-600 hover:text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </span>
                  {!isSignIn && isPasswordFocused && (
                    <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-normal text-slate-500" aria-label="Password requirements">
                      {[
                        ['length', 'At least 8 characters'],
                        ['uppercase', 'One uppercase letter'],
                        ['lowercase', 'One lowercase letter'],
                        ['number', 'One number'],
                        ['symbol', 'One symbol'],
                      ].map(([key, label]) => (
                        <li key={key} className={passwordChecks[key] ? 'text-emerald-600' : ''}>
                          <span aria-hidden="true" className="mr-1">{passwordChecks[key] ? '✓' : '○'}</span>
                          {label}
                        </li>
                      ))}
                    </ul>
                  )}
                </label>

                {!isSignIn && (
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

                {isSignIn && (
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
                    <button type="button" onClick={() => showNotAvailableMessage('Password recovery')} className="text-right hover:text-orange-500 hover:underline">
                      Forgot password?
                    </button>
                  </div>
                )}

                {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
                {message && <p role="status" className="text-sm text-slate-600">{message}</p>}

                <button
                  type="submit"
                  disabled={busy}
                  className="min-h-12 w-full rounded-sm bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? 'Please wait…' : isSignIn ? 'Log in' : 'Create account'}
                </button>
              </form>

              <div className="my-6 flex items-center gap-3 text-xs text-slate-500">
                <span className="h-px flex-1 bg-slate-300" />
                <span>OR</span>
                <span className="h-px flex-1 bg-slate-300" />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="min-h-12 w-full rounded-sm border border-slate-900 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:border-orange-500 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
              >
                Continue with Google
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
