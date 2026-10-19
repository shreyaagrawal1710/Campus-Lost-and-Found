import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Home from './pages/Home.jsx';
import ReportItem from './pages/ReportItem.jsx';
import ItemDetails from './pages/ItemDetails.jsx';
import ClaimItem from './pages/ClaimItem.jsx';
import MyActivity from './pages/MyActivity.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import ManageClaims from './pages/ManageClaims.jsx';

// Hides pages from the wrong people in the UI. The backend still enforces this for real.
function Guard({ admin, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== 'ADMIN') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <Navbar />
      <main className="page">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Guard><Home /></Guard>} />
          <Route path="/report/:type" element={<Guard><ReportItem /></Guard>} />
          <Route path="/items/:id" element={<Guard><ItemDetails /></Guard>} />
          <Route path="/items/:id/claim" element={<Guard><ClaimItem /></Guard>} />
          <Route path="/my" element={<Guard><MyActivity /></Guard>} />
          <Route path="/admin" element={<Guard admin><AdminDashboard /></Guard>} />
          <Route path="/admin/claims" element={<Guard admin><ManageClaims /></Guard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
