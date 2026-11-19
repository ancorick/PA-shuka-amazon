import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { amd } from '../format.js';
import { Price, QtySelect, useTitle, EmptyState, Alert, Spinner, StoreIcon } from '../components/ui.jsx';

function CartItem({ item }) {
  const cart = useCart();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function change(q) {
    setBusy(true); setErr(null);
    try { await cart.setQuantity(item.productId, q); } catch (e) { setErr(e.message); await cart.refresh(); } finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true);
    try { await cart.remove(item.productId); toast('Removed from cart'); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className={`cart-item ${busy ? 'is-busy' : ''}`}>
      <Link to={`/p/${item.productId}`} className="cart-thumb">
        {item.image ? <img src={item.image.thumb} alt="" /> : <div className="img-missing" />}
      </Link>
      <div className="cart-main">
        <Link to={`/p/${item.productId}`} className="cart-title">{item.title}</Link>
        {item.unavailable ? <div className="text-danger small strong">No longer available</div>
          : item.soldOut ? <div className="text-danger small strong">Sold out since you added it</div>
            : item.exceedsStock ? <div className="text-warn small strong">Only {item.stock} left — lower the quantity</div>
              : item.stock <= 5 ? <div className="text-warn small">Only {item.stock} left in stock</div>
                : <div className="text-ok small">In stock</div>}
        {item.priceChanged && (
          <div className="price-change small">
            Price changed from <s>{amd(item.priceWhenAdded)}</s> to <strong>{amd(item.priceAmd)}</strong> since you added it.
          </div>
        )}
        <div className="cart-actions">
          {!item.unavailable && !item.soldOut && (
            <QtySelect value={item.quantity} max={item.stock} onChange={change} disabled={busy} />
          )}
          <span className="sep" />
          <button className="link-btn" onClick={remove} disabled={busy}>Delete</button>
        </div>
        {err && <div className="field-error">⚠ {err}</div>}
      </div>
      <div className="cart-price"><Price value={item.priceAmd} /></div>
    </div>
  );
}

export default function Cart() {
  useTitle('Shopping Cart');
  const { cart, loading } = useCart();
  const navigate = useNavigate();

  if (loading && cart.groups.length === 0) return <div className="container page-pad"><Spinner /></div>;

  if (cart.groups.length === 0) {
    return (
      <div className="container page-pad">
        <div className="card-panel">
          <EmptyState title="Your Shuka Cart is empty" action={<Link to="/" className="btn btn-cart">Continue shopping</Link>}>
            Browse categories and add products from any seller — everything goes into one cart.
          </EmptyState>
        </div>
      </div>
    );
  }

  const priceChanges = cart.groups.some((g) => g.items.some((i) => i.priceChanged));
  const itemsCount = cart.groups.reduce((s, g) => s + g.items.filter((i) => !i.unavailable && !i.soldOut).reduce((a, i) => a + i.quantity, 0), 0);

  return (
    <div className="container page-pad cart-page">
      <div className="cart-layout">
        <section className="card-panel cart-list">
          <h1>Shopping Cart</h1>
          <div className="cart-price-head small muted">Price</div>
          {priceChanges && <Alert tone="warn" title="Some prices have changed">Check the highlighted items. The new price will be used when you place the order.</Alert>}
          {cart.hasProblems && <Alert tone="danger" title="Some items need your attention">Remove sold-out items or lower the quantity before checkout.</Alert>}
          {cart.groups.map((g) => (
            <div key={g.seller.id} className="cart-group">
              <div className="cart-group-head">
                <StoreIcon size={18} /> Sold by <strong>{g.seller.storeName}</strong>
              </div>
              {g.items.map((i) => <CartItem key={i.productId} item={i} />)}
              <div className="cart-group-sub">Subtotal from {g.seller.storeName}: <strong>{amd(g.subtotal)}</strong></div>
            </div>
          ))}
          <div className="cart-total-line">
            Subtotal ({itemsCount} item{itemsCount === 1 ? '' : 's'}): <strong>{amd(cart.grandTotal)}</strong>
          </div>
        </section>

        <aside className="card-panel cart-summary">
          <div className="small text-ok">✓ Free delivery — pay cash when it arrives.</div>
          <div className="cart-summary-total">
            Subtotal ({itemsCount} item{itemsCount === 1 ? '' : 's'}): <strong>{amd(cart.grandTotal)}</strong>
          </div>
          <div className="small muted">{cart.groups.length} seller{cart.groups.length === 1 ? '' : 's'} · each ships separately</div>
          <button className="btn btn-cart btn-block" disabled={cart.hasProblems || itemsCount === 0} onClick={() => navigate('/checkout')}>
            Proceed to checkout
          </button>
        </aside>
      </div>
    </div>
  );
}
