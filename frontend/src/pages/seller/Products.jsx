import { useState } from 'react';
import { Link } from 'react-router-dom';
import { get, patch } from '../../api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { amd } from '../../format.js';
import { useLoad, useTitle, Spinner, ErrorState, EmptyState, PlusIcon, Alert } from '../../components/ui.jsx';

export default function SellerProducts() {
  useTitle('Your products');
  const res = useLoad(() => get('/seller/products'), []);
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState(null);

  async function togglePublish(p) {
    setBusy(p.id); setErr(null);
    try {
      await patch(`/seller/products/${p.id}`, { isPublished: !p.isPublished });
      toast(p.isPublished ? 'Product unpublished — buyers no longer see it.' : 'Product published.');
      res.reload();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  }

  if (res.loading) return <Spinner />;
  if (res.error) return <ErrorState error={res.error} onRetry={res.reload} />;
  const products = res.data.products;

  return (
    <div>
      <div className="panel-head">
        <h1>Products</h1>
        <Link to="/seller/products/new" className="btn btn-cart"><PlusIcon size={16} /> Add a product</Link>
      </div>
      {err && <Alert tone="danger">{err}</Alert>}
      {products.length === 0 ? (
        <div className="card-panel">
          <EmptyState title="You have no products yet" action={<Link to="/seller/products/new" className="btn btn-cart">Add your first product</Link>}>
            Add a title, price in AMD, stock and up to 5 photos.
          </EmptyState>
        </div>
      ) : (
        <div className="card-panel table-wrap">
          <table className="table products-table">
            <thead>
              <tr><th>Product</th><th className="num">Price</th><th className="num">Stock</th><th>Status</th><th className="num">Sold</th><th /></tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className={p.isPublished ? '' : 'row-muted'}>
                  <td data-label="Product">
                    <div className="prod-cell">
                      {p.image ? <img src={p.image.thumb} alt="" /> : <div className="img-missing" />}
                      <div>
                        <Link to={`/p/${p.id}`} className="strong">{p.title}</Link>
                        <div className="small muted">{p.categoryName} · {p.imageCount} photo{p.imageCount === 1 ? '' : 's'}</div>
                      </div>
                    </div>
                  </td>
                  <td data-label="Price" className="num">{amd(p.priceAmd)}</td>
                  <td data-label="Stock" className={`num ${p.stock === 0 ? 'text-danger strong' : p.stock <= 5 ? 'text-warn' : ''}`}>{p.stock}</td>
                  <td data-label="Status">{p.isPublished ? <span className="badge badge-delivered">Published</span> : <span className="badge badge-cancelled">Unpublished</span>}</td>
                  <td data-label="Units sold" className="num">{p.unitsSold}</td>
                  <td className="actions-cell">
                    <Link to={`/seller/products/${p.id}/edit`} className="btn btn-secondary btn-sm">Edit</Link>
                    <button className="btn btn-secondary btn-sm" disabled={busy === p.id} onClick={() => togglePublish(p)}>
                      {p.isPublished ? 'Unpublish' : 'Publish'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
