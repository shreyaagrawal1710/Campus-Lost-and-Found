import { useCallback, useEffect, useState } from 'react';
import { api, fmtDate } from '../api.js';
import { StatusBadge } from '../components/ItemCard.jsx';
import { ErrorMsg, Loading, Empty } from '../components/Feedback.jsx';

export default function ManageClaims() {
  const [tab, setTab] = useState('PENDING'); // PENDING = review, APPROVED = awaiting handover
  const [claims, setClaims] = useState(null);
  const [remarks, setRemarks] = useState({});
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    setClaims(null);
    api(`/admin/claims?status=${tab}`).then(setClaims).catch((e) => { setError(e.message); setClaims([]); });
  }, [tab]);
  useEffect(() => { load(); }, [load]);

  const run = async (claim, fn, okMsg) => {
    setError(''); setMsg(''); setBusyId(claim.claim_id);
    try { await fn(); setMsg(okMsg); load(); }
    catch (e) { setError(e.message); }
    finally { setBusyId(null); }
  };

  const decide = (c, status) => run(c,
    () => api(`/admin/claims/${c.claim_id}`, { method: 'PATCH', body: { status, remarks: remarks[c.claim_id] || '' } }),
    status === 'APPROVED' ? 'Claim approved. Record the return once the item is handed over.' : 'Claim rejected.');

  const recordReturn = (c) => run(c,
    () => api(`/admin/items/${c.item_id}/return`, { method: 'POST', body: { remarks: remarks[c.claim_id] || '' } }),
    'Return recorded. The item is now marked as returned.');

  return (
    <>
      <h1>Manage claims</h1>
      <div className="tabs">
        <button className={tab === 'PENDING' ? 'on' : ''} onClick={() => setTab('PENDING')}>Needs review</button>
        <button className={tab === 'APPROVED' ? 'on' : ''} onClick={() => setTab('APPROVED')}>Approved, awaiting handover</button>
      </div>
      <ErrorMsg error={error} />
      {msg && <div className="alert ok" role="status">{msg}</div>}
      {!claims ? <Loading /> : claims.length === 0 ? (
        <Empty>{tab === 'PENDING' ? 'No claims are waiting for review.' : 'No approved claims are waiting for handover.'}</Empty>
      ) : (
        <div className="stack">{claims.map((c) => (
          <article className="card claim" key={c.claim_id}>
            <div className="row between wrap">
              <h3>Claim #{c.claim_id}: {c.item_name}</h3><StatusBadge status={c.status} />
            </div>
            <dl>
              <dt>Item</dt><dd>#{c.item_id}, {c.category_name}, {c.location_name}</dd>
              <dt>Claimant</dt><dd>{c.claimant_name} ({c.claimant_email})</dd>
              <dt>Submitted</dt><dd>{fmtDate(c.created_at)}</dd>
            </dl>
            <blockquote>{c.private_description}</blockquote>
            <div className="row gap wrap">
              <input className="grow" placeholder="Remarks (optional)" value={remarks[c.claim_id] || ''}
                onChange={(e) => setRemarks({ ...remarks, [c.claim_id]: e.target.value })} />
              {tab === 'PENDING' ? (
                <>
                  <button className="btn primary" disabled={busyId === c.claim_id} onClick={() => decide(c, 'APPROVED')}>Approve</button>
                  <button className="btn danger" disabled={busyId === c.claim_id} onClick={() => decide(c, 'REJECTED')}>Reject</button>
                </>
              ) : (
                <button className="btn primary" disabled={busyId === c.claim_id} onClick={() => recordReturn(c)}>Record return</button>
              )}
            </div>
          </article>
        ))}</div>
      )}
    </>
  );
}
