import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmtDate } from '../api.js';
import { StatusBadge } from '../components/ItemCard.jsx';
import { ErrorMsg, Loading, Empty } from '../components/Feedback.jsx';

export default function MyActivity() {
  const [items, setItems] = useState(null);
  const [claims, setClaims] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api('/my/items'), api('/my/claims')])
      .then(([i, c]) => { setItems(i); setClaims(c); })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorMsg error={error} />;
  if (!items || !claims) return <Loading />;

  return (
    <>
      <h1>My activity</h1>
      <h2>My reports</h2>
      {items.length === 0 ? <Empty>You haven't reported anything yet.</Empty> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Item</th><th>Type</th><th>Category</th><th>Date</th><th>Status</th></tr></thead>
          <tbody>{items.map((i) => (
            <tr key={i.item_id}>
              <td><Link to={`/items/${i.item_id}`}>{i.item_name}</Link></td>
              <td>{i.report_type}</td><td>{i.category_name}</td><td>{fmtDate(i.item_date)}</td>
              <td><StatusBadge status={i.status} /></td>
            </tr>))}</tbody>
        </table></div>
      )}

      <h2>My claims</h2>
      {claims.length === 0 ? <Empty>You haven't claimed any items yet.</Empty> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Item</th><th>Submitted</th><th>Claim status</th><th>Item status</th><th>Admin decision</th></tr></thead>
          <tbody>{claims.map((c) => (
            <tr key={c.claim_id}>
              <td><Link to={`/items/${c.item_id}`}>{c.item_name}</Link></td>
              <td>{fmtDate(c.created_at)}</td>
              <td><StatusBadge status={c.status} /></td>
              <td>{c.item_status ? <StatusBadge status={c.item_status} /> : '—'}</td>
              <td>{c.admin_remarks || (c.status === 'PENDING' ? 'Waiting for review' : '—')}</td>
            </tr>))}</tbody>
        </table></div>
      )}
    </>
  );
}
