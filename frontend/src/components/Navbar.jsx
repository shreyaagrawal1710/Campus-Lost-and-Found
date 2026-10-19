import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <header className="nav">
      <NavLink to="/" className="brand">Campus Lost &amp; Found</NavLink>
      <nav>
        {user && <NavLink to="/" end>Browse</NavLink>}
        {user && <NavLink to="/my">My activity</NavLink>}
        {user?.role === 'ADMIN' && <NavLink to="/admin" end>Dashboard</NavLink>}
        {user?.role === 'ADMIN' && <NavLink to="/admin/claims">Claims</NavLink>}
        {user ? (
          <button className="btn ghost" onClick={() => { logout(); nav('/login'); }}>Log out</button>
        ) : (
          <>
            <NavLink to="/login">Log in</NavLink>
            <NavLink to="/register">Register</NavLink>
          </>
        )}
      </nav>
    </header>
  );
}
