import { Link } from 'react-router-dom';
import { useTitle, EmptyState } from '../components/ui.jsx';

export default function NotFound() {
  useTitle('Page not found');
  return (
    <div className="container page-pad">
      <div className="card-panel">
        <EmptyState title="Sorry, we couldn't find that page" action={<Link to="/" className="btn btn-cart">Go to the homepage</Link>}>
          The link may be broken or the page may have moved.
        </EmptyState>
      </div>
    </div>
  );
}
