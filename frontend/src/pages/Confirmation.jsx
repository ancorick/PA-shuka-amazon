import { Link, useParams } from 'react-router-dom';
import { get } from '../api.js';
import { amd } from '../format.js';
import { useLoad, useTitle, PageLoader, ErrorState } from '../components/ui.jsx';

export default function Confirmation() {
  const { id } = useParams();
  useTitle('Order placed');
  const res = useLoad(() => get(`/orders/${id}`), [id]);
  if (res.loading) return <PageLoader />;
  if (res.error) return <ErrorState error={res.error} />;
  const o = res.data.order;
  return (
    <div className="container page-pad">
      <div className="card-panel confirm">
        <div className="confirm-head">
          <span className="confirm-check">✓</span>
          <div>
            <h1>Order placed, thank you!</h1>
            <p>Your order number is <strong className="order-no">#{o.id}</strong>. Each seller will confirm and deliver their part.</p>
          </div>
        </div>
        <div className="confirm-grid">
          <div>
            <div className="small muted">Shipping to</div>
            <div className="strong">{o.address.recipient}</div>
            <div>{o.address.street}{o.address.apartment ? `, apt. ${o.address.apartment}` : ''}, {o.address.city}, {o.address.region}</div>
            <div>{o.address.phone}</div>
          </div>
          <div>
            <div className="small muted">Payment</div>
            <div className="strong">Cash on delivery</div>
            <div>Total to pay: <strong>{amd(o.totalAmd)}</strong></div>
          </div>
          <div>
            <div className="small muted">Shipments</div>
            {o.parts.map((p) => <div key={p.id}>{p.seller.storeName} · {amd(p.subtotalAmd)}</div>)}
          </div>
        </div>
        <div className="confirm-actions">
          <Link to={`/orders/${o.id}`} className="btn btn-cart">View order details</Link>
          <Link to="/" className="btn btn-secondary">Continue shopping</Link>
        </div>
      </div>
    </div>
  );
}
