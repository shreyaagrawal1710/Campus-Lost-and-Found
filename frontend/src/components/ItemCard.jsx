import { Link } from 'react-router-dom';
import { fmtDate } from '../api.js';

export const StatusBadge = ({ status }) => (
  <span className={`badge s-${(status || '').toLowerCase()}`}>{(status || '').replace('_', ' ').toLowerCase()}</span>
);

export default function ItemCard({ item }) {
  const lost = item.report_type === 'LOST';
  return (
    <article className={`card item ${lost ? 'is-lost' : 'is-found'}`}>
      <div className="tagline">
        <span className={`type ${lost ? 'lost' : 'found'}`}>{lost ? 'Lost' : 'Found'}</span>
        <StatusBadge status={item.status} />
      </div>
      <h3>{item.item_name}</h3>
      <dl>
        <dt>Category</dt><dd>{item.category_name}</dd>
        <dt>Location</dt><dd>{item.location_name}</dd>
        <dt>Date</dt><dd>{fmtDate(item.item_date)}</dd>
      </dl>
      <Link className="btn" to={`/items/${item.item_id}`}>View details</Link>
    </article>
  );
}
