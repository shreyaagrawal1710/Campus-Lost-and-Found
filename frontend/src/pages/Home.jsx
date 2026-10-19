import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import ItemCard from '../components/ItemCard.jsx';
import { ErrorMsg, Loading, Empty } from '../components/Feedback.jsx';

const blank = { q: '', report_type: '', category_id: '', location_id: '', date_from: '', date_to: '', status: '' };

export default function Home() {
  const [filters, setFilters] = useState(blank);
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [locs, setLocs] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api('/categories'), api('/locations')])
      .then(([c, l]) => { setCats(c); setLocs(l); })
      .catch((e) => setError(e.message));
  }, []);

  // Re-fetch whenever a filter changes (search waits 300ms after typing stops).
  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true); setError('');
      const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
      try { setItems(await api('/items' + (qs ? `?${qs}` : ''))); }
      catch (e) { setError(e.message); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [filters]);

  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

  return (
    <>
      <div className="row between wrap gap">
        <h1>Browse reports</h1>
        <div className="row gap wrap">
          <Link className="btn lost" to="/report/LOST">Report a lost item</Link>
          <Link className="btn found" to="/report/FOUND">Report a found item</Link>
        </div>
      </div>

      <section className="filters card">
        <input className="grow" placeholder="Search by item name or description" value={filters.q} onChange={set('q')} />
        <select value={filters.report_type} onChange={set('report_type')}>
          <option value="">Lost &amp; found</option><option value="LOST">Lost</option><option value="FOUND">Found</option>
        </select>
        <select value={filters.category_id} onChange={set('category_id')}>
          <option value="">All categories</option>
          {cats.map((c) => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
        </select>
        <select value={filters.location_id} onChange={set('location_id')}>
          <option value="">All locations</option>
          {locs.map((l) => <option key={l.location_id} value={l.location_id}>{l.location_name}</option>)}
        </select>
        <select value={filters.status} onChange={set('status')}>
          <option value="">Any status</option>
          <option value="OPEN">Open</option><option value="CLAIM_PENDING">Claim pending</option>
          <option value="RETURNED">Returned</option><option value="CLOSED">Closed</option>
        </select>
        <label className="inline">From <input type="date" value={filters.date_from} onChange={set('date_from')} /></label>
        <label className="inline">To <input type="date" value={filters.date_to} onChange={set('date_to')} /></label>
        <button className="btn ghost" onClick={() => setFilters(blank)}>Clear</button>
      </section>

      <ErrorMsg error={error} />
      {loading ? <Loading /> : items.length === 0 ? (
        <Empty>No reports match these filters. Try clearing a filter or report the item yourself.</Empty>
      ) : (
        <div className="grid">{items.map((i) => <ItemCard key={i.item_id} item={i} />)}</div>
      )}
    </>
  );
}
