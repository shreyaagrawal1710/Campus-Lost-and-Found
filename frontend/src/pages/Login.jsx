import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { ErrorMsg } from '../components/Feedback.jsx';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try { await login(f.email, f.password); nav('/'); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <form className="card form narrow" onSubmit={submit}>
      <h1>Log in</h1>
      <ErrorMsg error={error} />
      <label>University email
        <input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      </label>
      <label>Password
        <input type="password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
      </label>
      <button className="btn primary" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      <p className="muted">New here? <Link to="/register">Create an account</Link></p>
    </form>
  );
}
