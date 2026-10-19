import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { ErrorMsg } from '../components/Feedback.jsx';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (f.password.length < 6) return setError('Password must be at least 6 characters.');
    setBusy(true);
    try { await register(f.name.trim(), f.email.trim(), f.password); nav('/'); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <form className="card form narrow" onSubmit={submit}>
      <h1>Create your account</h1>
      <ErrorMsg error={error} />
      <label>Full name<input required value={f.name} onChange={set('name')} /></label>
      <label>University email<input type="email" required value={f.email} onChange={set('email')} /></label>
      <label>Password<input type="password" required value={f.password} onChange={set('password')} /></label>
      <button className="btn primary" disabled={busy}>{busy ? 'Creating…' : 'Register'}</button>
      <p className="muted">Already registered? <Link to="/login">Log in</Link></p>
    </form>
  );
}
