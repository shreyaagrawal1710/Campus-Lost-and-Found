import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmtDate } from '../api.js';
import { ErrorMsg, Loading, Empty } from '../components/Feedback.jsx';

const CARDS = [
  ['total_items', 'Total reports'],
  ['open_items', 'Open reports'],
  ['pending_claims', 'Pending claims'],
  ['returned_items', 'Returned items'],
  ['unclaimed_found', 'Unclaimed found items'],
];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api('/admin/stats'), api('/admin/claims?status=PENDING')])
      .then(([s, c]) => { setStats(s); setPending(c); })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorMsg error={error} />;
  if (!stats || !pending) return <Loading />;

  return (
    <>
      <h1>Dashboard</h1>
      <div className="stats">
        {CARDS.map(([k, label]) => (
          <div className="card stat" key={k}><strong>{stats[k] ?? 0}</strong><span>{label}</span></div>
        ))}
      </div>
      <div className="row between"><h2>Pending claims</h2><Link className="btn" to="/admin/claims">Manage claims</Link></div>
      {pending.length === 0 ? <Empty>No claims are waiting for review.</Empty> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Claim</th><th>Item</th><th>Claimant</th><th>Submitted</th></tr></thead>
          <tbody>{pending.map((c) => (
            <tr key={c.claim_id}><td>#{c.claim_id}</td><td>{c.item_name}</td><td>{c.claimant_name}</td><td>{fmtDate(c.created_at)}</td></tr>
          ))}</tbody>
        </table></div>
      )}
    </>
  );
}
