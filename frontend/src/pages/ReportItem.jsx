import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { ErrorMsg } from '../components/Feedback.jsx';

export default function ReportItem() {
  const { type } = useParams(); // LOST or FOUND
  const nav = useNavigate();
  const reportType = type === 'FOUND' ? 'FOUND' : 'LOST';
  const [cats, setCats] = useState([]);
  const [locs, setLocs] = useState([]);
  const [f, setF] = useState({ item_name: '', category_id: '', description: '', location_id: '', item_date: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    Promise.all([api('/categories'), api('/locations')])
      .then(([c, l]) => { setCats(c); setLocs(l); })
      .catch((e) => setError(e.message));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!f.item_name.trim() || !f.description.trim()) return setError('Item name and description are required.');
    setBusy(true);
    try {
      const created = await api('/items', {
        method: 'POST',
        body: { ...f, item_name: f.item_name.trim(), description: f.description.trim(),
                category_id: Number(f.category_id), location_id: Number(f.location_id), report_type: reportType },
      });
      nav(`/items/${created.item_id}`);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <form className="card form narrow" onSubmit={submit}>
      <h1>Report a {reportType === 'LOST' ? 'lost' : 'found'} item</h1>
      <ErrorMsg error={error} />
      <label>Item name<input required value={f.item_name} onChange={set('item_name')} placeholder="e.g. Black wallet" /></label>
      <label>Category
        <select required value={f.category_id} onChange={set('category_id')}>
          <option value="">Choose a category</option>
          {cats.map((c) => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
        </select>
      </label>
      <label>Description
        <textarea required rows={4} value={f.description} onChange={set('description')}
          placeholder={reportType === 'FOUND' ? 'Describe it in general terms. Keep identifying details private so the real owner can prove they know them.' : 'Colour, brand, size, anything that helps.'} />
      </label>
      <label>Campus location
        <select required value={f.location_id} onChange={set('location_id')}>
          <option value="">Choose a location</option>
          {locs.map((l) => <option key={l.location_id} value={l.location_id}>{l.location_name}</option>)}
        </select>
      </label>
      <label>Date {reportType === 'LOST' ? 'lost' : 'found'}
        <input required type="date" max={today} value={f.item_date} onChange={set('item_date')} />
      </label>
      <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save report'}</button>
    </form>
  );
}
