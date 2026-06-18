import { NavLink, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import api from '../services/api.js';
import logo from '../logo.png';

export default function AdminLayout({ children }) {
  const { studioId, gymId } = useParams();
  const _rawActive = studioId || gymId;
  const activeId = (_rawActive && _rawActive !== 'undefined' && _rawActive !== 'null')
    ? _rawActive
    : (localStorage.getItem('studioId') || '');
  const location = useLocation();

  // If the route param is missing/invalid (e.g. the string 'undefined'),
  // redirect to the same section with the stored studioId so the UI becomes usable.
  useEffect(() => {
    const localId = localStorage.getItem('studioId') || '';
    if ((!_rawActive || _rawActive === 'undefined' || _rawActive === 'null') && localId) {
      const parts = location.pathname.split('/').filter(Boolean);
      const base = parts[0] || 'dashboard';
      navigate(`/${base}/${localId}`, { replace: true });
    }
  }, [_rawActive, location.pathname]);
  const navigate = useNavigate();
  let userName = localStorage.getItem('userName') || 'Akula Bhavani Chandar';
  if (userName === 'Rajesh' || userName === 'Rajesh Kumar') {
    userName = 'Akula Bhavani Chandar';
  }
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notifRef = useRef(null);

  // Fetch expiring + expired members to show as notifications
  const fetchNotifications = async () => {
    if (!activeId) return;
    try {
      const [expiring, expired] = await Promise.all([
        api.get(`/members/${activeId}`, { params: { status: 'expiring', limit: 20 } }),
        api.get(`/members/${activeId}`, { params: { status: 'expired', limit: 20 } })
      ]);
      const items = [];
      (expiring.data.members || []).forEach(m => {
        const days = Math.ceil((new Date(m.expiry_date) - new Date()) / 86400000);
        items.push({ id: m.id, name: m.full_name, type: 'expiring', days, phone: m.phone });
      });
      (expired.data.members || []).forEach(m => {
        const days = Math.abs(Math.ceil((new Date(m.expiry_date) - new Date()) / 86400000));
        items.push({ id: m.id, name: m.full_name, type: 'expired', days, phone: m.phone });
      });
      setNotifications(items);
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();
  }, [activeId]);

  // Close panel on click outside
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
    window.location.reload();
  };

  const navItems = [
    { name: 'Dashboard', path: `/dashboard/${activeId}`, icon: 'grid_view' },
    { name: 'Members', path: `/members/${activeId}`, icon: 'group' },
    { name: 'Attendance', path: `/attendance/${activeId}`, icon: 'assignment_turned_in' },
    { name: 'Messages & Alerts', path: `/messages/${activeId}`, icon: 'chat_bubble' },
    { name: 'Settings', path: `/settings/${activeId}`, icon: 'settings_suggest' }
  ];

  return (
    <div className="bg-[#f8fafc] text-slate-900 min-h-screen font-sans antialiased selection:bg-teal-500/10 selection:text-teal-600">
      {/* Friendly access denied banner (set by API interceptor on 403) */}
      {localStorage.getItem('accessError') && (
        <div className="fixed top-16 left-0 right-0 z-50 flex justify-center">
          <div className="max-w-4xl mx-4 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-sm font-semibold">
            {localStorage.getItem('accessError')}
            <button onClick={() => { localStorage.removeItem('accessError'); window.location.reload(); }} className="ml-4 underline font-bold">Dismiss</button>
          </div>
        </div>
      )}
      
      {/* Top Navbar */}
      <header className="fixed top-0 w-full h-16 z-50 flex justify-between items-center px-6 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          {/* Mobile menu toggle button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-50 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[24px]">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
 
          <div className="flex items-center gap-2">
            <div className="h-10 flex items-center justify-center">
              <img src={logo} alt="ABC Gym Logo" className="h-full w-auto object-contain" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm md:text-base text-slate-900 leading-none">ABC Fitness</h1>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Studio Portal</span>
            </div>
          </div>
        </div>
 
        <div className="flex items-center gap-4">
          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(v => !v)}
              className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full ring-2 ring-white"></span>
              )}
            </button>
 
            {/* Notification Panel */}
            {showNotifications && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-4 py-3 border-b border-slate-50 flex justify-between items-center">
                  <h3 className="text-xs font-extrabold text-slate-800">Membership Alerts</h3>
                  <span className="text-[9px] font-bold bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full">{notifications.length} alerts</span>
                </div>
 
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs text-slate-400 font-semibold">
                      <span className="material-symbols-outlined text-slate-200 text-[32px] block mb-2">notifications_off</span>
                      No alerts right now
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className="px-4 py-3 flex items-start gap-3 hover:bg-slate-50/50 transition-colors">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                           n.type === 'expired' ? 'bg-rose-50' : 'bg-amber-50'
                        }`}>
                          <span className={`material-symbols-outlined text-[15px] ${
                            n.type === 'expired' ? 'text-rose-500' : 'text-amber-500'
                          }`}>
                            {n.type === 'expired' ? 'cancel' : 'warning'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{n.name}</p>
                          <p className={`text-[10px] font-semibold mt-0.5 ${
                            n.type === 'expired' ? 'text-rose-500' : 'text-amber-600'
                          }`}>
                            {n.type === 'expired'
                              ? `Expired ${n.days} day${n.days !== 1 ? 's' : ''} ago`
                              : `Expiring in ${n.days} day${n.days !== 1 ? 's' : ''}`
                            }
                          </p>
                        </div>
                        <a
                          href={`https://api.whatsapp.com/send?phone=91${n.phone}&text=${encodeURIComponent(
                            n.type === 'expired'
                              ? `Hi ${n.name}! Your membership at ABC Fitness Studio has expired. Please renew to continue. - Akula Bhavani Chandar`
                              : `Hi ${n.name}! Your membership at ABC Fitness Studio is expiring soon. Please renew in time. - Akula Bhavani Chandar`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-shrink-0 p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors"
                          title="Send WhatsApp"
                        >
                          <span className="material-symbols-outlined text-[14px]">chat</span>
                        </a>
                      </div>
                    ))
                  )}
                </div>
 
                {notifications.length > 0 && (
                  <div className="px-4 py-2.5 border-t border-slate-50">
                    <button
                      onClick={() => { navigate(`/members/${activeId}?status=expiring`); setShowNotifications(false); }}
                      className="text-[10px] text-teal-650 font-bold hover:underline"
                    >
                      View all in Members Directory →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="h-6 w-[1px] bg-slate-100"></div>
 
          <button 
            onClick={() => navigate(`/settings/${activeId}`)}
            className="flex items-center gap-2.5 pl-1 text-left hover:opacity-85 transition-opacity cursor-pointer group focus:outline-none"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center ring-2 ring-slate-100 shadow-sm group-hover:ring-teal-100 transition-all overflow-hidden">
              <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="hidden sm:block text-left">
              <span className="block text-xs font-bold text-slate-800 leading-tight group-hover:text-teal-700 transition-colors">{userName}</span>
              <span className="block text-[10px] text-slate-400 font-semibold">Studio Administrator</span>
            </div>
          </button>
        </div>
      </header>
 
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col fixed left-0 top-16 h-[calc(100vh-64px)] w-[260px] bg-white border-r border-slate-100 py-6 px-4 gap-2 z-40">
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group active:scale-[0.98] ${
                  isActive
                    ? 'bg-teal-50 text-teal-700 font-semibold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`
              }
            >
              <span className="material-symbols-outlined text-[20px] transition-transform duration-200">
                {item.icon}
              </span>
              <span className="text-xs font-bold tracking-wide">{item.name}</span>
            </NavLink>
          ))}
        </nav>
 
        <div className="pt-4 border-t border-slate-50">
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center gap-3 py-3 rounded-xl text-rose-600 hover:bg-rose-50/50 hover:text-rose-700 px-4 transition-all group active:scale-95 text-xs font-bold"
          >
            <span className="material-symbols-outlined text-[20px]">
              logout
            </span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
 
      {/* Sidebar - Mobile drawer */}
      {mobileMenuOpen && (
        <>
          <div 
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 md:hidden"
          />
          <aside className="fixed left-0 top-16 bottom-0 w-[260px] bg-white border-r border-slate-100 py-6 px-4 flex flex-col z-50 md:hidden animate-in slide-in-from-left duration-300">
            <nav className="flex-1 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group active:scale-[0.98] ${
                      isActive
                        ? 'bg-teal-50 text-teal-700 font-semibold'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`
                  }
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {item.icon}
                  </span>
                  <span className="text-xs font-bold tracking-wide">{item.name}</span>
                </NavLink>
              ))}
            </nav>
            <div className="pt-4 border-t border-slate-50">
              <button 
                onClick={handleLogout} 
                className="w-full flex items-center gap-3 py-3 rounded-xl text-rose-600 hover:bg-rose-50/50 hover:text-rose-700 px-4 transition-all active:scale-95 text-xs font-bold"
              >
                <span className="material-symbols-outlined text-[20px]">logout</span>
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </>
      )}
 
      {/* Main Content Layout */}
      <div className="md:ml-[260px] pt-16 min-h-[calc(100vh-64px)] transition-all">
        {children}
      </div>
    </div>
  );
}
