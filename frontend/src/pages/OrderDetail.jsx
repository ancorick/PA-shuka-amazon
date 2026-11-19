import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { get, post } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';
import { amd, dateShort } from '../format.js';
import { useLoad, useTitle, PageLoader, ErrorState, StatusBadge, StatusProgress, StatusTimeline, Alert, StoreIcon } from '../components/ui.jsx';

export default function OrderDetail() {
  const { id } = useParams();
  useTitle(`Order #${id}`);
  const toast = useToast();
  const res = useLoad(() => get(`/orders/${id}`), [id]);
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState(null);

  if (res.loading) return <PageLoader />;
  if (res.error) return <ErrorState error={res.error} />;
  const o = res.data.order;

  async function cancel(part) {
    if (!window.confirm(`Cancel the part of order #${o.id} from ${part.seller.storeName}?`)) return;
    setBusy(part.id); setErr(null);
    try {
      const data = await post(`/orders/${o.id}/sellers/${part.id}/cancel`);
      res.setData({ order: data.order });
      toast('This part of the order was cancelled.');
    } catch (e) {
      setErr(e.message);
      res.reload();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="container page-pad order-detail">
      <nav className="crumbs small"><Link to="/orders">Your Orders</Link> › <span className="text-accent">Order #{o.id}</span></nav>
      <h1>Order Details</h1>
      <div className="small muted">Ordered on {dateShort(o.createdAt)} · Order # {o.id}</div>
      {err && <Alert tone="danger">{err}</Alert>}

      <div className="card-panel order-summary-box">
        <div>
          <h3>Shipping Address</h3>
          <div>{o.address.recipient}</div>
          <div>{o.address.street}{o.address.apartment ? `, apt. ${o.address.apartment}` : ''}</div>
          <div>{o.address.city}, {o.address.region}</div>
          <div>{o.address.phone}</div>
          {o.address.note && <div className="small muted">Note: {o.address.note}</div>}
        </div>
        <div>
          <h3>Payment Method</h3>
          <div>Cash on delivery</div>
        </div>
        <div>
          <h3>Order Summary</h3>
          {o.parts.map((p) => <div key={p.id} className="sum-row"><span>{p.seller.storeName}</span><span>{amd(p.subtotalAmd)}</span></div>)}
          <div className="sum-row sum-total"><span>Grand Total:</span><span>{amd(o.totalAmd)}</span></div>
        </div>
      </div>

      {o.parts.map((p) => (
        <section key={p.id} className="card-panel part">
          <header className="part-head">
            <div>
              <div className="part-status"><StatusBadge status={p.status} /> <span className="muted small">updated {dateShort(p.updatedAt)}</span></div>
              <div className="small"><StoreIcon size={14} /> Sold by <strong>{p.seller.storeName}</strong></div>
            </div>
            {p.canCancel && (
              <button className="btn btn-secondary btn-sm" onClick={() => cancel(p)} disabled={busy === p.id}>
                {busy === p.id ? 'Cancelling…' : 'Cancel this part'}
              </button>
            )}
          </header>
          <StatusProgress status={p.status} />
          <div className="part-body">
            <div className="part-items">
              {p.items.map((i) => (
                <div key={i.id} className="part-item">
                  <Link to={`/p/${i.productId}`}>{i.image ? <img src={i.image.thumb} alt="" /> : <div className="img-missing" />}</Link>
                  <div>
                    <Link to={`/p/${i.productId}`} className="strong">{i.title}</Link>
                    <div className="small">{i.quantity} × {amd(i.unitPriceAmd)} = <strong>{amd(i.lineTotal)}</strong></div>
                    {i.canReview && <Link to={`/p/${i.productId}#reviews`} className="btn btn-cart btn-sm mt-s">Write a review</Link>}
                    {i.reviewed && <div className="small text-ok">✓ You reviewed this item</div>}
                  </div>
                </div>
              ))}
            </div>
            <div className="part-history">
              <h4>Status history</h4>
              <StatusTimeline history={p.history} />
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
