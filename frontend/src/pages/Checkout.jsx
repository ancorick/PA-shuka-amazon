import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { post } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { amd, REGIONS } from '../format.js';
import { Field, Alert, useTitle, EmptyState, CashIcon, Spinner } from '../components/ui.jsx';

const newKey = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export default function Checkout() {
  useTitle('Checkout');
  const { user, refresh: refreshMe } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();
  const last = user?.lastAddress;

  // The last address is pre-filled next time.
  const [form, setForm] = useState(() => ({
    recipient: last?.recipient || user?.name || '',
    phone: last?.phone || user?.phone || '',
    region: last?.region || 'Yerevan',
    city: last?.city || (last ? '' : 'Yerevan'),
    street: last?.street || '',
    apartment: last?.apartment || '',
    note: '',
  }));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [priceChanges, setPriceChanges] = useState(null);
  const [placing, setPlacing] = useState(false);
  // One random request key per checkout visit — a double click or retry can never create two orders.
  const requestKey = useRef(newKey());
  const lock = useRef(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const groups = cart.cart.groups;
  const itemsCount = useMemo(() => groups.reduce((s, g) => s + g.items.reduce((a, i) => a + i.quantity, 0), 0), [groups]);

  function validate() {
    const e = {};
    if (form.recipient.trim().length < 2) e.recipient = 'Enter the recipient\'s full name.';
    if (!/^\+?[\d\s()-]{6,20}$/.test(form.phone.trim())) e.phone = 'Enter a phone number like +374 91 123456.';
    if (!REGIONS.includes(form.region)) e.region = 'Choose a region.';
    if (form.city.trim().length < 2) e.city = 'Enter a city or village.';
    if (form.street.trim().length < 2) e.street = 'Enter the street and building.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function placeOrder(ev) {
    ev.preventDefault();
    if (lock.current) return; // locks after one click
    if (!validate()) return;
    lock.current = true;
    setPlacing(true);
    setFormError(null);
    setPriceChanges(null);
    try {
      const res = await post('/orders', { ...form, requestKey: requestKey.current });
      await Promise.all([cart.refresh(), refreshMe()]);
      navigate(`/orders/${res.order.id}/confirmation`, { replace: true });
    } catch (e) {
      lock.current = false;
      setPlacing(false);
      if (e.code === 'PRICE_CHANGED') {
        setPriceChanges(e.data.items);
        await cart.refresh();
      } else if (e.code === 'OUT_OF_STOCK' || e.code === 'UNAVAILABLE') {
        setFormError(e.message);
        await cart.refresh();
      } else {
        setErrors(e.fields || {});
        setFormError(e.message);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  if (cart.loading && groups.length === 0) return <div className="container page-pad"><Spinner /></div>;
  if (groups.length === 0) {
    return (
      <div className="container page-pad"><div className="card-panel">
        <EmptyState title="Your cart is empty" action={<Link to="/" className="btn btn-cart">Continue shopping</Link>}>Add something to your cart first.</EmptyState>
      </div></div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-top"><div className="container"><h1>Checkout <span className="muted">({itemsCount} item{itemsCount === 1 ? '' : 's'})</span></h1></div></div>
      <form className="container checkout-layout" onSubmit={placeOrder} noValidate>
        <div className="checkout-steps">
          {priceChanges && (
            <Alert tone="warn" title="Prices changed — please review">
              <ul className="plain">
                {priceChanges.map((p) => <li key={p.productId}>“{p.title}”: <s>{amd(p.oldPrice)}</s> → <strong>{amd(p.newPrice)}</strong></li>)}
              </ul>
              Your order was not placed. The total below now uses the new prices — press <strong>Place your order</strong> again to confirm.
            </Alert>
          )}
          {formError && <Alert tone="danger">{formError} {cart.cart.hasProblems && <Link to="/cart">Review your cart →</Link>}</Alert>}

          <section className="step">
            <h2><span className="step-num">1</span> Delivery address</h2>
            <div className="form-grid">
              <Field label="Recipient full name" error={errors.recipient} id="recipient">
                <input id="recipient" value={form.recipient} onChange={set('recipient')} autoComplete="name" />
              </Field>
              <Field label="Phone number" error={errors.phone} id="phone" hint="The seller will call this number before delivery.">
                <input id="phone" value={form.phone} onChange={set('phone')} autoComplete="tel" inputMode="tel" placeholder="+374 91 123456" />
              </Field>
              <Field label="Region" error={errors.region} id="region">
                <select id="region" value={form.region} onChange={set('region')}>
                  {REGIONS.map((r) => <option key={r} value={r}>{r === 'Yerevan' ? 'Yerevan' : `${r} marz`}</option>)}
                </select>
              </Field>
              <Field label="City or village" error={errors.city} id="city">
                <input id="city" value={form.city} onChange={set('city')} autoComplete="address-level2" />
              </Field>
              <Field label="Street and building" error={errors.street} id="street">
                <input id="street" value={form.street} onChange={set('street')} autoComplete="address-line1" placeholder="Abovyan St 12" />
              </Field>
              <Field label="Apartment (optional)" error={errors.apartment} id="apartment">
                <input id="apartment" value={form.apartment} onChange={set('apartment')} autoComplete="address-line2" />
              </Field>
              <Field label="Note for delivery (optional)" error={errors.note} id="note">
                <textarea id="note" rows={2} value={form.note} onChange={set('note')} maxLength={500} placeholder="Entrance code, best time to call…" />
              </Field>
            </div>
            {last && <div className="small muted">Pre-filled with the address from your last order.</div>}
          </section>

          <section className="step">
            <h2><span className="step-num">2</span> Payment method</h2>
            <div className="pay-method"><CashIcon size={24} /> <div><strong>Payment: cash on delivery</strong><div className="small muted">Pay each seller in cash when your package arrives. No card needed.</div></div></div>
          </section>

          <section className="step">
            <h2><span className="step-num">3</span> Review items</h2>
            {groups.map((g) => (
              <div key={g.seller.id} className="review-group">
                <div className="review-group-head">Shipment from <strong>{g.seller.storeName}</strong> · {amd(g.subtotal)}</div>
                {g.items.map((i) => (
                  <div key={i.productId} className="review-item">
                    {i.image && <img src={i.image.thumb} alt="" />}
                    <div>
                      <div className="strong">{i.title}</div>
                      <div className="small">{i.quantity} × {amd(i.priceAmd)} {i.priceChanged && <span className="text-warn">(price changed)</span>}</div>
                      {(i.soldOut || i.unavailable || i.exceedsStock) && <div className="small text-danger">Not available in this quantity</div>}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </section>
        </div>

        <aside className="card-panel order-summary">
          <button className="btn btn-buy btn-block" type="submit" disabled={placing || cart.cart.hasProblems}>
            {placing ? 'Placing your order…' : 'Place your order'}
          </button>
          <div className="small muted center">By placing your order you agree to pay the sellers in cash on delivery.</div>
          <hr />
          <h3>Order Summary</h3>
          {groups.map((g) => (
            <div key={g.seller.id} className="sum-row"><span>{g.seller.storeName}</span><span>{amd(g.subtotal)}</span></div>
          ))}
          <div className="sum-row"><span>Delivery</span><span className="text-ok">Free</span></div>
          <hr />
          <div className="sum-row sum-total"><span>Order total:</span><span>{amd(cart.cart.grandTotal)}</span></div>
          <div className="sum-row small"><span>Payment</span><span>Cash on delivery</span></div>
        </aside>
      </form>
    </div>
  );
}
