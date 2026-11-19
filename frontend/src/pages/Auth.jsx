import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { Logo, Field, Alert, useTitle } from '../components/ui.jsx';

const safeNext = (n) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/');

const DEMO = [
  ['Seller', 'seller1@shuka.am'],
  ['Seller', 'seller2@shuka.am'],
  ['Buyer', 'buyer1@shuka.am'],
  ['Buyer', 'buyer2@shuka.am'],
];

export function Login() {
  useTitle('Sign in');
  const { user, login } = useAuth();
  const { refresh } = useCart();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={next} replace />;

  async function submit(e) {
    e.preventDefault();
    if (!email || !password) { setError('Enter your email and password.'); return; }
    setBusy(true); setError(null);
    try {
      await login(email.trim(), password);
      await refresh().catch(() => {});
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <Link to="/" className="auth-logo"><Logo light={false} /></Link>
      <form className="auth-box" onSubmit={submit} noValidate>
        <h1>Sign in</h1>
        {error && <Alert tone="danger" title="There was a problem">{error}</Alert>}
        <Field label="Email" id="email">
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </Field>
        <Field label="Password" id="password">
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <button className="btn btn-cart btn-block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="small muted">No email confirmation needed — any made-up address works.</p>
      </form>
      <div className="auth-divider"><span>New to Shuka?</span></div>
      <Link to={`/register${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`} className="btn btn-secondary auth-wide">Create your Shuka account</Link>

      <div className="demo-box">
        <div className="strong">Demo accounts</div>
        <div className="small muted">Password for all: <code>shuka123</code></div>
        <div className="demo-list">
          {DEMO.map(([role, mail]) => (
            <button key={mail} type="button" className="demo-chip" onClick={() => { setEmail(mail); setPassword('shuka123'); }}>
              <span className="muted">{role}</span> {mail}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Register() {
  useTitle('Create account');
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', password2: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={next} replace />;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (form.name.trim().length < 2) errs.name = 'Enter your first and last name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = 'Enter an email like name@example.com.';
    if (!/^\+?[\d\s()-]{6,20}$/.test(form.phone.trim())) errs.phone = 'Enter a phone number like +374 91 123456.';
    if (form.password.length < 6) errs.password = 'Passwords must be at least 6 characters.';
    if (form.password !== form.password2) errs.password2 = 'Passwords must match.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true); setError(null);
    try {
      await register({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), password: form.password });
      navigate(next, { replace: true });
    } catch (err) {
      setErrors(err.fields || {});
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <Link to="/" className="auth-logo"><Logo light={false} /></Link>
      <form className="auth-box" onSubmit={submit} noValidate>
        <h1>Create account</h1>
        {error && <Alert tone="danger">{error}</Alert>}
        <Field label="Your name" error={errors.name} id="name">
          <input id="name" autoComplete="name" placeholder="First and last name" value={form.name} onChange={set('name')} autoFocus />
        </Field>
        <Field label="Email" error={errors.email} id="email" hint="Any address works — we never send emails.">
          <input id="email" type="email" autoComplete="email" value={form.email} onChange={set('email')} placeholder="you@example.com" />
        </Field>
        <Field label="Mobile number" error={errors.phone} id="phone">
          <input id="phone" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} placeholder="+374 91 123456" />
        </Field>
        <Field label="Password" error={errors.password} id="password" hint="At least 6 characters.">
          <input id="password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} />
        </Field>
        <Field label="Re-enter password" error={errors.password2} id="password2">
          <input id="password2" type="password" autoComplete="new-password" value={form.password2} onChange={set('password2')} />
        </Field>
        <button className="btn btn-cart btn-block" disabled={busy}>{busy ? 'Creating account…' : 'Create your Shuka account'}</button>
        <p className="small">Already have an account? <Link to={`/login${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`}>Sign in ›</Link></p>
      </form>
    </div>
  );
}
