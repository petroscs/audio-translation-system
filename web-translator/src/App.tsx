import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import EventsPage from './pages/EventsPage';
import ChannelsPage from './pages/ChannelsPage';
import DashboardPage from './pages/DashboardPage';
import { RequireAuth } from './routes/RequireAuth';
import { AppLayout } from './ui/AppLayout';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/events" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/events"
          element={
            <RequireAuth>
              <EventsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/events/:eventId/channels"
          element={
            <RequireAuth>
              <ChannelsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/:sessionId"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/events" replace />} />
      </Route>
    </Routes>
  );
}
