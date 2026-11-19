import { Link } from 'react-router-dom';
import { get } from '../api.js';
import { useCategories } from '../context/CategoriesContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ProductGrid, ProductGridSkeleton, useLoad, useTitle, ErrorState, TruckIcon, CashIcon, StoreIcon, ShieldIcon } from '../components/ui.jsx';

const CAT_EMOJI = {
  electronics: '🎧', phones: '📱', computers: '💻', 'home-kitchen': '🍳', fashion: '👟',
  beauty: '🧴', sports: '🏋️', toys: '🧸', books: '📚', food: '🍷',
};

export default function Home() {
  useTitle(null);
  const { user } = useAuth();
  const categories = useCategories();
  const newest = useLoad(() => get('/products?sort=newest&limit=12'), []);
  const top = useLoad(() => get('/products?sort=rating&limit=6'), []);

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-inner container">
          <div className="hero-text">
            <span className="hero-kicker">Armenia's marketplace</span>
            <h1>Everything from local sellers, delivered to your door</h1>
            <p>Shop electronics, home goods, fashion and Armenian treats from sellers across Yerevan and the marzer. Pay in cash when it arrives.</p>
            <div className="hero-cta">
              <Link to="/search" className="btn btn-cart btn-lg">Shop all products</Link>
              <Link to={user?.isSeller ? '/seller' : '/sell'} className="btn btn-ghost-light btn-lg">{user?.isSeller ? 'Seller dashboard' : 'Start selling'}</Link>
            </div>
          </div>
          <div className="hero-perks">
            <div><TruckIcon size={26} /><span><strong>Delivery across Armenia</strong>Yerevan + 10 marzer</span></div>
            <div><CashIcon size={26} /><span><strong>Cash on delivery</strong>Pay when you receive</span></div>
            <div><StoreIcon size={26} /><span><strong>Local sellers</strong>One cart, many shops</span></div>
            <div><ShieldIcon size={26} /><span><strong>Real reviews</strong>Only from verified buyers</span></div>
          </div>
        </div>
      </section>

      <div className="container home-body">
        <section className="card-panel">
          <div className="panel-head">
            <h2>Shop by category</h2>
            <Link to="/search">See all products</Link>
          </div>
          <div className="cat-tiles">
            {categories.map((c) => (
              <Link key={c.slug} to={`/c/${c.slug}`} className="cat-tile">
                <span className="cat-emoji" aria-hidden="true">{CAT_EMOJI[c.slug] || '🛍️'}</span>
                <span className="cat-name">{c.name}</span>
                <span className="cat-count">{c.productCount} items</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="card-panel">
          <div className="panel-head">
            <h2>New arrivals</h2>
            <Link to="/search?sort=newest">See more</Link>
          </div>
          {newest.error ? <ErrorState error={newest.error} onRetry={newest.reload} />
            : newest.loading ? <ProductGridSkeleton n={12} /> : <ProductGrid items={newest.data.items} />}
        </section>

        <section className="card-panel">
          <div className="panel-head">
            <h2>Top rated by buyers</h2>
            <Link to="/search?sort=rating">See more</Link>
          </div>
          {top.loading ? <ProductGridSkeleton n={6} /> : top.data ? <ProductGrid items={top.data.items} /> : null}
        </section>
      </div>
    </div>
  );
}
