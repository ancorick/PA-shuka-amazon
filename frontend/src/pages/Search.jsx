import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { get } from '../api.js';
import { useCategories } from '../context/CategoriesContext.jsx';
import { ProductGrid, ProductGridSkeleton, Pagination, useLoad, useTitle, ErrorState, EmptyState, Stars } from '../components/ui.jsx';

const SORTS = [
  ['newest', 'Newest arrivals'],
  ['price_asc', 'Price: Low to High'],
  ['price_desc', 'Price: High to Low'],
  ['rating', 'Avg. Customer Review'],
];

const PRICE_PRESETS = [
  [null, 10000, 'Under 10,000 ֏'],
  [10000, 50000, '10,000 to 50,000 ֏'],
  [50000, 200000, '50,000 to 200,000 ֏'],
  [200000, null, '200,000 ֏ & above'],
];

export default function Search() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const categories = useCategories();

  // On /c/:slug the category comes from the path; elsewhere from ?category=
  const category = slug || params.get('category') || '';
  const q = params.get('q') || '';
  const minPrice = params.get('minPrice') || '';
  const maxPrice = params.get('maxPrice') || '';
  const sort = params.get('sort') || 'newest';
  const page = Number(params.get('page')) || 1;

  const [minIn, setMinIn] = useState(minPrice);
  const [maxIn, setMaxIn] = useState(maxPrice);
  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => { setMinIn(minPrice); setMaxIn(maxPrice); }, [minPrice, maxPrice]);

  const qs = new URLSearchParams();
  if (q) qs.set('q', q);
  if (category) qs.set('category', category);
  if (minPrice) qs.set('minPrice', minPrice);
  if (maxPrice) qs.set('maxPrice', maxPrice);
  qs.set('sort', sort);
  qs.set('page', String(page));
  const key = qs.toString();

  const res = useLoad(() => get(`/products?${key}`), [key]);
  const catObj = categories.find((c) => c.slug === category);
  useTitle(q ? `Results for "${q}"` : catObj ? catObj.name : 'All products');

  /** Updates the URL (so a search can be shared). On /c/:slug it moves to /search when needed. */
  function update(changes) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v === '' || v === null || v === undefined) next.delete(k);
      else next.set(k, String(v));
    }
    if (!('page' in changes)) next.delete('page');
    // On a category page (/c/:slug) only the query string changes; the category stays in the path.
    if (slug && 'category' in changes) {
      const cat = next.get('category');
      next.delete('category');
      const rest = next.toString();
      navigate(cat ? `/c/${cat}${rest ? `?${rest}` : ''}` : `/search${rest ? `?${rest}` : ''}`);
      return;
    }
    setParams(next);
  }

  const goCategory = (s) => update({ category: s });

  function applyPrice(e) {
    e?.preventDefault();
    update({ minPrice: minIn.replace(/\D/g, ''), maxPrice: maxIn.replace(/\D/g, '') });
    setFiltersOpen(false);
  }

  const data = res.data;
  const from = data ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.total, data.page * data.pageSize) : 0;
  const hasFilters = q || category || minPrice || maxPrice;

  return (
    <div className="search-page">
      <div className="results-bar">
        <div className="container results-bar-inner">
          <div>
            {data ? (
              data.total > 0
                ? <span>{from}-{to} of {data.total.toLocaleString('en-US')} results{q && <> for <span className="q-highlight">"{q}"</span></>}{catObj && <> in <strong>{catObj.name}</strong></>}</span>
                : <span>No results{q && <> for <span className="q-highlight">"{q}"</span></>}</span>
            ) : <span className="muted">Searching…</span>}
          </div>
          <div className="results-actions">
            <button className="btn btn-secondary btn-sm filters-toggle" onClick={() => setFiltersOpen((o) => !o)}>Filters</button>
            <label className="sort-select">
              <span>Sort by:</span>
              <select value={sort} onChange={(e) => update({ sort: e.target.value })}>
                {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="container search-layout">
        <aside className={`filters ${filtersOpen ? 'open' : ''}`}>
          <div className="filter-block">
            <h3>Department</h3>
            <button className={`filter-link ${!category ? 'active' : ''}`} onClick={() => goCategory('')}>All departments</button>
            {categories.map((c) => (
              <button key={c.slug} className={`filter-link ${category === c.slug ? 'active' : ''}`} onClick={() => goCategory(c.slug)}>
                {c.name}
              </button>
            ))}
          </div>
          <div className="filter-block">
            <h3>Price</h3>
            {PRICE_PRESETS.map(([min, max, label]) => (
              <button key={label} className={`filter-link ${String(min ?? '') === minPrice && String(max ?? '') === maxPrice ? 'active' : ''}`}
                onClick={() => { update({ minPrice: min ?? '', maxPrice: max ?? '' }); setFiltersOpen(false); }}>
                {label}
              </button>
            ))}
            <form className="price-range" onSubmit={applyPrice}>
              <input inputMode="numeric" placeholder="Min ֏" value={minIn} onChange={(e) => setMinIn(e.target.value)} aria-label="Minimum price" />
              <input inputMode="numeric" placeholder="Max ֏" value={maxIn} onChange={(e) => setMaxIn(e.target.value)} aria-label="Maximum price" />
              <button className="btn btn-secondary btn-sm" type="submit">Go</button>
            </form>
          </div>
          <div className="filter-block">
            <h3>Customer Review</h3>
            <button className={`filter-link ${sort === 'rating' ? 'active' : ''}`} onClick={() => update({ sort: 'rating' })}>
              <Stars value={4} size={14} /> &amp; Up — sort by rating
            </button>
          </div>
          {hasFilters && <Link to="/search" className="clear-filters">Clear all filters</Link>}
        </aside>

        <section className="results">
          {res.error ? <ErrorState error={res.error} onRetry={res.reload} />
            : res.loading && !data ? <ProductGridSkeleton n={12} />
              : data.total === 0 ? (
                <EmptyState title="No results found" action={<Link to="/search" className="btn btn-cart">See all products</Link>}>
                  {q ? <>We couldn't find anything for "{q}". Try different words or remove filters.</> : 'No products match these filters.'}
                </EmptyState>
              ) : (
                <>
                  <h2 className="results-title">Results</h2>
                  <div className={res.loading ? 'is-reloading' : ''}><ProductGrid items={data.items} /></div>
                  <Pagination page={data.page} pages={data.pages} onPage={(p) => { update({ page: p }); window.scrollTo(0, 0); }} />
                </>
              )}
        </section>
      </div>
    </div>
  );
}
