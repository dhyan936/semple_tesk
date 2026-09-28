import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, Check, Columns3, Eye, EyeOff, Lock, Users, Zap } from 'lucide-react';
import { AuthError, MIN_PASSWORD } from '../lib/auth';
import { useAuth } from '../store/Auth';
import { useToast } from '../store/Toasts';

type Mode = 'login' | 'register';
type Field = 'name' | 'email' | 'password' | 'form';

const modeFromHash = (): Mode => (location.hash === '#register' ? 'register' : 'login');

/** Sign in or create an account. The mode is mirrored in the URL hash so links and refreshes keep it. */
export function AuthPage() {
  const { login, register } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState<Mode>(modeFromHash);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<{ field: Field; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onHash = () => setMode(modeFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    setError(null);
    firstField.current?.focus();
  }, [mode]);

  const switchMode = (next: Mode) => {
    history.replaceState(null, '', next === 'register' ? '#register' : '#login');
    setMode(next);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === 'register') {
        const user = await register(name, email, password, remember);
        toast(`Welcome to Cadence, ${user.name.split(' ')[0]}`);
      } else {
        const user = await login(email, password, remember);
        toast(`Welcome back, ${user.name.split(' ')[0]}`);
      }
      history.replaceState(null, '', location.pathname);
    } catch (err) {
      const field = err instanceof AuthError ? err.field : 'form';
      const message = err instanceof Error ? err.message : 'Something went wrong. Try again.';
      setError({ field, message });
      setBusy(false);
    }
  };

  /** Editing a field clears its error, and any form-level error. */
  const edit = (f: Field, setter: (v: string) => void) => (v: string) => {
    setter(v);
    if (error && (error.field === f || error.field === 'form')) setError(null);
  };

  const fieldError = (f: Field) => (error?.field === f ? error.message : null);
  const strength = passwordStrength(password);

  return (
    <div className="auth">
      <main className="auth__panel">
        <div className="auth__inner">
          <div className="auth__brand">
            <span className="brand-mark" aria-hidden>
              <svg viewBox="0 0 20 20">
                <path d="M5.5 10.4l3 3 6-6.6" />
              </svg>
            </span>
            <span className="brand-name">Cadence</span>
          </div>

          <h1 className="auth__title">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
          <p className="auth__lead">
            {mode === 'login'
              ? 'Sign in to pick up where you left off.'
              : 'Start organizing your work in under a minute.'}
          </p>

          <div className="auth__tabs" role="tablist" aria-label="Account">
            <button role="tab" aria-selected={mode === 'login'} className="auth__tab" onClick={() => switchMode('login')}>
              Sign in
            </button>
            <button role="tab" aria-selected={mode === 'register'} className="auth__tab" onClick={() => switchMode('register')}>
              Create account
            </button>
          </div>

          <form className="auth__form" onSubmit={submit} noValidate>
            {mode === 'register' && (
              <div className="auth__field">
                <label className="field-label" htmlFor="auth-name">
                  Full name
                </label>
                <input
                  ref={firstField}
                  id="auth-name"
                  className={`input${fieldError('name') ? ' has-error' : ''}`}
                  autoComplete="name"
                  maxLength={40}
                  placeholder="Maya Chen"
                  value={name}
                  aria-invalid={!!fieldError('name')}
                  aria-describedby={fieldError('name') ? 'auth-name-error' : undefined}
                  onChange={(e) => edit('name', setName)(e.target.value)}
                />
                {fieldError('name') && (
                  <p className="field-error" id="auth-name-error">
                    {fieldError('name')}
                  </p>
                )}
              </div>
            )}

            <div className="auth__field">
              <label className="field-label" htmlFor="auth-email">
                Email
              </label>
              <input
                ref={mode === 'login' ? firstField : undefined}
                id="auth-email"
                type="email"
                inputMode="email"
                className={`input${fieldError('email') ? ' has-error' : ''}`}
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                aria-invalid={!!fieldError('email')}
                aria-describedby={fieldError('email') ? 'auth-email-error' : undefined}
                onChange={(e) => edit('email', setEmail)(e.target.value)}
              />
              {fieldError('email') && (
                <p className="field-error" id="auth-email-error">
                  {fieldError('email')}
                  {mode === 'register' && fieldError('email')?.includes('already') && (
                    <>
                      {' '}
                      <button type="button" className="link-btn" onClick={() => switchMode('login')}>
                        Sign in
                      </button>
                    </>
                  )}
                </p>
              )}
            </div>

            <div className="auth__field">
              <label className="field-label" htmlFor="auth-password">
                Password
              </label>
              <div className="password">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`input${fieldError('password') ? ' has-error' : ''}`}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder={mode === 'register' ? `At least ${MIN_PASSWORD} characters` : 'Your password'}
                  value={password}
                  aria-invalid={!!fieldError('password')}
                  aria-describedby={
                    fieldError('password') ? 'auth-password-error' : mode === 'register' ? 'auth-strength' : undefined
                  }
                  onChange={(e) => edit('password', setPassword)(e.target.value)}
                />
                <button
                  type="button"
                  className="password__toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((s) => !s)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldError('password') ? (
                <p className="field-error" id="auth-password-error">
                  {fieldError('password')}
                </p>
              ) : (
                mode === 'register' &&
                password && (
                  <div className="strength" id="auth-strength" data-level={strength.level}>
                    <span className="strength__bars" aria-hidden>
                      <span />
                      <span />
                      <span />
                    </span>
                    <span className="strength__label">{strength.label}</span>
                  </div>
                )
              )}
            </div>

            <label className="remember">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span className="remember__box" aria-hidden>
                <Check size={12} strokeWidth={3} />
              </span>
              Keep me signed in
            </label>

            {error?.field === 'form' && (
              <p className="auth__error" role="alert">
                {error.message}
              </p>
            )}

            <button type="submit" className="btn btn--primary auth__submit" disabled={busy}>
              {busy ? <span className="spinner" aria-hidden /> : null}
              {busy ? (mode === 'login' ? 'Signing in…' : 'Creating account…') : mode === 'login' ? 'Sign in' : 'Create account'}
              {!busy && <ArrowRight size={16} />}
            </button>
          </form>

          <p className="auth__switch">
            {mode === 'login' ? 'New to Cadence?' : 'Already have an account?'}{' '}
            <button type="button" className="link-btn" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </p>

          <p className="auth__note">
            <Lock size={12} aria-hidden />
            Accounts and tasks are stored in this browser only.
          </p>
        </div>
      </main>

      <aside className="auth__showcase" aria-hidden>
        <div className="showcase">
          <p className="showcase__eyebrow">Tasks · Projects · Teams</p>
          <h2 className="showcase__title">
            Plan it.
            <br />
            Do it.
            <br />
            <span>Done.</span>
          </h2>
          <ul className="showcase__points">
            <li>
              <Zap size={16} /> Capture a task in seconds
            </li>
            <li>
              <Columns3 size={16} /> Drag cards across a board
            </li>
            <li>
              <Users size={16} /> Assign work to your team
            </li>
          </ul>
        </div>
        <div className="showcase__cards">
          <div className="mini-card mini-card--a">
            <span className="mini-card__check mini-card__check--high" />
            <span className="mini-card__lines">
              <span />
              <span />
            </span>
            <span className="mini-card__avatar">MC</span>
          </div>
          <div className="mini-card mini-card--b">
            <span className="mini-card__check mini-card__check--done">
              <Check size={10} strokeWidth={3.5} />
            </span>
            <span className="mini-card__lines">
              <span />
              <span />
            </span>
            <span className="mini-card__avatar mini-card__avatar--b">AM</span>
          </div>
          <div className="mini-card mini-card--c">
            <span className="mini-card__check" />
            <span className="mini-card__lines">
              <span />
              <span />
            </span>
            <span className="mini-card__avatar mini-card__avatar--c">PN</span>
          </div>
        </div>
      </aside>
    </div>
  );
}

function passwordStrength(pw: string): { level: 1 | 2 | 3; label: string } {
  if (pw.length < MIN_PASSWORD) return { level: 1, label: `Too short: ${MIN_PASSWORD - pw.length} more ${MIN_PASSWORD - pw.length === 1 ? 'character' : 'characters'}` };
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  if (pw.length >= 12 && variety >= 3) return { level: 3, label: 'Strong password' };
  if (variety >= 2) return { level: 2, label: 'Good password' };
  return { level: 1, label: 'Weak: mix letters, numbers or symbols' };
}
