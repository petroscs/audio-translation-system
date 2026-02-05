import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'nav-link active' : 'nav-link';

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside
        style={{
          width: 220,
          background: '#1e293b',
          color: '#fff',
          padding: '1rem 0',
          flexShrink: 0,
        }}
      >
        <div style={{ padding: '0 1rem 1rem', fontWeight: 600, fontSize: '1.1rem' }}>
          Admin Dashboard
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column' }}>
          <NavLink to="/" end className={navClass} style={navLinkStyle}>
            Dashboard
          </NavLink>
          <NavLink to="/users" className={navClass} style={navLinkStyle}>
            Users
          </NavLink>
          <NavLink to="/events" className={navClass} style={navLinkStyle}>
            Events
          </NavLink>
          <NavLink to="/sessions" className={navClass} style={navLinkStyle}>
            Sessions
          </NavLink>
          <NavLink to="/recordings" className={navClass} style={navLinkStyle}>
            Recordings
          </NavLink>
        </nav>
        <div style={{ marginTop: 'auto', padding: '1rem' }}>
          <button
            type="button"
            onClick={handleLogout}
            className="btn btn-secondary"
            style={{ width: '100%', color: '#1e293b' }}
          >
            Logout
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: '1.5rem', overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}

const navLinkStyle: React.CSSProperties = {
  padding: '0.6rem 1rem',
  color: 'rgba(255,255,255,0.8)',
  textDecoration: 'none',
};
