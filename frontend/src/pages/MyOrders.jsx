import { Link } from 'react-router-dom';
import { get } from '../api.js';
import { amd, dateShort } from '../format.js';
import { useLoad, useTitle, PageLoader, ErrorState, EmptyState, StatusBadge } from '../components/ui.jsx';

export default function MyOrders() {
  useTitle('Your Orders');
  const res = useLoad(() => get('/orders'), []);
  if (res.loading) return <PageLoader />;
  if (res.error) return <ErrorState error={res.error} onRetry={res.reload} />;
  const orders = res.data.orders;

  return (
    <div className="container page-pad orders-page">
      <nav className="crumbs small"><Link to="/account">Your Account</Link> › <span className="text-accent">Your Orders</span></nav>
      <h1>Your Orders</h1>
      {orders.length === 0 ? (
        <div className="card-panel">
          <EmptyState title="You have not placed any orders yet" action={<Link to="/" className="btn btn-cart">Start shopping</Link>} />
        </div>
      ) : orders.map((o) => (
        <article key={o.id} className="order-card">
          <header className="order-card-head">
            <div><div className="label">ORDER PLACED</div><div>{dateShort(o.createdAt)}</div></div>
            <div><div className="label">TOTAL</div><div>{amd(o.totalAmd)}</div></div>
            <div className="hide-sm"><div className="label">SHIP TO</div><div>{o.shipTo}</div></div>
            <div className="order-card-no">
              <div className="label">ORDER # {o.id}</div>
              <Link to={`/orders/${o.id}`}>View order details</Link>
            </div>
          </header>
          <div className="order-card-body">
            <div className="order-parts">
              {o.parts.map((p) => (
                <div key={p.id} className="order-part-row">
                  <StatusBadge status={p.status} />
                  <span><strong>{p.storeName}</strong> · {p.itemCount} item{p.itemCount === 1 ? '' : 's'} · {amd(p.subtotalAmd)}</span>
                </div>
              ))}
            </div>
            <div className="order-thumbs">
              {o.thumbs.map((t, i) => t.image && <img key={i} src={t.image.thumb} alt={t.title} title={t.title} />)}
            </div>
            <Link to={`/orders/${o.id}`} className="btn btn-secondary btn-sm order-card-btn">Track &amp; manage</Link>
          </div>
        </article>
      ))}
    </div>
  );
}
