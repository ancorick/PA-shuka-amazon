import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { post } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Field, Alert, useTitle, StoreIcon, CashIcon, TruckIcon } from '../../components/ui.jsx';

export default function BecomeSeller() {
  useTitle('Sell on Shuka');
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ storeName: '', phone: user?.phone || '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user?.isSeller) return <Navigate to="/seller" replace />;

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (form.storeName.trim().length < 2) errs.storeName = 'Store name must be at least 2 characters.';
    if (!/^\+?[\d\s()-]{6,20}$/.test(form.phone.trim())) errs.phone = 'Enter a phone number like +374 91 123456.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true); setError(null);
    try {
      await post('/seller/activate', { storeName: form.storeName.trim(), phone: form.phone.trim() });
      await refresh();
      toast('Your store is live! Add your first product.');
      navigate('/seller/products/new');
    } catch (err) {
      setErrors(err.fields || {});
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sell-page">
      <section className="sell-hero">
        <div className="container">
          <h1>Become a Shuka seller</h1>
          <p>Reach buyers across Armenia. No fees, no setup — your store is active immediately.</p>
          <div className="sell-perks">
            <div><StoreIcon size={28} /> Your own store name</div>
            <div><TruckIcon size={28} /> You deliver, buyers pay cash</div>
            <div><CashIcon size={28} /> Track revenue and orders</div>
          </div>
        </div>
      </section>
      <div className="container page-pad">
        <form className="card-panel sell-form" onSubmit={submit} noValidate>
          <h2>Set up your store</h2>
          {error && <Alert tone="danger">{error}</Alert>}
          <Field label="Store name" error={errors.storeName} id="store" hint="Buyers see this on every product and order.">
            <input id="store" value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} placeholder="e.g. Vernissage Crafts" autoFocus />
          </Field>
          <Field label="Contact phone" error={errors.phone} id="sphone">
            <input id="sphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+374 91 123456" />
          </Field>
          <button className="btn btn-cart btn-block" disabled={busy}>{busy ? 'Activating…' : 'Start selling'}</button>
        </form>
      </div>
    </div>
  );
}
