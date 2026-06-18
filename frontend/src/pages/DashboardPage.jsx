import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import AdminLayout from '../components/AdminLayout.jsx';
import '../components/styles/Dashboard.css';

export default function DashboardPage() {
  const { gymId, studioId } = useParams();
  const activeId = studioId || gymId;
  const navigate = useNavigate();
  const [liveTime, setLiveTime] = useState(new Date());

  const getDaysDiff = (expiryDateStr) => {
    const expiry = new Date(expiryDateStr);
    expiry.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.round((expiry - now) / (1000 * 60 * 60 * 24));
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Core metrics & charts
  const [stats, setStats] = useState({
    totalMembers: 0,
    todayCheckins: 0,
    expiringSoon: 0,
    expired: 0,
    monthlyRevenue: '₹0K'
  });
  const [recentCheckins, setRecentCheckins] = useState([]);
  const [weeklyAttendance, setWeeklyAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Sidebar: Manual Check-in search state
  const [manualQuery, setManualQuery] = useState('');
  const [manualResults, setManualResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  // Sidebar: Alerts & Lists state
  const [expiringMembers, setExpiringMembers] = useState([]);
  const [expiredMembers, setExpiredMembers] = useState([]);
  const [recentJoined, setRecentJoined] = useState([]);

  // Fetch Core Dashboard metrics
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await api.get(`/dashboard/${activeId}`);
      if (data.success) {
        setStats(data.stats);
        setRecentCheckins(data.recentCheckins || []);
        setWeeklyAttendance(data.weeklyAttendance || []);
      }
    } catch (err) {
      setError('Unable to fetch live workspace metrics.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch expiring members for the alert card
  const fetchExpiringMembers = async () => {
    try {
      const { data } = await api.get(`/members/${activeId}`, {
        params: { status: 'expiring', limit: 15 }
      });
      if (data.success) {
        const sorted = (data.members || [])
          .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date))
          .slice(0, 5);
        setExpiringMembers(sorted);
      }
    } catch (err) {
      console.warn('Could not fetch expiring members:', err);
    }
  };

  // Fetch expired members for the alert card
  const fetchExpiredMembers = async () => {
    try {
      const { data } = await api.get(`/members/${activeId}`, {
        params: { status: 'expired', limit: 15 }
      });
      if (data.success) {
        const sorted = (data.members || [])
          .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date))
          .slice(0, 5);
        setExpiredMembers(sorted);
      }
    } catch (err) {
      console.warn('Could not fetch expired members:', err);
    }
  };

  // Fetch recently joined members
  const fetchRecentJoined = async () => {
    try {
      const { data } = await api.get(`/members/${activeId}`, {
        params: { limit: 5 }
      });
      if (data.success) {
        setRecentJoined(data.members || []);
      }
    } catch (err) {
      console.warn('Could not fetch recently joined members:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchExpiringMembers();
    fetchExpiredMembers();
    fetchRecentJoined();
  }, [activeId]);

  // Handle live search for Manual Check-In as query changes
  useEffect(() => {
    if (manualQuery.trim().length < 2) {
      setManualResults([]);
      return;
    }

    const searchDelay = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const { data } = await api.get(`/members/${activeId}`, {
          params: { search: manualQuery.trim(), status: 'active', limit: 5 }
        });
        if (data.success) {
          setManualResults(data.members || []);
        }
      } catch (err) {
        console.warn('Search query failed:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchDelay);
  }, [manualQuery, activeId]);

  // Mark member as present manually
  const handleManualCheckIn = async (member) => {
    setError('');
    setSuccessToast('');
    try {
      const { data } = await api.post(`/attendance/${activeId}/mark-present`, {
        memberId: member.id
      });
      if (data.success) {
        setSuccessToast(`Successfully checked in ${member.full_name}!`);
        setManualQuery('');
        setManualResults([]);
        fetchDashboardData(); // Refresh list & counts
        setTimeout(() => setSuccessToast(''), 4000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to check in member.');
    }
  };

  // Helper to extract initials
  const getInitials = (name) => {
    if (!name) return 'M';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <AdminLayout>
      <div className="dashboard-container">
        
        {/* Header */}
        <div className="dashboard-header">
          <div>
            <h1>Dashboard</h1>
            <p className="header-subtitle">Welcome back, Gym Manager! 👋</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            {/* Real-time Live Studio Status Widget */}
            <div className="live-studio-card">
              <div className="live-studio-main">
                {/* Left Side: Animated Clock Icon */}
                <div className="live-clock-icon-container">
                  <div className="live-clock-icon-bg">
                    <span className="material-symbols-outlined live-clock-icon">schedule</span>
                    <span className="live-clock-pulse"></span>
                    <span className="live-clock-dot"></span>
                  </div>
                </div>
                
                {/* Middle Side: Date & Time Info */}
                <div className="live-studio-details">
                  <div className="live-studio-day">
                    {liveTime.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()}
                  </div>
                  <div className="live-studio-date">
                    {liveTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div className="live-studio-time">
                    {liveTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                  </div>
                </div>

                {/* Right Side: LIVE Badge & Studio Status */}
                <div className="live-studio-status-col">
                  <div className="live-pulse-badge">
                    <span className="live-badge-glow"></span>
                    <span className="live-badge-dot"></span>
                    LIVE
                  </div>
                  <div className="live-status-indicator">
                    <span className="status-dot-active"></span>
                    Studio Open
                  </div>
                  <div className="live-status-mini-grid">
                    <div className="mini-status-item">
                      <span className="mini-label">Check-ins</span>
                      <span className="mini-val">{stats.todayCheckins || 0}</span>
                    </div>
                    <div className="mini-status-item">
                      <span className="mini-label">Active</span>
                      <span className="mini-val">{(stats.totalMembers || 0) - (stats.expired || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Bottom Strip */}
              <div className="live-studio-footer">
                <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>sync</span>
                Attendance system synced • Auto-refresh active
              </div>
            </div>

            <button 
              onClick={fetchDashboardData} 
              className="btn btn-secondary"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div style={{ backgroundColor: '#FEE2E2', color: '#EF4444', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 650, border: '1px solid #FCA5A5' }}>
            <span className="material-symbols-outlined">warning</span>
            {error}
          </div>
        )}

        {successToast && (
          <div style={{ backgroundColor: '#D1FAE5', color: '#065F46', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 650, border: '1px solid #A7F3D0' }}>
            <span className="material-symbols-outlined">check_circle</span>
            {successToast}
          </div>
        )}

        {/* Stats Grid */}
        <div className="stats-grid">
          {/* Today Check-ins */}
          <div className="stat-card" onClick={() => navigate(`/attendance/${activeId}`)} style={{ cursor: 'pointer' }}>
            <div className="stat-card-header">
              <span className="stat-label">Today's Entries</span>
              <div className="stat-icon-wrapper stat-theme-today">
                <span className="material-symbols-outlined">group</span>
              </div>
            </div>
            <div>
              <p className="stat-value">{stats.todayCheckins}</p>
              <p className="stat-trend positive">↑ Live Now</p>
            </div>
          </div>

          {/* Total Members */}
          <div className="stat-card" onClick={() => navigate(`/members/${activeId}?status=all`)} style={{ cursor: 'pointer' }}>
            <div className="stat-card-header">
              <span className="stat-label">Total Members</span>
              <div className="stat-icon-wrapper stat-theme-members">
                <span className="material-symbols-outlined">badge</span>
              </div>
            </div>
            <div>
              <p className="stat-value">{stats.totalMembers}</p>
              <p className="stat-trend neutral">→ Stable</p>
            </div>
          </div>

          {/* Expiring Soon */}
          <div className="stat-card" onClick={() => navigate(`/members/${activeId}?status=expiring`)} style={{ cursor: 'pointer' }}>
            <div className="stat-card-header">
              <span className="stat-label">Expiring Soon</span>
              <div className="stat-icon-wrapper stat-theme-expiring">
                <span className="material-symbols-outlined">pending_actions</span>
              </div>
            </div>
            <div>
              <p className="stat-value">{stats.expiringSoon}</p>
              <p className="stat-trend negative">↓ Alert Pending</p>
            </div>
          </div>

          {/* Expired Members */}
          <div className="stat-card" onClick={() => navigate(`/members/${activeId}?status=expired`)} style={{ cursor: 'pointer' }}>
            <div className="stat-card-header">
              <span className="stat-label">Expired Members</span>
              <div className="stat-icon-wrapper stat-theme-expired">
                <span className="material-symbols-outlined">cancel</span>
              </div>
            </div>
            <div>
              <p className="stat-value" style={{ color: '#EF4444' }}>{stats.expired || 0}</p>
              <p className="stat-trend negative" style={{ color: '#991B1B', backgroundColor: '#FEE2E2' }}>↓ Action Required</p>
            </div>
          </div>
        </div>

        {/* Main Dashboard Layout Grid */}
        <div className="dashboard-grid">
          
          {/* Real-time Feeds (Left Column) */}
          <div className="dashboard-section">
            <h2>
              <span>Real-time Check-ins</span>
              <span className="dashboard-section-subtitle" style={{ display: 'block' }}>Monitoring today's entry requests</span>
            </h2>
            <div className="attendance-feed">
              {loading ? (
                Array(4).fill(0).map((_, i) => (
                  <div key={i} className="feed-item" style={{ height: '68px', opacity: 0.5 }}>
                    <div className="feed-item-avatar"></div>
                    <div className="feed-item-content">
                      <div style={{ width: '40%', height: '12px', background: '#E2E8F0', borderRadius: '4px' }}></div>
                      <div style={{ width: '20%', height: '10px', background: '#F1F5F9', borderRadius: '4px', marginTop: '0.25rem' }}></div>
                    </div>
                  </div>
                ))
              ) : recentCheckins.length === 0 ? (
                <div className="feed-empty">
                  <span className="material-symbols-outlined" style={{ fontSize: '42px', color: '#CBD5E1' }}>fingerprint</span>
                  <p>No check-ins logged today yet.</p>
                </div>
              ) : (
                recentCheckins.map((checkin) => (
                  <div key={checkin.id} className="feed-item">
                    <div className="feed-item-avatar">
                      <span className="avatar-initials">{getInitials(checkin.name)}</span>
                    </div>
                    <div className="feed-item-content">
                      <p className="feed-item-name">{checkin.name}</p>
                      <p className="feed-item-time">
                        <span className="material-symbols-outlined" style={{ fontSize: '13px', verticalAlign: 'middle', marginRight: '2px' }}>schedule</span>
                        {checkin.time} • Today
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span className={`status-badge ${
                        checkin.status === 'active' 
                          ? 'status-active' 
                          : checkin.status === 'expiring'
                            ? 'status-expiring'
                            : 'status-expired'
                      }`}>
                        {checkin.status}
                      </span>
                      <span className="feed-item-badge">✓</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Weekly Attendance Chart */}
            <div style={{ marginTop: '2rem', borderTop: '1px solid #F1F5F9', paddingTop: '1.5rem' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', fontFamily: 'Sora, sans-serif' }}>Weekly Performance</h3>
                <p style={{ fontSize: '11px', color: '#64748B', margin: '0.2rem 0 0 0' }}>Attendance count trend over last 7 days</p>
              </div>
              <div className="chart-bars-container">
                {weeklyAttendance.map((item, idx) => {
                  const maxCount = Math.max(...weeklyAttendance.map(w => w.count), 1);
                  const pct = Math.round((item.count / maxCount) * 120); // Scale nicely
                  const isHighest = item.count === maxCount && item.count > 0;
                  return (
                    <div key={idx} className="chart-bar-wrapper">
                      <div className="chart-bar-bg">
                        <div 
                          className={`chart-bar-fill ${isHighest ? 'chart-bar-fill-highlight' : 'chart-bar-fill-default'}`}
                          style={{ 
                            height: `${Math.max(pct, 6)}px`, 
                          }} 
                        ></div>
                      </div>
                      <span className="chart-day-label">{item.day}</span>
                      <span className="chart-count-label">({item.count})</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar Area (Right Column) */}
          <div className="dashboard-sidebar">
            
            {/* Quick Actions Card */}
            <div className="quick-actions-card">
              <h3>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#0F766E' }}>bolt</span>
                Quick Actions
              </h3>
              <div className="quick-actions-grid">
                <button onClick={() => navigate(`/members/${activeId}?add=true`)} className="quick-action-btn">
                  <span className="material-symbols-outlined" style={{ color: '#0F766E' }}>person_add</span>
                  <span>Add Member</span>
                </button>
                <button onClick={() => document.getElementById('manual-checkin-input')?.focus()} className="quick-action-btn">
                  <span className="material-symbols-outlined" style={{ color: '#6366F1' }}>check_circle</span>
                  <span>Check In</span>
                </button>
                <button onClick={() => navigate(`/messages/${activeId}`)} className="quick-action-btn">
                  <span className="material-symbols-outlined" style={{ color: '#F59E0B' }}>send_to_mobile</span>
                  <span>Remind</span>
                </button>
              </div>
            </div>

            {/* Manual Check-in Card */}
            <div className="manual-checkin-card">
              <h3>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#0F766E' }}>search</span>
                Manual Check-in
              </h3>
              <div className="search-box">
                <input 
                  id="manual-checkin-input"
                  type="text" 
                  placeholder="Search active member by name/phone..." 
                  value={manualQuery}
                  onChange={(e) => setManualQuery(e.target.value)}
                />
                {searchLoading && (
                  <div style={{ position: 'absolute', right: '10px', top: '10px' }} className="spinner"></div>
                )}
              </div>

              {manualQuery.trim().length >= 2 ? (
                <div className="members-list">
                  {manualResults.length === 0 ? (
                    <div className="no-results">No active member matches found</div>
                  ) : (
                    manualResults.map(member => (
                      <div key={member.id} className="member-item">
                        <div>
                          <span className="member-name">{member.full_name}</span>
                          <p style={{ fontSize: '10px', color: '#64748B', margin: 0, fontWeight: 500 }}>{member.phone}</p>
                        </div>
                        <button 
                          onClick={() => handleManualCheckIn(member)}
                          className="btn btn-primary btn-small"
                        >
                          Check In
                        </button>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <p style={{ fontSize: '11.5px', color: '#64748B', textAlign: 'center', margin: '0.5rem 0 0 0', fontWeight: 500 }}>
                  ℹ Type member name or phone above to quickly log attendance manually.
                </p>
              )}
            </div>

            {/* Plan Expiry Alerts Card */}
            <div className="alerts-card">
              <h3>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#F59E0B' }}>warning</span>
                Expiring This Week
              </h3>
              <div className="alerts-list">
                {expiringMembers.length === 0 ? (
                  <div className="no-alerts">No membership expirations this week 🎉</div>
                ) : (
                  expiringMembers.map(member => {
                    const daysLeft = getDaysDiff(member.expiry_date);
                    return (
                      <div 
                        key={member.id} 
                        className="alert-item alert-item-expiring" 
                        onClick={() => navigate(`/members/${activeId}?status=expiring`)} 
                        style={{ cursor: 'pointer' }}
                      >
                        <p className="alert-member">{member.full_name}</p>
                        <p className="alert-date">
                          Expiry: {member.expiry_date} ({daysLeft <= 0 ? 'Expired' : `${daysLeft} days left`})
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Expired Members Card */}
            <div className="alerts-card">
              <h3>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#EF4444' }}>cancel</span>
                Expired Members
              </h3>
              <div className="alerts-list">
                {expiredMembers.length === 0 ? (
                  <div className="no-alerts">No expired memberships! 🎯</div>
                ) : (
                  expiredMembers.map(member => (
                    <div 
                      key={member.id} 
                      className="alert-item alert-item-expired" 
                      onClick={() => navigate(`/members/${activeId}?status=expired`)} 
                      style={{ cursor: 'pointer' }}
                    >
                      <p className="alert-member">{member.full_name}</p>
                      <p className="alert-date">
                        Expired on: {member.expiry_date}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recently Joined Members Card */}
            <div className="alerts-card">
              <h3>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#6366F1' }}>person_add</span>
                Recently Joined
              </h3>
              <div className="alerts-list">
                {recentJoined.length === 0 ? (
                  <div className="no-alerts">No members registered yet</div>
                ) : (
                  recentJoined.map(member => (
                    <div 
                      key={member.id} 
                      className="alert-item" 
                      style={{ background: '#FAFBFD', border: '1px solid #E2E8F0', borderLeft: '4px solid #6366F1', cursor: 'pointer' }}
                      onClick={() => navigate(`/members/${activeId}`)}
                    >
                      <p className="alert-member" style={{ color: '#1E293B' }}>{member.full_name}</p>
                      <p className="alert-date" style={{ color: '#64748B' }}>
                        Joined: {member.start_date || member.created_at?.split('T')[0]}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </AdminLayout>
  );
}