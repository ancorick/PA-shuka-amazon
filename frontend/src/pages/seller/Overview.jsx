import { Link } from 'react-router-dom';
import { get } from '../../api.js';
import { amd, dateShort, STATUS_LABEL } from '../../format.js';
import { useLoad, useTitle, Spinner, ErrorState, StatusBadge } from '../../components/ui.jsx';

export default function Overview() {
  useTitle('Seller dashboard');
  const res = useLoad(() => get('/seller/overview'), []);
  if (res.loading) return <Spinner />;
  if (res.error) return <ErrorState error={res.error} onRetry={res.reload} />;
  const d = res.data;
  const maxStatus = Math.max(1, ...Object.values(d.byStatus));

  return (
    <div>
      <h1>Overview</h1>
      <div className="kpis">
        <Link to="/seller/orders?status=placed" className="kpi kpi-action">
          <div className="kpi-label">Orders to confirm</div>
          <div className="kpi-value">{d.toConfirm}</div>
          <div className="kpi-sub">Status: Placed</div>
        </Link>
        <Link to="/seller/orders?status=confirmed" className="kpi kpi-action">
          <div className="kpi-label">Orders to ship</div>
          <div className="kpi-value">{d.toShip}</div>
          <div className="kpi-sub">Status: Confirmed</div>
        </Link>
        <div className="kpi kpi-money">
          <div className="kpi-label">Revenue · last 30 days</div>
          <div className="kpi-value">{amd(d.revenue30d)}</div>
          <div className="kpi-sub">From delivered orders · all-time {amd(d.revenueAll)}</div>
        </div>
        <Link to="/seller/products" className="kpi">
          <div className="kpi-label">Products</div>
          <div className="kpi-value">{d.products.published}<span className="kpi-of"> / {d.products.total}</span></div>
          <div className="kpi-sub">published{d.products.soldOut ? ` · ${d.products.soldOut} sold out` : ''}</div>
        </Link>
      </div>

      <div className="overview-grid">
        <section className="card-panel">
          <h2>Orders by status</h2>
          <div className="status-bars">
            {Object.entries(d.byStatus).map(([s, n]) => (
              <Link key={s} to={`/seller/orders?status=${s}`} className="status-bar-row">
                <span className="sb-label">{STATUS_LABEL[s]}</span>
                <span className="sb-track"><span className={`sb-fill sb-${s}`} style={{ width: `${(n / maxStatus) * 100}%` }} /></span>
                <span className="sb-num">{n}</span>
              </Link>
            ))}
          </div>
        </section>
        <section className="card-panel">
          <div className="panel-head"><h2>Recent orders</h2><Link to="/seller/orders">See all</Link></div>
          {d.recentOrders.length === 0 ? <p className="muted">No orders yet. Share your products to get the first one!</p> : (
            <table className="table">
              <tbody>
                {d.recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td><Link to={`/seller/orders/${o.id}`}>#{o.orderId}</Link><div className="small muted">{dateShort(o.createdAt)}</div></td>
                    <td className="hide-sm">{o.shipTo}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td className="num">{amd(o.subtotalAmd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
