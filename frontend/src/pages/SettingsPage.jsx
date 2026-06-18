import { useState } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout.jsx';

export default function SettingsPage() {
  const { gymId, studioId } = useParams();
  const activeId = studioId || gymId;

  const [studioName, setStudioName] = useState('ABC Fitness Studio');
  const [ownerName, setOwnerName] = useState('Akula Bhavani Chandar');
  const [phone, setPhone] = useState('+91 9876543210');
  const [email, setEmail] = useState('bhavani@abcfitness.com');
  const [location, setLocation] = useState('Hyderabad, Telangana');

  const checkinUrl = `${window.location.protocol}//${window.location.host}/checkin?studioId=${activeId}`;
  const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(checkinUrl)}`;

  const handleSave = (e) => {
    e.preventDefault();
    alert('Settings updated successfully! (Demo Mode)');
  };

  return (
    <AdminLayout>
      <main className="p-4 md:p-8 pb-32">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-1">Settings</h1>
          <p className="text-sm text-gray-500 font-medium">Configure studio settings and access check-in QR code</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings form */}
          <section className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold text-gray-850 mb-4">Studio Details</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Studio Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-teal-650/20 focus:border-teal-700"
                    value={studioName}
                    onChange={(e) => setStudioName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Owner Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-teal-650/20 focus:border-teal-700"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Contact Phone</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-teal-650/20 focus:border-teal-700"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Contact Email</label>
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-teal-650/20 focus:border-teal-700"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Location</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-teal-650/20 focus:border-teal-700"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg text-sm shadow transition-all active:scale-98"
              >
                Save Settings
              </button>
            </form>
          </section>

          {/* QR Code generator */}
          <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-between text-center h-fit">
            <div>
              <h2 className="text-lg font-bold text-gray-850 mb-2">Wall-Mount QR Code</h2>
              <p className="text-xs text-gray-500 leading-relaxed font-medium mb-6">
                Print and mount this QR Code on the studio wall for easy public check-in.
              </p>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 mb-6 flex justify-center items-center shadow-inner">
                <img 
                  alt="Check-in QR Code" 
                  className="w-48 h-48 object-contain mix-blend-multiply" 
                  src={qrImageSrc} 
                />
              </div>

              <p className="text-[10px] text-gray-400 font-bold break-all mb-4">
                {checkinUrl}
              </p>
            </div>

            <a 
              href={qrImageSrc} 
              target="_blank" 
              rel="noreferrer"
              className="w-full py-3 bg-teal-900 hover:bg-teal-950 text-white font-bold rounded-lg text-xs tracking-wider transition-colors active:scale-95 text-center block uppercase"
            >
              Open/Download QR
            </a>
          </section>
        </div>
      </main>
    </AdminLayout>
  );
}
