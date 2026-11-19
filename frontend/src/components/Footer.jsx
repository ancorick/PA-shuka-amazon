import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Logo } from './ui.jsx';

export default function Footer() {
  const { user } = useAuth();
  return (
    <footer className="site-footer">
      <button className="back-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Back to top</button>
      <div className="footer-cols container">
        <div>
          <h4>Get to Know Us</h4>
          <Link to="/search">All products</Link>
          <Link to="/search?sort=rating">Top rated</Link>
          <Link to="/search?sort=newest">New arrivals</Link>
        </div>
        <div>
          <h4>Make Money with Us</h4>
          <Link to={user?.isSeller ? '/seller' : '/sell'}>Sell on Shuka</Link>
          {user?.isSeller && <Link to="/seller/products/new">Add a product</Link>}
        </div>
        <div>
          <h4>Let Us Help You</h4>
          <Link to="/orders">Your orders</Link>
          <Link to="/account">Your account</Link>
          <span>Cash on delivery only</span>
        </div>
        <div>
          <h4>Delivery</h4>
          <span>Yerevan and all 10 marzer</span>
          <span>Prices in Armenian dram (֏)</span>
        </div>
      </div>
      <div className="footer-bottom">
        <Logo />
        <div className="small">© {new Date().getFullYear()} Shuka — a student marketplace project. Payment: cash on delivery.</div>
      </div>
    </footer>
  );
}
