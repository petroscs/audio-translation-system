import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';

export function AppLayout() {
  const { state, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div>
      <header
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.10)',
          background: 'rgba(255,255,255,0.04)',
        }}
      >
        <div className="container" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontWeight: 800, letterSpacing: 0.2 }}>Web Translator</div>
          <nav className="row" style={{ gap: '0.5rem', flex: 1 }}>
            <NavLink to="/events" style={{ padding: '0.35rem 0.5rem', borderRadius: 8 }}>
              Events
            </NavLink>
          </nav>
          {state.isAuthenticated ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() =>
                logout()
                  .catch(() => {})
                  .finally(() => navigate('/login'))
              }
            >
              Logout
            </button>
          ) : (
            <NavLink className="btn btn-secondary" to="/login">
              Login
            </NavLink>
          )}
        </div>
      </header>
      <main className="container" style={{ paddingTop: '1rem', paddingBottom: '2rem' }}>
        <Outlet />
      </main>
    </div>
  );
}

