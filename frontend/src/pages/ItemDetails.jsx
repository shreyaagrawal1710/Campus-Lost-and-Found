import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, fmtDate } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { StatusBadge } from '../components/ItemCard.jsx';
import { ErrorMsg, Loading } from '../components/Feedback.jsx';

export default function ItemDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api(`/items/${id}`).then(setItem).catch((e) => setError(e.message)); }, [id]);

  if (error) return <ErrorMsg error={error} />;
  if (!item) return <Loading />;

  const mine = item.reporter_id === user.id;
  const canClaim = item.report_type === 'FOUND' && item.status === 'OPEN' && !mine;
  let note = '';
  if (item.report_type === 'LOST') note = 'This is a lost-item report. If you found this item, file a found report so the owner can claim it.';
  else if (mine) note = 'This is your report. Other students can claim it and an administrator will review their claims.';
  else if (item.status !== 'OPEN') note = 'This item can no longer be claimed.';

  return (
    <article className="card detail">
      <div className="tagline">
        <span className={`type ${item.report_type === 'LOST' ? 'lost' : 'found'}`}>{item.report_type === 'LOST' ? 'Lost' : 'Found'}</span>
        <StatusBadge status={item.status} />
      </div>
      <h1>{item.item_name}</h1>
      <p>{item.description}</p>
      <dl>
        <dt>Category</dt><dd>{item.category_name}</dd>
        <dt>Location</dt><dd>{item.location_name}</dd>
        <dt>Date</dt><dd>{fmtDate(item.item_date)}</dd>
        <dt>Reported by</dt><dd>{item.reporter_name}</dd>
      </dl>
      {note && <p className="muted">{note}</p>}
      <div className="row gap wrap">
        {canClaim && <Link className="btn primary" to={`/items/${item.item_id}/claim`}>Claim this item</Link>}
        <Link className="btn ghost" to="/">Back to browse</Link>
      </div>
    </article>
  );
}
