import { Link, useSearchParams } from 'react-router-dom';
import { get } from '../../api.js';
import { amd, dateTime, STATUS_LABEL } from '../../format.js';
import { useLoad, useTitle, Spinner, ErrorState, EmptyState, StatusBadge } from '../../components/ui.jsx';

const TABS = ['all', 'placed', 'confirmed', 'shipped', 'delivered', 'cancelled'];

export default function SellerOrders() {
  useTitle('Incoming orders');
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || 'all';
  const res = useLoad(() => get(`/seller/orders${status !== 'all' ? `?status=${status}` : ''}`), [status]);

  return (
    <div>
      <h1>Orders</h1>
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={status === t} className={status === t ? 'active' : ''}
            onClick={() => setParams(t === 'all' ? {} : { status: t })}>
            {t === 'all' ? 'All' : STATUS_LABEL[t]} <span className="tab-count">{res.data?.counts?.[t] ?? '·'}</span>
          </button>
        ))}
      </div>
      {res.loading && !res.data ? <Spinner /> : res.error ? <ErrorState error={res.error} onRetry={res.reload} /> : (
        res.data.orders.length === 0 ? (
          <div className="card-panel"><EmptyState title={status === 'all' ? 'No orders yet' : `No ${STATUS_LABEL[status].toLowerCase()} orders`} /></div>
        ) : (
          <div className="card-panel table-wrap">
            <table className="table orders-table">
              <thead><tr><th>Order</th><th>Date</th><th>Ship to</th><th className="num">Items</th><th className="num">Cash to collect</th><th>Status</th><th /></tr></thead>
              <tbody>
                {res.data.orders.map((o) => (
                  <tr key={o.id}>
                    <td data-label="Order"><Link to={`/seller/orders/${o.id}`} className="strong">#{o.orderId}</Link></td>
                    <td data-label="Date">{dateTime(o.createdAt)}</td>
                    <td data-label="Ship to">{o.shipTo}</td>
                    <td data-label="Items" className="num">{o.itemCount}</td>
                    <td data-label="Amount" className="num">{amd(o.subtotalAmd)}</td>
                    <td data-label="Status"><StatusBadge status={o.status} /></td>
                    <td className="actions-cell"><Link to={`/seller/orders/${o.id}`} className="btn btn-secondary btn-sm">Open</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
