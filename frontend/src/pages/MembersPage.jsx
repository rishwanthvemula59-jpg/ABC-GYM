import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import api from '../services/api.js';
import AdminLayout from '../components/AdminLayout.jsx';

export default function MembersPage() {
  const { gymId, studioId } = useParams();
  const _rawActive = studioId || gymId;
  const activeId = (_rawActive && _rawActive !== 'undefined' && _rawActive !== 'null')
    ? _rawActive
    : (localStorage.getItem('studioId') || '');
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = searchParams.get('status') || 'all';

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filtering / Searching state
  const [status, setStatus] = useState(statusParam);

  // Summary Metrics State
  const [summaryStats, setSummaryStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    expiringSoon: 0,
    expired: 0
  });

  useEffect(() => {
    setStatus(statusParam);
  }, [statusParam]);

  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setShowAddModal(true);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('add');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const [search, setSearch] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState('1_month');
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [notes, setNotes] = useState('');
  const [customDays, setCustomDays] = useState('');

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError('');
      if (!activeId) {
        setError('No studio selected. Please log in again.');
        setMembers([]);
        setLoading(false);
        return;
      }
      const params = { status };
      if (search) params.search = search;
      
      const { data } = await api.get(`/members/${activeId}`, { params });
      if (data.success) {
        const sorted = (data.members || []).sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));
        setMembers(sorted);
      }
    } catch (err) {
      setError('Unable to fetch registered studio members.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummaryStats = async () => {
    try {
      const { data } = await api.get(`/dashboard/${activeId}`);
      if (data.success) {
        setSummaryStats({
          totalMembers: data.stats.totalMembers,
          activeMembers: data.stats.totalMembers - data.stats.expired,
          expiringSoon: data.stats.expiringSoon,
          expired: data.stats.expired
        });
      }
    } catch (err) {
      console.warn('Could not fetch summary stats:', err);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchSummaryStats();
  }, [activeId, status, search]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      const { data } = await api.post(`/members/${activeId}`, {
        fullName,
        phone,
        email,
        plan,
        paymentStatus,
        notes,
        customDays: customDays ? parseInt(customDays, 10) : undefined
      });
      if (data.success) {
        setSuccessMsg('Member registered successfully!');
        setShowAddModal(false);
        // Reset form
        setFullName('');
        setPhone('');
        setEmail('');
        setPlan('1_month');
        setPaymentStatus('paid');
        setNotes('');
        setCustomDays('');
        fetchMembers();
        fetchSummaryStats();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Verify details.');
    }
  };

  const handleRenew = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      const { data } = await api.post(`/members/${activeId}/${selectedMember.id}/renew`, {
        plan,
        paymentStatus,
        customDays: customDays ? parseInt(customDays, 10) : undefined
      });
      if (data.success) {
        setSuccessMsg(`Membership renewed successfully for ${selectedMember.full_name}!`);
        setShowRenewModal(false);
        setSelectedMember(null);
        setCustomDays('');
        fetchMembers();
        fetchSummaryStats();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Renewal failed. Please retry.');
    }
  };

  const handleSendWhatsApp = (member) => {
    const daysRemaining = getDaysDiff(member.expiry_date);
    const planName = member.plan === '1_month' ? '1 Month (₹750)' : '3 Months (₹2000)';
    let text = '';
    
    if (daysRemaining <= 0) {
      const daysSinceExpiry = Math.abs(daysRemaining);
      text = `Hi ${member.full_name}! Your ${planName} membership at ABC Fitness Studio expired on ${member.expiry_date} (${daysSinceExpiry === 0 ? 'today' : `${daysSinceExpiry} days ago`}). Please renew your plan to continue your workouts. - Akula Bhavani Chandar`;
    } else if (daysRemaining <= 5) {
      text = `Hi ${member.full_name}! Your ${planName} membership at ABC Fitness Studio is expiring soon on ${member.expiry_date} (${daysRemaining} days remaining). Please renew to continue your workouts. - Akula Bhavani Chandar`;
    } else {
      text = `Hi ${member.full_name}! Friendly update from ABC Fitness Studio. Your ${planName} plan is active until ${member.expiry_date} (${daysRemaining} days remaining). - Akula Bhavani Chandar`;
    }

    let formattedPhone = member.phone.replace(/\D/g, '');
    if (formattedPhone.length === 10) {
      formattedPhone = `91${formattedPhone}`;
    }

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleDelete = (member) => {
    setMemberToDelete(member);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!memberToDelete) return;
    setError('');
    setSuccessMsg('');
    try {
      const { data } = await api.delete(`/members/${activeId}/${memberToDelete.id}`);
      if (data.success) {
        setSuccessMsg('Member profile successfully deleted.');
        setShowDeleteModal(false);
        setMemberToDelete(null);
        fetchMembers();
        fetchSummaryStats();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Deletion failed.');
    }
  };

  const handleToggleStatus = async (member) => {
    setError('');
    setSuccessMsg('');
    try {
      const { data } = await api.patch(`/members/${activeId}/${member.id}/status`, {
        is_active: !member.is_active
      });
      if (data.success) {
        setSuccessMsg(`Member profile successfully ${!member.is_active ? 'activated' : 'deactivated'}.`);
        fetchMembers();
        fetchSummaryStats();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update member status.');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Full Name', 'Phone', 'Email', 'Plan', 'Expiry Date', 'Status'];
    const rows = members.map(m => {
      const days = getDaysDiff(m.expiry_date);
      const statusStr = days <= 0 ? 'Expired' : days <= 5 ? 'Expiring' : 'Active';
      return [
        m.full_name,
        m.phone,
        m.email || 'N/A',
        m.plan === '1_month' ? '1 Month' : '3 Months',
        m.expiry_date || '',
        statusStr
      ];
    });
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ABC_Gym_Members_${statusParam}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getDaysDiff = (expiryDateStr) => {
    const expiry = new Date(expiryDateStr);
    expiry.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.round((expiry - now) / (1000 * 60 * 60 * 24));
  };

  const getInitials = (name) => {
    if (!name) return 'M';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusBadge = (member) => {
    if (member.is_active === false) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          Deactivated
        </span>
      );
    }
    const daysRemaining = getDaysDiff(member.expiry_date);
    if (daysRemaining <= 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-705 border border-rose-100">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          Expired
        </span>
      );
    } else if (daysRemaining <= 5) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-705 border border-amber-100 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          Expiring
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-750 border border-emerald-100">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Active
        </span>
      );
    }
  };

  return (
    <AdminLayout>
      <main className="p-6 max-w-7xl mx-auto space-y-6 pb-32">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 sm:text-3xl flex flex-wrap items-center gap-3">
              Members Directory
              {summaryStats.totalMembers > 0 && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-teal-50 text-teal-700 border border-teal-100 rounded-full text-[10px] font-bold">
                  <span className={`w-1.5 h-1.5 rounded-full ${summaryStats.expired > 0 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                  Health: {Math.round(((summaryStats.totalMembers - summaryStats.expired) / Math.max(summaryStats.totalMembers, 1)) * 100)}%
                </span>
              )}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">Configure, add and extend studio members</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExportCSV}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 active:scale-95 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all shadow-sm"
              title="Export directory as CSV"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Export CSV
            </button>
            <button 
              onClick={() => { setCustomDays(''); setShowAddModal(true); }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-700 hover:bg-teal-800 active:scale-95 text-white border border-transparent rounded-xl text-xs font-semibold shadow-md shadow-teal-700/15 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              Add Member
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-800 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">warning</span>
            {error}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            {successMsg}
          </div>
        )}

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border-l-4 border-teal-500 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex items-center gap-4 transition-all hover:translate-y-[-2px] hover:shadow-md">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 flex-shrink-0">
              <span className="material-symbols-outlined">group</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Members</p>
              <h3 className="text-xl font-extrabold text-slate-800 leading-tight mt-1">{summaryStats.totalMembers}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border-l-4 border-emerald-500 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex items-center gap-4 transition-all hover:translate-y-[-2px] hover:shadow-md">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
              <span className="material-symbols-outlined">check_circle</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Members</p>
              <h3 className="text-xl font-extrabold text-slate-800 leading-tight mt-1">{summaryStats.activeMembers}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border-l-4 border-amber-500 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex items-center gap-4 transition-all hover:translate-y-[-2px] hover:shadow-md">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0">
              <span className="material-symbols-outlined">pending_actions</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Expiring Soon</p>
              <h3 className="text-xl font-extrabold text-slate-800 leading-tight mt-1">{summaryStats.expiringSoon}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border-l-4 border-rose-500 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex items-center gap-4 transition-all hover:translate-y-[-2px] hover:shadow-md">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 flex-shrink-0">
              <span className="material-symbols-outlined">cancel</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Expired Members</p>
              <h3 className="text-xl font-extrabold text-slate-800 leading-tight mt-1">{summaryStats.expired}</h3>
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
          <div className="flex gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200 w-fit">
            {['all', 'active', 'expiring', 'expired', 'deactivated'].map((filter) => (
              <button
                key={filter}
                onClick={() => setSearchParams({ status: filter })}
                className={`px-4 py-2 rounded-lg text-xs font-semibold capitalize transition-all duration-150 whitespace-nowrap ${
                  status === filter 
                    ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50 font-bold' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-3.5 top-3 text-slate-400 text-[18px]">search</span>
            <input
              type="text"
              placeholder="Search members by name or mobile number..."
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none hover:border-slate-350 focus:border-teal-700 focus:ring-2 focus:ring-teal-600/10 shadow-sm transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Directory Listing Table - Desktop View */}
        <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.015)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Member Profile</th>
                  <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Plan details</th>
                  <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Expiry date</th>
                  <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-5"><div className="w-36 h-4 bg-slate-100 rounded"></div></td>
                      <td className="px-6 py-5"><div className="w-24 h-4 bg-slate-100 rounded"></div></td>
                      <td className="px-6 py-5"><div className="w-20 h-4 bg-slate-100 rounded"></div></td>
                      <td className="px-6 py-5"><div className="w-16 h-5 bg-slate-100 rounded-full"></div></td>
                      <td className="px-6 py-5 text-right"><div className="w-28 h-6 bg-slate-100 rounded ml-auto"></div></td>
                    </tr>
                  ))
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-xs text-slate-400 font-semibold">
                      No members found. Try changing filters or add a new member.
                    </td>
                  </tr>
                ) : (
                  members.map((member) => {
                    const daysRemaining = getDaysDiff(member.expiry_date);
                    return (
                      <tr key={member.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-teal-50 border border-teal-100 text-teal-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                              {getInitials(member.full_name)}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-900">{member.full_name}</div>
                              <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{member.phone}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-slate-700 uppercase">
                            {member.plan === '1_month' ? '1 Month' : '3 Months'}
                          </span>
                          <span className="text-[10px] text-teal-650 font-bold block mt-0.5">
                            {member.plan === '1_month' ? '₹750' : '₹2000'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs font-bold text-slate-700">{member.is_active === false ? 'N/A' : member.expiry_date}</div>
                          <div className="mt-1">
                            {member.is_active === false ? (
                              <span className="text-[9px] font-semibold text-slate-400 bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5 uppercase tracking-wide">
                                Deactivated
                              </span>
                            ) : daysRemaining < 0 ? (
                              <span className="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-100/60 rounded px-1.5 py-0.5 uppercase tracking-wide">
                                {Math.abs(daysRemaining)} days expired
                              </span>
                            ) : daysRemaining === 0 ? (
                              <span className="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-100/60 rounded px-1.5 py-0.5 uppercase tracking-wide">
                                Expired Today
                              </span>
                            ) : daysRemaining <= 5 ? (
                              <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-100/60 rounded px-1.5 py-0.5 uppercase tracking-wide animate-pulse">
                                {daysRemaining} days left
                              </span>
                            ) : (
                              <span className="text-[9px] font-semibold text-slate-500 bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5 uppercase tracking-wide">
                                {daysRemaining} days left
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(member)}</td>
                        <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => handleSendWhatsApp(member)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold transition-all duration-155 active:scale-95 inline-flex items-center gap-1 shadow-sm"
                          >
                            <span className="material-symbols-outlined text-[13px] font-bold">chat</span>
                            WhatsApp
                          </button>
                          <button
                            onClick={() => {
                              setSelectedMember(member);
                              setPlan(member.plan);
                              setCustomDays('');
                              setShowRenewModal(true);
                            }}
                            className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-[10px] font-bold transition-all duration-155 active:scale-95 inline-flex items-center gap-1 shadow-sm"
                          >
                            <span className="material-symbols-outlined text-[13px] font-bold">autorenew</span>
                            Renew
                          </button>
                          <button
                            onClick={() => handleToggleStatus(member)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all duration-155 active:scale-95 inline-flex items-center gap-1 ${
                              member.is_active 
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-600' 
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[13px] font-bold">
                              {member.is_active ? 'block' : 'check_circle'}
                            </span>
                            {member.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDelete(member)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[10px] font-bold transition-all duration-155 active:scale-95 inline-flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[13px] font-bold">delete</span>
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile View Card Layout */}
        <div className="block md:hidden space-y-4">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.015)] animate-pulse space-y-3">
                <div className="flex justify-between items-center">
                  <div className="w-24 h-4 bg-slate-100 rounded"></div>
                  <div className="w-16 h-5 bg-slate-100 rounded-full"></div>
                </div>
                <div className="w-full h-3 bg-slate-50 rounded"></div>
                <div className="w-1/2 h-3 bg-slate-50 rounded"></div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-50">
                  <div className="w-16 h-7 bg-slate-100 rounded-lg"></div>
                  <div className="w-16 h-7 bg-slate-100 rounded-lg"></div>
                </div>
              </div>
            ))
          ) : members.length === 0 ? (
            <div className="bg-white p-8 text-center text-xs text-slate-400 font-semibold rounded-2xl border border-slate-100 shadow-sm">
              No members found. Try changing filters or add a new member.
            </div>
          ) : (
            members.map((member) => {
              const daysRemaining = getDaysDiff(member.expiry_date);
              return (
                <div key={member.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.015)] space-y-4">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-teal-50 border border-teal-100 text-teal-600 font-bold text-xs flex items-center justify-center flex-shrink-0">
                        {getInitials(member.full_name)}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900">{member.full_name}</h4>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{member.phone}</p>
                      </div>
                    </div>
                    {getStatusBadge(member)}
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-3 rounded-xl border border-slate-100 text-[11px] font-semibold text-slate-600">
                    <div>
                      <span className="text-[9px] text-slate-400 font-extrabold uppercase block mb-0.5">Plan Details</span>
                      <span className="text-slate-800 font-bold uppercase">{member.plan === '1_month' ? '1 Month' : '3 Months'}</span>
                      <span className="text-slate-400 block">{member.plan === '1_month' ? '₹750' : '₹2000'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-extrabold uppercase block mb-0.5">Expiry Info</span>
                      <span className="text-slate-800 font-bold">{member.is_active === false ? 'N/A' : member.expiry_date}</span>
                      <span className={`block text-[10px] ${member.is_active === false ? 'text-slate-400' : daysRemaining <= 0 ? 'text-rose-500 font-bold' : daysRemaining <= 5 ? 'text-amber-500 font-bold' : 'text-slate-400'}`}>
                        {member.is_active === false
                          ? 'Deactivated'
                          : daysRemaining < 0 
                            ? `${Math.abs(daysRemaining)} days expired` 
                            : daysRemaining === 0 
                              ? 'Expired Today' 
                              : `${daysRemaining} days left`
                        }
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => handleSendWhatsApp(member)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold transition-all duration-155 active:scale-95 inline-flex items-center gap-1 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[13px] font-bold">chat</span>
                      WhatsApp
                    </button>
                    <button
                      onClick={() => {
                        setSelectedMember(member);
                        setPlan(member.plan);
                        setCustomDays('');
                        setShowRenewModal(true);
                      }}
                      className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-[10px] font-bold transition-all duration-155 active:scale-95 inline-flex items-center gap-1 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[13px] font-bold">autorenew</span>
                      Renew
                    </button>
                    <button
                      onClick={() => handleToggleStatus(member)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all duration-155 active:scale-95 inline-flex items-center gap-1 ${
                        member.is_active 
                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-600' 
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px] font-bold">
                        {member.is_active ? 'block' : 'check_circle'}
                      </span>
                      {member.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDelete(member)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[10px] font-bold transition-all duration-155 active:scale-95 inline-flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[13px] font-bold">delete</span>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add Studio Member Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-300">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 text-sm">Add Studio Member</h3>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="p-1 hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <form onSubmit={handleAddMember} className="p-6 space-y-4">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. Vikram Singh"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-600/10"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1">Phone Number (10 Digits)</label>
                  <input
                    type="text"
                    pattern="[0-9]{10}"
                    required
                    placeholder="E.g. 9876543210"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-600/10"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1">Email Address (Optional)</label>
                  <input
                    type="email"
                    placeholder="E.g. vikram@gmail.com"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-600/10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1">Select Plan</label>
                    <select
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-600/10 bg-white"
                      value={plan}
                      onChange={(e) => setPlan(e.target.value)}
                    >
                      <option value="1_month">1 Month (₹750)</option>
                      <option value="3_month">3 Months (₹2000)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1">Payment Status</label>
                    <select
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-600/10 bg-white"
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value)}
                    >
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1">Custom Duration (Days - Optional)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Leave blank for plan default (30 / 90 days)"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-600/10"
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1">Additional Notes</label>
                  <textarea
                    rows="2"
                    placeholder="Optional details..."
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-600/10"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs shadow-md shadow-teal-500/10 transition-all active:scale-98"
                >
                  Create Member Profile
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Renew Member Modal */}
        {showRenewModal && selectedMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-300">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 text-sm">Renew Membership</h3>
                <button 
                  onClick={() => {
                    setShowRenewModal(false);
                    setSelectedMember(null);
                  }}
                  className="p-1 hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <form onSubmit={handleRenew} className="p-6 space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  Renewing membership for <strong className="text-slate-700">{selectedMember.full_name}</strong>. The new expiry date will count from today.
                </p>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1">Select Plan</label>
                  <select
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-600/10 bg-white"
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                  >
                    <option value="1_month">1 Month (₹750)</option>
                    <option value="3_month">3 Months (₹2000)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1">Payment Status</label>
                  <select
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-600/10 bg-white"
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                  >
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1">Custom Duration (Days - Optional)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Leave blank for plan default (30 / 90 days)"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-600/10"
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs shadow-md shadow-teal-500/10 transition-all active:scale-98"
                >
                  Confirm Renewal
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && memberToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-300">
              <div className="px-6 py-4 bg-rose-50 border-b border-rose-100 flex justify-between items-center">
                <h3 className="font-bold text-rose-900 text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-rose-600">warning</span>
                  Delete Member Profile
                </h3>
                <button 
                  onClick={() => {
                    setShowDeleteModal(false);
                    setMemberToDelete(null);
                  }}
                  className="p-1 hover:bg-rose-200/50 text-rose-450 hover:text-rose-700 rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                  Are you sure you want to delete <strong className="text-slate-900">{memberToDelete.full_name}</strong>? This action will permanently remove their profile and all associated attendance records. This cannot be undone.
                </p>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setMemberToDelete(null);
                    }}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all active:scale-98"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md shadow-rose-500/10 transition-all active:scale-98"
                  >
                    Confirm Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </AdminLayout>
  );
}