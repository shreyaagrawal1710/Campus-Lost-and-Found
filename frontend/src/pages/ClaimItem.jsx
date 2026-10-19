import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { ErrorMsg, Loading } from '../components/Feedback.jsx';

export default function ClaimItem() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [desc, setDesc] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api(`/items/${id}`).then(setItem).catch((e) => setError(e.message)); }, [id]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (desc.trim().length < 10) return setError('Please give more detail so an administrator can verify ownership.');
    setBusy(true);
    try { await api(`/items/${id}/claims`, { method: 'POST', body: { private_description: desc.trim() } }); setDone(true); }
    catch (err) { setError(err.message); } // e.g. duplicate active claim
    finally { setBusy(false); }
  };

  if (!item && !error) return <Loading />;
  if (done) return (
    <div className="card narrow">
      <h1>Claim submitted</h1>
      <p>Your claim is <span className="badge s-pending">pending</span>. An administrator will review it. Track it under My activity.</p>
      <Link className="btn primary" to="/my">Go to my activity</Link>
    </div>
  );

  return (
    <form className="card form narrow" onSubmit={submit}>
      <h1>Claim this item</h1>
      {item && <p className="muted">You are claiming <strong>{item.item_name}</strong> ({item.category_name}, found at {item.location_name}).</p>}
      <ErrorMsg error={error} />
      <label>How can you prove it's yours?
        <textarea rows={5} value={desc} onChange={(e) => setDesc(e.target.value)}
          placeholder="Describe something only the owner would know, such as marks, contents or stickers." />
      </label>
      <p className="muted">Only administrators can read this. It is never shown on the public page.</p>
      <button className="btn primary" disabled={busy}>{busy ? 'Submitting…' : 'Submit claim'}</button>
    </form>
  );
}
