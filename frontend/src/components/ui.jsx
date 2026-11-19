import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { amd, STATUS_LABEL, dateTime } from '../format.js';
import { useAuth } from '../context/AuthContext.jsx';

// ───────────── Icons (inline SVG, no icon library) ─────────────
const icon = (d, vb = '0 0 24 24') => function Icon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox={vb} fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{d}</svg>
  );
};
export const SearchIcon = icon(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>);
export const CartIcon = icon(<><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M2 3h3l2.7 12.3a2 2 0 0 0 2 1.7h7.6a2 2 0 0 0 2-1.6L21 8H6" /></>);
export const MenuIcon = icon(<path d="M3 6h18M3 12h18M3 18h18" />);
export const PinIcon = icon(<><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" /><circle cx="12" cy="10" r="2.5" /></>);
export const UserIcon = icon(<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>);
export const CloseIcon = icon(<path d="M18 6 6 18M6 6l12 12" />);
export const ChevronDown = icon(<path d="m6 9 6 6 6-6" />);
export const TruckIcon = icon(<><path d="M1 4h14v12H1zM15 9h4l3 3v4h-7" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></>);
export const CashIcon = icon(<><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="3" /></>);
export const BoxIcon = icon(<><path d="M21 8 12 3 3 8v8l9 5 9-5Z" /><path d="m3 8 9 5 9-5M12 13v8" /></>);
export const ChartIcon = icon(<><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 5-6" /></>);
export const ListIcon = icon(<><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="3.5" cy="6" r="1" /><circle cx="3.5" cy="12" r="1" /><circle cx="3.5" cy="18" r="1" /></>);
export const PlusIcon = icon(<path d="M12 5v14M5 12h14" />);
export const StoreIcon = icon(<><path d="M3 9 4.5 4h15L21 9" /><path d="M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0Z" /><path d="M5 13v8h14v-8" /></>);
export const ShieldIcon = icon(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />);
export const TrashIcon = icon(<><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></>);
export const StarFilled = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.5L12 17.3l-5.9 3.2 1.3-6.5L2.5 9.4l6.6-.8z" /></svg>
);

// ───────────── Brand ─────────────
export function Logo({ light = true }) {
  return (
    <span className={`logo ${light ? 'logo-light' : 'logo-dark'}`} aria-label="Shuka">
      <span className="logo-word">shuka</span>
      <svg className="logo-smile" viewBox="0 0 100 20" aria-hidden="true">
        <path d="M6 4 Q50 22 90 6" stroke="#FF9900" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M82 2 L92 6 L86 14" stroke="#FF9900" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="logo-tld">.am</span>
    </span>
  );
}

// ───────────── Rating ─────────────
export function Stars({ value = 0, size = 16, count, showValue = false }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span className="stars-wrap" title={count !== undefined ? `${value} out of 5 (${count})` : `${value} out of 5`}>
      {showValue && <span className="stars-value">{value.toFixed(1)}</span>}
      <span className="stars" style={{ '--size': `${size}px` }}>
        <span className="stars-bg">{[0, 1, 2, 3, 4].map((i) => <StarFilled key={i} size={size} />)}</span>
        <span className="stars-fg" style={{ width: `${pct}%` }}>{[0, 1, 2, 3, 4].map((i) => <StarFilled key={i} size={size} />)}</span>
      </span>
      {count !== undefined && <span className="stars-count">{count.toLocaleString('en-US')}</span>}
    </span>
  );
}

// ───────────── Price ─────────────
export function Price({ value, size = 'md' }) {
  const [whole] = String(value ?? 0).split('.');
  return (
    <span className={`price price-${size}`}>
      <span className="price-whole">{Number(whole).toLocaleString('en-US')}</span>
      <span className="price-sym">֏</span>
    </span>
  );
}

// ───────────── Product card ─────────────
export function ProductCard({ p }) {
  return (
    <Link to={`/p/${p.id}`} className="pcard">
      <div className="pcard-img">
        {p.image ? <img src={p.image.thumb} alt={p.title} loading="lazy" /> : <div className="img-missing">No image</div>}
      </div>
      <div className="pcard-body">
        <div className="pcard-title">{p.title}</div>
        <div className="pcard-rating">
          {p.ratingCount > 0 ? <Stars value={p.ratingAvg} count={p.ratingCount} size={14} /> : <span className="muted small">No reviews yet</span>}
        </div>
        <Price value={p.priceAmd} />
        {p.stock === 0 ? <div className="small text-danger">Out of stock</div>
          : p.stock <= 5 ? <div className="small text-warn">Only {p.stock} left in stock</div>
            : <div className="small muted">Cash on delivery · Armenia</div>}
      </div>
    </Link>
  );
}

export function ProductGrid({ items }) {
  return <div className="pgrid">{items.map((p) => <ProductCard key={p.id} p={p} />)}</div>;
}

export function ProductGridSkeleton({ n = 8 }) {
  return (
    <div className="pgrid">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="pcard skeleton-card">
          <div className="pcard-img skeleton" />
          <div className="pcard-body"><div className="skeleton line" /><div className="skeleton line short" /><div className="skeleton line shorter" /></div>
        </div>
      ))}
    </div>
  );
}

// ───────────── Status ─────────────
export function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABEL[status] || status}</span>;
}

const FLOW = ['placed', 'confirmed', 'shipped', 'delivered'];

export function StatusProgress({ status }) {
  if (status === 'cancelled') return <div className="progress cancelled"><span>Cancelled</span></div>;
  const idx = FLOW.indexOf(status);
  return (
    <ol className="progress">
      {FLOW.map((s, i) => (
        <li key={s} className={i <= idx ? 'done' : ''}><span className="dot" />{STATUS_LABEL[s]}</li>
      ))}
    </ol>
  );
}

export function StatusTimeline({ history }) {
  return (
    <ol className="timeline">
      {[...history].reverse().map((h, i) => (
        <li key={i}>
          <span className={`tl-dot tl-${h.to}`} />
          <div>
            <div><strong>{STATUS_LABEL[h.to]}</strong>{h.from ? <span className="muted"> · from {STATUS_LABEL[h.from]}</span> : null}</div>
            <div className="small muted">{dateTime(h.at)} · by {h.by}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

// ───────────── Forms ─────────────
export function Field({ label, error, hint, children, id }) {
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      {label && <label htmlFor={id}>{label}</label>}
      {children}
      {error ? <div className="field-error" role="alert">⚠ {error}</div> : hint ? <div className="field-hint">{hint}</div> : null}
    </div>
  );
}

export function Alert({ tone = 'info', title, children }) {
  return (
    <div className={`alert alert-${tone}`} role={tone === 'danger' ? 'alert' : undefined}>
      {title && <div className="alert-title">{title}</div>}
      <div>{children}</div>
    </div>
  );
}

export function Spinner({ label = 'Loading…' }) {
  return <div className="spinner-wrap"><span className="spinner" aria-hidden="true" /> <span className="muted">{label}</span></div>;
}

export function PageLoader() {
  return <div className="container page-pad"><Spinner /></div>;
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="empty">
      <BoxIcon size={48} />
      <h2>{title}</h2>
      {children && <p className="muted">{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="container page-pad">
      <Alert tone="danger" title={error?.status === 404 ? 'Not found' : 'Something went wrong'}>
        {error?.message || 'Please try again.'}
      </Alert>
      {onRetry && <button className="btn btn-secondary mt" onClick={onRetry}>Try again</button>}
      <p className="mt"><Link to="/">← Back to the homepage</Link></p>
    </div>
  );
}

export function Pagination({ page, pages, onPage }) {
  if (pages <= 1) return null;
  const nums = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  return (
    <nav className="pagination" aria-label="Pages">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)}>‹ Previous</button>
      {nums.map((n, i) => n === '…'
        ? <span key={`e${i}`} className="pg-gap">…</span>
        : <button key={n} className={n === page ? 'active' : ''} aria-current={n === page ? 'page' : undefined} onClick={() => onPage(n)}>{n}</button>)}
      <button disabled={page >= pages} onClick={() => onPage(page + 1)}>Next ›</button>
    </nav>
  );
}

export function QtySelect({ value, max, onChange, disabled, id }) {
  const limit = Math.max(1, Math.min(max, 30));
  const options = Array.from({ length: limit }, (_, i) => i + 1);
  if (value > limit) options.push(value);
  return (
    <select id={id} className="qty-select" value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))}>
      {options.map((n) => <option key={n} value={n}>Qty: {n}</option>)}
    </select>
  );
}

// ───────────── Route guards ─────────────
export function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  return children;
}

export function RequireSeller({ children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  if (!user.isSeller) return <Navigate to="/sell" replace />;
  return children;
}

// ───────────── Hooks ─────────────
/** Small data-loading hook: { data, error, loading, reload, setData } */
export function useLoad(fn, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn().then(
      (data) => alive && setState({ data, error: null, loading: false }),
      (error) => alive && setState({ data: null, error, loading: false }),
    );
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return {
    ...state,
    reload: () => setTick((t) => t + 1),
    setData: (data) => setState((s) => ({ ...s, data: typeof data === 'function' ? data(s.data) : data })),
  };
}

export function useTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Shuka` : "Shuka — Armenia's marketplace";
  }, [title]);
}

export { amd };
