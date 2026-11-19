import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Field, Alert, useTitle, BoxIcon, StoreIcon, UserIcon } from '../components/ui.jsx';

export default function Account() {
  useTitle('Your Account');
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: user.name, phone: user.phone });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function save(e) {
    e.preventDefault();
    setBusy(true); setError(null); setErrors({});
    try {
      await updateProfile({ name: form.name, phone: form.phone });
      toast('Profile saved');
    } catch (err) {
      setErrors(err.fields || {});
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container page-pad account-page">
      <h1>Your Account</h1>
      <div className="account-tiles">
        <Link to="/orders" className="account-tile"><BoxIcon size={36} /><div><strong>Your Orders</strong><div className="small muted">Track, cancel or review</div></div></Link>
        <Link to={user.isSeller ? '/seller' : '/sell'} className="account-tile"><StoreIcon size={36} /><div><strong>{user.isSeller ? 'Seller dashboard' : 'Sell on Shuka'}</strong><div className="small muted">{user.isSeller ? user.storeName : 'Open your store in a minute'}</div></div></Link>
        <div className="account-tile static"><UserIcon size={36} /><div><strong>Login &amp; profile</strong><div className="small muted">{user.email}</div></div></div>
      </div>
      <form className="card-panel profile-form" onSubmit={save} noValidate>
        <h2>Login &amp; profile</h2>
        {error && <Alert tone="danger">{error}</Alert>}
        <Field label="Email" id="em" hint="Email cannot be changed."><input id="em" value={user.email} disabled /></Field>
        <Field label="Name" error={errors.name} id="name"><input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Phone" error={errors.phone} id="phone"><input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <button className="btn btn-cart" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
      </form>
    </div>
  );
}
