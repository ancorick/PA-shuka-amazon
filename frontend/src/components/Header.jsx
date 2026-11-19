import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useCategories } from '../context/CategoriesContext.jsx';
import { Logo, SearchIcon, CartIcon, MenuIcon, PinIcon, CloseIcon, ChevronDown, UserIcon } from './ui.jsx';

function SearchBar() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const loc = useLocation();
  const categories = useCategories();
  const onSearchPage = loc.pathname === '/search';
  const [q, setQ] = useState(onSearchPage ? params.get('q') || '' : '');
  const [cat, setCat] = useState(onSearchPage ? params.get('category') || '' : '');

  useEffect(() => {
    if (onSearchPage) {
      setQ(params.get('q') || '');
      setCat(params.get('category') || '');
    }
  }, [onSearchPage, params]);

  function submit(e) {
    e.preventDefault();
    const sp = new URLSearchParams();
    if (q.trim()) sp.set('q', q.trim());
    if (cat) sp.set('category', cat);
    navigate(`/search?${sp.toString()}`);
  }

  return (
    <form className="searchbar" onSubmit={submit} role="search">
      <select className="search-cat" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Search in category">
        <option value="">All</option>
        {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
      </select>
      <input
        className="search-input"
        type="search"
        placeholder="Search Shuka"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Search products"
      />
      <button className="search-btn" type="submit" aria-label="Search"><SearchIcon size={22} /></button>
    </form>
  );
}

function AccountMenu() {
  const { user, logout } = useAuth();
  const { clearLocal } = useCart();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const loc = useLocation();

  useEffect(() => { setOpen(false); }, [loc.pathname]);
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  async function doLogout() {
    await logout();
    clearLocal();
    navigate('/');
  }

  const first = user?.name?.split(' ')[0];

  return (
    <div className="acct" ref={ref}>
      <button className="nav-item acct-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="nav-line1">Hello, {user ? first : 'sign in'}</span>
        <span className="nav-line2">Account &amp; Lists <ChevronDown size={14} /></span>
        <span className="acct-mobile"><UserIcon size={24} /><span>{user ? first : 'Sign in'}</span></span>
      </button>
      {open && (
        <div className="acct-menu">
          {!user ? (
            <div className="acct-signin">
              <Link to={`/login?next=${encodeURIComponent(loc.pathname)}`} className="btn btn-cart btn-block">Sign in</Link>
              <div className="small">New customer? <Link to="/register">Start here.</Link></div>
            </div>
          ) : (
            <>
              <div className="acct-head">
                <div className="strong">{user.name}</div>
                <div className="small muted">{user.email}</div>
              </div>
              <div className="acct-cols">
                <div>
                  <div className="acct-title">Your Account</div>
                  <Link to="/orders">My orders</Link>
                  <Link to="/account">Login &amp; profile</Link>
                  <Link to="/cart">Cart</Link>
                </div>
                <div>
                  <div className="acct-title">Selling</div>
                  {user.isSeller ? (
                    <>
                      <Link to="/seller">Seller dashboard</Link>
                      <Link to="/seller/products/new">Add a product</Link>
                      <Link to="/seller/orders">Incoming orders</Link>
                    </>
                  ) : <Link to="/sell">Sell on Shuka</Link>}
                </div>
              </div>
              <button className="link-btn acct-logout" onClick={doLogout}>Log out</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function CategoryDrawer({ open, onClose }) {
  const categories = useCategories();
  const { user } = useAuth();
  if (!open) return null;
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()} aria-label="Menu">
        <div className="drawer-head">
          <UserIcon size={26} /> <span>Hello, {user ? user.name.split(' ')[0] : <Link to="/login" onClick={onClose}>sign in</Link>}</span>
          <button className="drawer-close" onClick={onClose} aria-label="Close menu"><CloseIcon size={26} /></button>
        </div>
        <div className="drawer-body">
          <div className="drawer-title">Shop by Category</div>
          <Link to="/search" onClick={onClose}>All products</Link>
          {categories.map((c) => (
            <Link key={c.slug} to={`/c/${c.slug}`} onClick={onClose}>{c.name} <span className="muted small">({c.productCount})</span></Link>
          ))}
          <div className="drawer-title">Help &amp; Settings</div>
          <Link to="/orders" onClick={onClose}>My orders</Link>
          {user?.isSeller ? <Link to="/seller" onClick={onClose}>Seller dashboard</Link> : <Link to="/sell" onClick={onClose}>Sell on Shuka</Link>}
          <Link to="/account" onClick={onClose}>Your account</Link>
        </div>
      </aside>
    </div>
  );
}

export default function Header() {
  const { user } = useAuth();
  const { count } = useCart();
  const categories = useCategories();
  const [drawer, setDrawer] = useState(false);
  const loc = useLocation();
  useEffect(() => { setDrawer(false); }, [loc.pathname, loc.search]);

  return (
    <header className="site-header">
      <div className="nav-main">
        <button className="nav-burger" onClick={() => setDrawer(true)} aria-label="Open menu"><MenuIcon size={26} /></button>
        <Link to="/" className="nav-item nav-logo" aria-label="Shuka home"><Logo /></Link>
        <div className="nav-item nav-deliver">
          <PinIcon size={18} />
          <div>
            <span className="nav-line1">Deliver to</span>
            <span className="nav-line2">Armenia</span>
          </div>
        </div>
        <div className="nav-search"><SearchBar /></div>
        <AccountMenu />
        <Link to="/orders" className="nav-item nav-orders">
          <span className="nav-line1">Returns</span>
          <span className="nav-line2">&amp; Orders</span>
        </Link>
        <Link to="/cart" className="nav-item nav-cart" aria-label={`Cart, ${count} items`}>
          <span className="cart-icon-wrap">
            <CartIcon size={34} />
            <span className="cart-count">{count > 99 ? '99+' : count}</span>
          </span>
          <span className="nav-line2 cart-label">Cart</span>
        </Link>
      </div>
      <div className="nav-search-mobile"><SearchBar /></div>
      <nav className="nav-sub" aria-label="Categories">
        <button className="nav-sub-all" onClick={() => setDrawer(true)}><MenuIcon size={18} /> All</button>
        <div className="nav-sub-scroll">
          {categories.map((c) => (
            <NavLink key={c.slug} to={`/c/${c.slug}`}>{c.name}</NavLink>
          ))}
        </div>
        <NavLink to={user?.isSeller ? '/seller' : '/sell'} className="nav-sub-sell">
          {user?.isSeller ? 'Seller dashboard' : 'Sell on Shuka'}
        </NavLink>
      </nav>
      <CategoryDrawer open={drawer} onClose={() => setDrawer(false)} />
    </header>
  );
}
