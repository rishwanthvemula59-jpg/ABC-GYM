import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api.js';
import AdminLayout from '../components/AdminLayout.jsx';

export default function AttendancePage() {
  const { gymId, studioId } = useParams();
  const _rawActive = studioId || gymId;
  const activeId = (_rawActive && _rawActive !== 'undefined' && _rawActive !== 'null')
    ? _rawActive
    : (localStorage.getItem('studioId') || '');

  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({ checkedIn: 0, total: 0, percentage: 0 });
  const [activeMembers, setActiveMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Debounce search term changes to avoid excessive network requests
  useEffect(() => {
    const handler = setTimeout(() => {
      setNameFilter(searchTerm);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      if (!activeId) {
        setError('No studio selected. Please log in again.');
        setRecords([]);
        setActiveMembers([]);
        setLoading(false);
        return;
      }
      const params = {};
      if (filterDate) params.date = filterDate;
      if (nameFilter.trim()) params.search = nameFilter.trim();

      // Fetch attendance records and stats
      const { data: attData } = await api.get(`/attendance/${activeId}/today`, { params });
      if (attData.success) {
        const sortedRecords = (attData.records || []).sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
        setRecords(sortedRecords);
        setStats(attData.stats);
      }

      // Fetch active members
      const { data: memData } = await api.get(`/members/${activeId}`, { params: { status: 'active', limit: 100 } });
      if (memData.success) {
        const checkedInIds = new Set((attData?.records || []).map(r => r.memberId).filter(Boolean));
        
        const mapped = (memData.members || []).map(m => ({
          ...m,
          checkedIn: checkedInIds.has(m.id)
        }));
        mapped.sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));
        setActiveMembers(mapped);
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to fetch attendance logs.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshMembers = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData();
  }, [activeId, filterDate, nameFilter]);

  const handleMarkPresent = async (e) => {
    e.preventDefault();
    if (!selectedMemberId) return;
    setError('');
    setSuccess('');

    try {
      const { data } = await api.post(`/attendance/${activeId}/mark-present`, { memberId: selectedMemberId });
      if (data.success) {
        setSuccess('Member marked present successfully!');
        setSelectedMemberId('');
        setMemberSearch('');
        fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to mark attendance.');
    }
  };

  return (
    <AdminLayout>
      <main className="p-6 max-w-7xl mx-auto space-y-8 pb-32">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">Attendance Registers</h1>
          <p className="text-xs sm:text-sm text-slate-400 font-bold mt-1 uppercase tracking-wider">
            Mark and monitor daily attendance logs
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-800 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">warning</span>
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            {success}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Today Check-ins */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.015)] relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-emerald-500"></div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">how_to_reg</span>
              </div>
            </div>
            <h3 className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-1">Today Check-ins</h3>
            <p className="text-3xl font-black text-slate-800 tracking-tight">{stats.checkedIn}</p>
          </div>

          {/* Total Active Members */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.015)] relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-teal-600"></div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 bg-teal-50 text-teal-700 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">group</span>
              </div>
            </div>
            <h3 className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-1">Total Active Members</h3>
            <p className="text-3xl font-black text-slate-800 tracking-tight">{stats.total}</p>
          </div>

          {/* Attendance Rate */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.015)] relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-amber-500"></div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">analytics</span>
              </div>
            </div>
            <h3 className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-1">Attendance Rate</h3>
            <p className="text-3xl font-black text-slate-800 tracking-tight">{stats.percentage}%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Attendance Log Table */}
          <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.015)] overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-800">Check-in Logs</h2>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Filter and browse all registers</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Search Term Filter */}
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-[14px]">search</span>
                  <input
                    type="text"
                    placeholder="Search name/phone..."
                    className="pl-7 pr-2.5 py-1.5 border border-slate-200 rounded-xl text-[11px] outline-none focus:border-teal-700 bg-white w-40"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Date Filter Selection */}
                <div className="flex items-center gap-2">
                  <select
                    className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-[11px] outline-none focus:border-teal-700 bg-white"
                    value={filterDate && filterDate !== 'all' ? 'custom' : filterDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'custom') {
                        setFilterDate(new Date().toISOString().split('T')[0]);
                      } else {
                        setFilterDate(val);
                      }
                    }}
                  >
                    <option value="">Today Only</option>
                    <option value="all">All Dates</option>
                    <option value="custom">Select Date...</option>
                  </select>

                  {filterDate && filterDate !== 'all' && filterDate.includes('-') && (
                    <input
                      type="date"
                      className="px-2 py-1 border border-slate-200 rounded-xl text-[11px] outline-none focus:border-teal-700 bg-white"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                    />
                  )}
                  
                  {filterDate !== '' && (
                    <button
                      onClick={() => setFilterDate('')}
                      className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-650 flex items-center"
                      title="Clear custom date"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-3.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Member</th>
                    <th className="px-6 py-3.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Expiry</th>
                    <th className="px-6 py-3.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    Array(4).fill(0).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-4"><div className="w-16 h-4 bg-slate-100 rounded"></div></td>
                        <td className="px-6 py-4"><div className="w-32 h-4 bg-slate-100 rounded"></div></td>
                        <td className="px-6 py-4"><div className="w-24 h-4 bg-slate-100 rounded"></div></td>
                        <td className="px-6 py-4"><div className="w-20 h-4 bg-slate-100 rounded"></div></td>
                        <td className="px-6 py-4"><div className="w-24 h-6 bg-slate-100 rounded-full"></div></td>
                      </tr>
                    ))
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-xs text-slate-400 font-semibold">
                        No check-ins recorded matching filters.
                      </td>
                    </tr>
                  ) : (
                    records.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/20 transition-colors">
                        <td className="px-6 py-4 text-xs font-semibold text-slate-650">
                          <div>{rec.time}</div>
                          {rec.date && <div className="text-[9px] text-slate-400 font-normal mt-0.5">{rec.date}</div>}
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-800">{rec.name}</td>
                        <td className="px-6 py-4 text-xs font-semibold text-slate-500">{rec.phone}</td>
                        <td className="px-6 py-4 text-xs font-semibold text-slate-600">{rec.expiryDate}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            rec.markedBy === 'admin' 
                              ? 'bg-teal-50 text-teal-750' 
                              : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            <span className={`w-1 h-1 rounded-full ${
                              rec.markedBy === 'admin' ? 'bg-teal-600' : 'bg-emerald-500'
                            }`}></span>
                            {rec.markedBy === 'admin' ? 'Admin Manual' : 'Self Kiosk'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Manual check-in section */}
          <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.015)] flex flex-col justify-between h-fit">
            <div className="space-y-5">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-base font-bold text-slate-800">Manual Attendance</h2>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    Check in active members who don't have their mobile
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRefreshMembers}
                  title="Reload member list"
                  className={`p-1.5 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-teal-50 transition-all ${refreshing ? 'animate-spin text-teal-600' : ''}`}
                >
                  <span className="material-symbols-outlined text-[18px]">refresh</span>
                </button>
              </div>

              <form onSubmit={handleMarkPresent} className="space-y-3">
                {/* Live Search */}
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1">Search Member</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[16px]">search</span>
                    <input
                      type="text"
                      placeholder="Name or mobile number..."
                      className="w-full pl-9 pr-8 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-600/20 bg-white"
                      value={memberSearch}
                      onChange={(e) => {
                        setMemberSearch(e.target.value);
                        setSelectedMemberId('');
                      }}
                    />
                    {memberSearch && (
                      <button
                        type="button"
                        onClick={() => { setMemberSearch(''); setSelectedMemberId(''); }}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Search Result Cards (shown when searching) */}
                {memberSearch.trim() ? (() => {
                  const q = memberSearch.toLowerCase();
                  const filtered = activeMembers.filter(m =>
                    m.full_name.toLowerCase().includes(q) || m.phone.includes(memberSearch)
                  );
                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-4 space-y-1">
                        <span className="material-symbols-outlined text-slate-300 text-[28px]">person_search</span>
                        <p className="text-[10px] text-slate-400 font-semibold">No members found.</p>
                        <button type="button" onClick={handleRefreshMembers} className="text-[10px] text-teal-700 underline font-semibold">Refresh list?</button>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {filtered.map(member => (
                        <button
                          key={member.id}
                          type="button"
                          disabled={member.checkedIn}
                          onClick={() => {
                            if (!member.checkedIn) {
                              setSelectedMemberId(member.id);
                              setMemberSearch(member.full_name);
                            }
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-all ${
                            selectedMemberId === member.id
                              ? 'border-teal-600 bg-teal-50'
                              : member.checkedIn
                              ? 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                              : 'border-slate-200 hover:border-teal-600/30 hover:bg-teal-50/30 cursor-pointer'
                          }`}
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-800">{member.full_name}</p>
                            <p className="text-[10px] text-slate-400 font-semibold">{member.phone}</p>
                          </div>
                          {member.checkedIn ? (
                            <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[11px]">check_circle</span>
                              Done
                            </span>
                          ) : selectedMemberId === member.id ? (
                            <span className="text-[9px] font-bold bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">Selected</span>
                          ) : (
                            <span className="material-symbols-outlined text-slate-300 text-[16px]">chevron_right</span>
                          )}
                        </button>
                      ))}
                    </div>
                  );
                })() : (
                  /* No search — show plain dropdown for browsing */
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1">Or Select from List</label>
                    <select
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-600/20 bg-white"
                      value={selectedMemberId}
                      onChange={(e) => setSelectedMemberId(e.target.value)}
                    >
                      <option value="">-- Choose Member --</option>
                      {activeMembers.map((member) => (
                        <option key={member.id} value={member.id} disabled={member.checkedIn}>
                          {member.full_name} ({member.phone}){member.checkedIn ? ' ✓ Checked In' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!selectedMemberId}
                  className="w-full py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs shadow-md shadow-teal-500/10 transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Mark Present
                </button>
              </form>
            </div>
          </section>
        </div>
      </main>
    </AdminLayout>
  );
}