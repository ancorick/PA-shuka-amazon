import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { get, post } from '../../api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { amd, dateTime, MOVE_LABEL, STATUS_LABEL } from '../../format.js';
import { useLoad, useTitle, Spinner, ErrorState, StatusBadge, StatusProgress, StatusTimeline, Alert, PinIcon, CashIcon } from '../../components/ui.jsx';

export default function SellerOrderDetail() {
  const { id } = useParams();
  const toast = useToast();
  const res = useLoad(() => get(`/seller/orders/${id}`), [id]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  useTitle(res.data ? `Order #${res.data.order.orderId}` : 'Order');

  if (res.loading) return <Spinner />;
  if (res.error) return <ErrorState error={res.error} />;
  const o = res.data.order;

  async function move(to) {
    if (to === 'cancelled' && !window.confirm('Cancel this order? The stock will be returned.')) return;
    setBusy(true); setErr(null);
    try {
      const data = await post(`/seller/orders/${o.id}/status`, { to });
      res.setData({ order: data.order });
      toast(`Order moved to ${STATUS_LABEL[to]}`);
    } catch (e) {
      setErr(e.message);
      res.reload();
    } finally {
      setBusy(false);
    }
  }

  const d = o.delivery;
  return (
    <div className="seller-order">
      <nav className="crumbs small"><Link to="/seller/orders">Orders</Link> › Order #{o.orderId}</nav>
      <div className="panel-head">
        <h1>Order #{o.orderId} <StatusBadge status={o.status} /></h1>
        <div className="small muted">Placed {dateTime(o.createdAt)}</div>
      </div>
      {err && <Alert tone="danger">{err}</Alert>}

      <section className="card-panel">
        <StatusProgress status={o.status} />
        <div className="move-actions">
          {o.allowedMoves.length === 0 ? (
            <span className="muted">{o.status === 'delivered' ? 'Delivered — this order is complete.' : 'This order was cancelled. No further actions.'}</span>
          ) : o.allowedMoves.map((to) => (
            <button key={to} disabled={busy} onClick={() => move(to)}
              className={`btn ${to === 'cancelled' ? 'btn-secondary' : to === 'delivered' ? 'btn-buy' : 'btn-cart'}`}>
              {MOVE_LABEL[to]}
            </button>
          ))}
        </div>
      </section>

      <div className="seller-order-grid">
        <section className="card-panel">
          <h2><PinIcon size={18} /> Deliver to</h2>
          <div className="deliver-box">
            <div className="strong big">{d.recipient}</div>
            <div><a href={`tel:${d.phone.replace(/\s/g, '')}`} className="phone-link">📞 {d.phone}</a></div>
            <div>{d.street}{d.apartment ? `, apt. ${d.apartment}` : ''}</div>
            <div>{d.city}, {d.region}, Armenia</div>
            {d.note && <div className="note-box"><strong>Note:</strong> {d.note}</div>}
            <div className="small muted">Buyer account: {o.buyer.name}</div>
          </div>
        </section>
        <section className="card-panel cash-box">
          <h2><CashIcon size={18} /> Cash to collect</h2>
          <div className="cash-amount">{amd(o.cashToCollect)}</div>
          <div className="small muted">Payment: cash on delivery</div>
        </section>
      </div>

      <section className="card-panel">
        <h2>Items</h2>
        <div className="table-scroll"><table className="table">
          <thead><tr><th>Item</th><th className="num">Price at purchase</th><th className="num">Qty</th><th className="num">Total</th></tr></thead>
          <tbody>
            {o.items.map((i) => (
              <tr key={i.id}>
                <td><div className="prod-cell">{i.image && <img src={i.image.thumb} alt="" />}<span>{i.title}</span></div></td>
                <td className="num">{amd(i.unitPriceAmd)}</td>
                <td className="num">{i.quantity}</td>
                <td className="num strong">{amd(i.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td colSpan={3} className="num strong">Subtotal</td><td className="num strong">{amd(o.subtotalAmd)}</td></tr></tfoot>
        </table></div>
      </section>

      <section className="card-panel">
        <h2>Status history</h2>
        <StatusTimeline history={o.history} />
      </section>
    </div>
  );
}
