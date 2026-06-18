import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import MembersPage from './pages/MembersPage.jsx';
import AttendancePage from './pages/AttendancePage.jsx';
import MessagesPage from './pages/MessagesPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import CheckInPage from './pages/CheckInPage.jsx';

function App() {
  const [isAuth, setIsAuth] = useState(!!localStorage.getItem('accessToken'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  const studioId = localStorage.getItem('studioId') || '60916a67-7d4a-4c44-bb6a-d74c54354a81';

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage setIsAuth={setIsAuth} />} />
        <Route path="/checkin" element={<CheckInPage />} />
        {isAuth ? (
          <>
            <Route path="/dashboard/:studioId" element={<DashboardPage />} />
            <Route path="/dashboard/:gymId" element={<DashboardPage />} />
            <Route path="/members/:studioId" element={<MembersPage />} />
            <Route path="/members/:gymId" element={<MembersPage />} />
            <Route path="/attendance/:studioId" element={<AttendancePage />} />
            <Route path="/attendance/:gymId" element={<AttendancePage />} />
            <Route path="/messages/:studioId" element={<MessagesPage />} />
            <Route path="/messages/:gymId" element={<MessagesPage />} />
            <Route path="/settings/:studioId" element={<SettingsPage />} />
            <Route path="/settings/:gymId" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to={`/dashboard/${studioId}`} />} />
          </>
        ) : (
          <Route path="*" element={<Navigate to="/login" />} />
        )}
      </Routes>
    </Router>
  );
}

export default App;