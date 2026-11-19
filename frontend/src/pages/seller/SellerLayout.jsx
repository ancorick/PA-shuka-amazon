import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ChartIcon, BoxIcon, ListIcon, PlusIcon, StoreIcon } from '../../components/ui.jsx';

export default function SellerLayout() {
  const { user } = useAuth();
  return (
    <div className="seller">
      <div className="seller-bar">
        <div className="container seller-bar-inner">
          <span className="seller-brand"><StoreIcon size={18} /> Seller Central · <strong>{user.storeName}</strong></span>
        </div>
      </div>
      <div className="container seller-layout">
        <nav className="seller-nav" aria-label="Seller dashboard">
          <NavLink to="/seller" end><ChartIcon size={18} /> Overview</NavLink>
          <NavLink to="/seller/orders"><ListIcon size={18} /> Orders</NavLink>
          <NavLink to="/seller/products" end><BoxIcon size={18} /> Products</NavLink>
          <NavLink to="/seller/products/new"><PlusIcon size={18} /> Add product</NavLink>
        </nav>
        <div className="seller-content"><Outlet /></div>
      </div>
    </div>
  );
}
