import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api.js';
import AdminLayout from '../components/AdminLayout.jsx';

export default function MessagesPage() {
  const { gymId, studioId } = useParams();
  const activeId = studioId || gymId;

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [targetType, setTargetType] = useState('expiring'); // expiring or expired
  const [targetMembers, setTargetMembers] = useState([]);
  
  // Custom message template overrides
  const [customMsg, setCustomMsg] = useState('');

  const fetchTargets = async () => {
    try {
      setError('');
      const statusParam = targetType === 'expiring' ? 'expiring' : 'expired';
      const { data } = await api.get(`/members/${activeId}`, { params: { status: statusParam, limit: 100 } });
      if (data.success) {
        setTargetMembers(data.members || []);
      }
    } catch (err) {
      setError('Failed to fetch target members.');
    }
  };

  useEffect(() => {
    fetchTargets();
  }, [activeId, targetType]);

  // Set default message template on toggle
  useEffect(() => {
    if (targetType === 'expiring') {
      setCustomMsg("Hi {name}! Your membership at ABC Fitness Studio expires in {days} days. Contact Akula Bhavani Chandar (+91 9876543210). Don't break your fitness streak! 🔥");
    } else {
      setCustomMsg("⚠️ {name}, your membership at ABC Fitness Studio expired {days} days ago. Contact Akula Bhavani Chandar (+91 9876543210) to renew. We miss you! 💪");
    }
  }, [targetType]);

  const getFormattedMessage = (member) => {
    const today = new Date();
    const expiry = new Date(member.expiry_date);
    const diffTime = expiry - today;
    const diffDays = Math.abs(Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    
    return customMsg
      .replace('{name}', member.full_name)
      .replace('{days}', diffDays.toString());
  };

  const getWhatsAppLink = (member) => {
    const formattedPhone = member.phone.startsWith('91') ? member.phone : `91${member.phone}`;
    const text = encodeURIComponent(getFormattedMessage(member));
    return `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${text}`;
  };

  // Launch all WhatsApp web tabs in sequence (User approved)
  const handleBulkWhatsApp = () => {
    if (targetMembers.length === 0) return;
    
    setSuccess(`Opening ${targetMembers.length} WhatsApp Web chats. Please ensure popup blockers are disabled!`);
    
    targetMembers.forEach((member, index) => {
      // Stagger window.open slightly to avoid browser blocking them all
      setTimeout(() => {
        const link = getWhatsAppLink(member);
        window.open(link, '_blank');
      }, index * 800);
    });
  };

  // Copy bulk details to clipboard
  const handleCopyNumbers = () => {
    const numbersList = targetMembers.map(m => m.phone).join(', ');
    navigator.clipboard.writeText(numbersList);
    setSuccess('All target numbers copied to clipboard!');
  };

  return (
    <AdminLayout>
      <main className="p-6 max-w-7xl mx-auto space-y-8 pb-32">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">WhatsApp Broadcaster</h1>
          <p className="text-xs sm:text-sm text-slate-400 font-bold mt-1 uppercase tracking-wider">
            Send reminders directly to members via WhatsApp Web
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Broadcaster controls */}
          <section className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.015)] space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-800">1. Target Audience</h2>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Select which member segment to message</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setTargetType('expiring')}
                  className={`py-3.5 rounded-xl border text-xs font-bold transition-all active:scale-[0.98] ${
                    targetType === 'expiring' 
                      ? 'bg-teal-50 text-teal-700 border-teal-600/30' 
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50/50'
                  }`}
                >
                  Expiring Soon (≤5 days)
                </button>
                <button
                  onClick={() => setTargetType('expired')}
                  className={`py-3.5 rounded-xl border text-xs font-bold transition-all active:scale-[0.98] ${
                    targetType === 'expired' 
                      ? 'bg-teal-50 text-teal-700 border-teal-600/30' 
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50/50'
                  }`}
                >
                  Expired Membership
                </button>
              </div>

              <div className="space-y-2">
                <h2 className="text-base font-bold text-slate-800">2. Message Template</h2>
                <textarea
                  rows="4"
                  className="w-full p-4 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-600/20 text-slate-700 font-medium"
                  value={customMsg}
                  onChange={(e) => setCustomMsg(e.target.value)}
                />
                <p className="text-[9px] text-slate-400 font-semibold italic">
                  💡 Tip: You can edit the text. Use placeholders <strong className="text-slate-550">{'{name}'}</strong> and <strong className="text-slate-550">{'{days}'}</strong> to populate details dynamically.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                onClick={handleBulkWhatsApp}
                disabled={targetMembers.length === 0}
                className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs tracking-wider transition-all active:scale-98 flex items-center justify-center gap-1.5 uppercase shadow-md shadow-emerald-500/10"
              >
                <span className="material-symbols-outlined text-[18px]">chat</span>
                Send Bulk WhatsApp
              </button>

              <button
                onClick={handleCopyNumbers}
                disabled={targetMembers.length === 0}
                className="py-3.5 px-6 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-slate-600 border border-slate-150 font-bold rounded-xl text-xs transition-all active:scale-98 flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">content_copy</span>
                Copy Numbers
              </button>
            </div>
          </section>

          {/* Members list preview & single triggers */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.015)] flex flex-col h-[520px] overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">Target Members ({targetMembers.length})</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Click individual buttons to send manually</p>
            </div>
            
            <div className="overflow-y-auto flex-1 divide-y divide-slate-50 px-4">
              {targetMembers.length === 0 ? (
                <div className="text-center py-20">
                  <span className="material-symbols-outlined text-slate-300 text-4xl mb-2">check_circle</span>
                  <p className="text-xs text-slate-400 font-bold">No members in this queue.</p>
                </div>
              ) : (
                targetMembers.map((member) => (
                  <div key={member.id} className="py-4 flex justify-between items-center gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-850 text-xs truncate">{member.full_name}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{member.phone}</p>
                      <p className="text-[9px] text-slate-500 font-bold truncate mt-1 bg-slate-50 p-1.5 rounded-lg border border-slate-100 font-mono">
                        {getFormattedMessage(member)}
                      </p>
                    </div>
                    
                    <a
                      href={getWhatsAppLink(member)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl text-[10px] font-bold border border-emerald-100/60 active:scale-95 transition-all shrink-0 flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">send</span>
                      Send
                    </a>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>
    </AdminLayout>
  );
}