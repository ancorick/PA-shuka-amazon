import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { get, post } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { dateShort, stockLabel } from '../format.js';
import { Stars, Price, QtySelect, useLoad, useTitle, PageLoader, ErrorState, Alert, Field, StarFilled, PinIcon, CashIcon } from '../components/ui.jsx';

function Gallery({ images, title }) {
  const [active, setActive] = useState(0);
  useEffect(() => { setActive(0); }, [images]);
  if (!images.length) return <div className="gallery"><div className="gallery-main img-missing">No image</div></div>;
  const img = images[Math.min(active, images.length - 1)];
  return (
    <div className="gallery">
      {images.length > 1 && (
        <div className="gallery-thumbs">
          {images.map((im, i) => (
            <button key={im.id} className={i === active ? 'active' : ''} onMouseEnter={() => setActive(i)} onClick={() => setActive(i)} aria-label={`Image ${i + 1}`}>
              <img src={im.thumb} alt="" />
            </button>
          ))}
        </div>
      )}
      <div className="gallery-main"><img src={img.large} alt={title} /></div>
      {images.length > 1 && (
        <div className="gallery-dots">{images.map((im, i) => <span key={im.id} className={i === active ? 'on' : ''} onClick={() => setActive(i)} />)}</div>
      )}
    </div>
  );
}

function ReviewForm({ productId, onDone }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!rating) errs.rating = 'Choose 1 to 5 stars.';
    if (body.trim().length < 3) errs.body = 'Write a few words about the product.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await post(`/products/${productId}/reviews`, { rating, body });
      toast('Thank you! Your review was published.');
      onDone();
    } catch (err) {
      setErrors({ ...err.fields, form: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="review-form" onSubmit={submit}>
      <h3>Write a customer review</h3>
      {errors.form && <Alert tone="danger">{errors.form}</Alert>}
      <Field label="Overall rating" error={errors.rating}>
        <div className="star-input" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button type="button" key={n} className={(hover || rating) >= n ? 'on' : ''} onMouseEnter={() => setHover(n)} onClick={() => setRating(n)} aria-label={`${n} stars`}>
              <StarFilled size={30} />
            </button>
          ))}
        </div>
      </Field>
      <Field label="Your review" error={errors.body} id="review-body">
        <textarea id="review-body" rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="What did you like or dislike?" maxLength={2000} />
      </Field>
      <button className="btn btn-cart" disabled={busy}>{busy ? 'Publishing…' : 'Submit review'}</button>
    </form>
  );
}

function Reviews({ product, onRatingChange }) {
  const res = useLoad(() => get(`/products/${product.id}/reviews`), [product.id]);
  if (res.loading) return null;
  if (res.error) return null;
  const { reviews, histogram, canReview, reviewBlockedReason } = res.data;
  const total = reviews.length;
  return (
    <section className="reviews" id="reviews">
      <div className="reviews-summary">
        <h2>Customer reviews</h2>
        <div className="reviews-avg"><Stars value={product.ratingAvg} size={20} /> <strong>{product.ratingAvg.toFixed(1)} out of 5</strong></div>
        <div className="muted small">{total} global rating{total === 1 ? '' : 's'}</div>
        <div className="histogram">
          {histogram.map((h) => (
            <div key={h.stars} className="hist-row">
              <span>{h.stars} star</span>
              <span className="hist-bar"><span style={{ width: total ? `${(h.count / total) * 100}%` : 0 }} /></span>
              <span>{total ? Math.round((h.count / total) * 100) : 0}%</span>
            </div>
          ))}
        </div>
        <div className="review-cta">
          {canReview ? <ReviewForm productId={product.id} onDone={() => { res.reload(); onRatingChange(); }} />
            : reviewBlockedReason === 'already' ? <p className="small muted">You have reviewed this product. Thank you!</p>
              : reviewBlockedReason === 'not_delivered' ? <p className="small muted">You can review this product after it has been delivered to you.</p>
                : <p className="small muted"><Link to="/login">Sign in</Link> to review products you have received.</p>}
        </div>
      </div>
      <div className="reviews-list">
        {total === 0 ? <p className="muted">No reviews yet. Buyers can review after delivery.</p> : reviews.map((r) => (
          <article key={r.id} className="review">
            <div className="review-author"><span className="avatar">{r.author[0]}</span>{r.author}{r.isMine && <span className="badge badge-placed">You</span>}</div>
            <div className="review-head"><Stars value={r.rating} size={15} /> <span className="strong">Verified purchase</span></div>
            <div className="small muted">Reviewed on {dateShort(r.createdAt)}</div>
            <p>{r.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function Product() {
  const { id } = useParams();
  const { user } = useAuth();
  const cart = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const loc = useLocation();
  const res = useLoad(() => get(`/products/${id}`), [id]);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [added, setAdded] = useState(false);
  useTitle(res.data?.product?.title);
  useEffect(() => { setQty(1); setErr(null); setAdded(false); }, [id]);

  if (res.loading) return <PageLoader />;
  if (res.error) return <ErrorState error={res.error} />;
  const p = res.data.product;
  const inCart = cart.quantityOf(p.id);
  const available = Math.max(0, p.stock - inCart);
  const stock = stockLabel(p.stock);
  const own = user && p.seller.id === user.id;

  async function addToCart() {
    if (!user) { navigate(`/login?next=${encodeURIComponent(loc.pathname)}`); return; }
    setErr(null);
    setBusy(true);
    try {
      await cart.add(p.id, qty);
      setAdded(true);
      toast(`Added ${qty} × ${p.title.slice(0, 40)}${p.title.length > 40 ? '…' : ''} to cart`);
      setQty(1);
    } catch (e) {
      setErr(e.message);
      if (e.code === 'OUT_OF_STOCK') res.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container product-page">
      <nav className="crumbs small">
        <Link to="/">Home</Link> › <Link to={`/c/${p.category.slug}`}>{p.category.name}</Link>
      </nav>
      {!p.isPublished && <Alert tone="warn" title="This product is not published">Only you can see it. Publish it from the seller dashboard.</Alert>}
      <div className="product-grid">
        <Gallery images={p.images} title={p.title} />

        <div className="product-info">
          <h1>{p.title}</h1>
          <div className="small">Visit the <span className="link-like">{p.seller.storeName}</span> store</div>
          <a href="#reviews" className="product-rating">
            {p.ratingCount > 0 ? <Stars value={p.ratingAvg} count={p.ratingCount} size={16} showValue /> : <span className="muted small">No ratings yet</span>}
          </a>
          <hr />
          <div className="product-price"><Price value={p.priceAmd} size="xl" /></div>
          <div className="small muted">Price in Armenian dram. No hidden fees — pay cash on delivery.</div>
          <hr />
          <h3>About this item</h3>
          <p className="product-desc">{p.description}</p>
        </div>

        <aside className="buybox">
          <Price value={p.priceAmd} size="lg" />
          <div className="small buybox-delivery"><PinIcon size={16} /> Delivery to Yerevan and all marzer of Armenia</div>
          <div className={`stock stock-${stock.tone}`}>{stock.text}</div>
          <table className="buybox-meta small">
            <tbody>
              <tr><td className="muted">Ships from</td><td>{p.seller.storeName}</td></tr>
              <tr><td className="muted">Sold by</td><td>{p.seller.storeName}</td></tr>
              <tr><td className="muted">Payment</td><td><CashIcon size={14} /> Cash on delivery</td></tr>
            </tbody>
          </table>
          {own ? (
            <>
              <Alert tone="info">This is your product — you cannot buy it.</Alert>
              <Link to={`/seller/products/${p.id}/edit`} className="btn btn-secondary btn-block">Edit product</Link>
            </>
          ) : p.stock === 0 ? (
            <button className="btn btn-cart btn-block" disabled>Currently unavailable</button>
          ) : (
            <>
              {inCart > 0 && <div className="small in-cart">✓ {inCart} already in your <Link to="/cart">cart</Link></div>}
              {available > 0 ? (
                <>
                  <QtySelect id="qty" value={Math.min(qty, available)} max={available} onChange={setQty} />
                  <button className="btn btn-cart btn-block" onClick={addToCart} disabled={busy}>{busy ? 'Adding…' : 'Add to Cart'}</button>
                </>
              ) : (
                <div className="small text-warn">You already have all {p.stock} available units in your cart.</div>
              )}
              {added && <Link to="/cart" className="btn btn-buy btn-block">Go to Cart</Link>}
              {err && <Alert tone="danger">{err}</Alert>}
            </>
          )}
          <div className="small muted secure"><span>🔒</span> Secure account · verified reviews</div>
        </aside>
      </div>
      <Reviews product={p} onRatingChange={res.reload} />
    </div>
  );
}
