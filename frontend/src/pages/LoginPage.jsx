import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import logo from '../logo.png';

export default function LoginPage({ setIsAuth }) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('login'); // 'login', 'signup', 'forgot', 'reset'
  
  // Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Reset/OTP fields
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      if (viewMode === 'login') {
        const { data } = await api.post('/auth/login', { identifier: email, password });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('studioId', data.user.studioId || data.user.gymId);
        localStorage.setItem('userName', data.user.firstName || 'Admin');
        setIsAuth(true);
        navigate(`/dashboard/${data.user.studioId || data.user.gymId}`);
      } else if (viewMode === 'signup') {
        if (!/^[0-9]{10}$/.test(phone)) {
          throw new Error('Phone number must be exactly 10 digits.');
        }
        if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
          throw new Error('Password must be at least 8 characters, with 1 uppercase letter and 1 number.');
        }

        await api.post('/auth/register', {
          email,
          password,
          firstName,
          lastName,
          phone
        });

        setSuccessMsg('Registration successful! Please login with your credentials.');
        setViewMode('login');
      } else if (viewMode === 'forgot') {
        await api.post('/auth/forgot-password', { identifier: email });
        setSuccessMsg('An OTP has been sent to your registered phone number.');
        setViewMode('reset');
      } else if (viewMode === 'reset') {
        if (!/^\d{6}$/.test(otp)) {
          throw new Error('OTP must be exactly 6 digits.');
        }
        if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
          throw new Error('Password must be at least 8 characters, with 1 uppercase letter and 1 number.');
        }

        await api.post('/auth/reset-password', {
          identifier: email,
          otp,
          newPassword
        });

        setSuccessMsg('Password reset successful! Please login with your new password.');
        setViewMode('login');
        setPassword('');
      }
    } catch (err) {
      setError(err.message || err.response?.data?.error || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const showTabs = viewMode === 'login' || viewMode === 'signup';

  return (
    <div className="bg-mesh min-h-screen flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
      {/* Container */}
      <div className="w-full max-w-[440px] z-10">
        {/* Branding Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-20 flex items-center justify-center mb-4">
            <img src={logo} alt="ABC Gym Logo" className="h-full w-auto object-contain" />
          </div>
          <h1 className="text-3xl font-extrabold text-white text-center drop-shadow-sm">
            ABC Fitness Studio
          </h1>
          <p className="text-sm text-teal-100/90 mt-1">
            ABC Fitness Studio Admin Portal
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-xl shadow-2xl p-6 md:p-8 border border-gray-100">
          
          {/* Tabs */}
          {showTabs ? (
            <div className="flex gap-4 mb-6 border-b border-gray-100 pb-2">
              <button
                onClick={() => { setViewMode('login'); setError(''); setSuccessMsg(''); }}
                className={`flex-1 pb-2 font-bold text-sm text-center border-b-2 transition-all ${
                  viewMode === 'login' ? 'border-teal-700 text-teal-700' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
                type="button"
              >
                Log In
              </button>
              <button
                onClick={() => { setViewMode('signup'); setEmail(''); setPassword(''); setError(''); setSuccessMsg(''); }}
                className={`flex-1 pb-2 font-bold text-sm text-center border-b-2 transition-all ${
                  viewMode === 'signup' ? 'border-teal-700 text-teal-700' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
                type="button"
              >
                Sign Up
              </button>
            </div>
          ) : (
            <div className="mb-6">
              <h2 className="text-lg font-bold text-teal-800">
                {viewMode === 'forgot' ? 'Reset Password' : 'Verify OTP Code'}
              </h2>
              <p className="text-xs text-gray-400 mt-1 font-semibold leading-relaxed">
                {viewMode === 'forgot' 
                  ? 'Enter your registered email or phone to receive a 6-digit OTP code via SMS.' 
                  : `Enter the code sent to your phone to reset the password for ${email}.`}
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-550/10 border border-red-500/20 text-red-700 p-3 rounded-lg mb-4 text-xs font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {error}
            </div>
          )}

          {successMsg && (
            <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg mb-4 text-xs font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              {successMsg}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {viewMode === 'signup' && (
              <>
                {/* First & Last Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block" htmlFor="firstName">
                      First Name
                    </label>
                    <input
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-teal-650/20 focus:border-teal-700 outline-none text-xs text-gray-800 transition-all"
                      id="firstName"
                      type="text"
                      required
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block" htmlFor="lastName">
                      Last Name
                    </label>
                    <input
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-teal-650/20 focus:border-teal-700 outline-none text-xs text-gray-800 transition-all"
                      id="lastName"
                      type="text"
                      required
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>

                {/* Phone number */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block" htmlFor="phone">
                    Phone Number (10 digits)
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <span className="material-symbols-outlined text-gray-400 text-[18px]">
                        phone
                      </span>
                    </div>
                    <input
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-teal-650/20 focus:border-teal-700 outline-none text-xs text-gray-800 transition-all"
                      id="phone"
                      type="tel"
                      required
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Email / Phone Field (Hidden during reset phase, as it is prefilled) */}
            {viewMode !== 'reset' && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block" htmlFor="email">
                  Email Address or Mobile Number
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-gray-400 text-[18px]">
                      person
                    </span>
                  </div>
                  <input
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-teal-650/20 focus:border-teal-700 outline-none text-xs text-gray-800 transition-all placeholder:text-gray-400"
                    id="email"
                    type="text"
                    required
                    disabled={viewMode === 'reset'}
                    placeholder={viewMode === 'login' ? 'owner@abcfitness.com or 6281042207' : 'example@mail.com'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Password Field (only show for login/signup) */}
            {(viewMode === 'login' || viewMode === 'signup') && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block" htmlFor="password">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-gray-400 text-[18px]">
                      lock
                    </span>
                  </div>
                  <input
                    className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-teal-650/20 focus:border-teal-700 outline-none text-xs text-gray-800 transition-all placeholder:text-gray-400"
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {viewMode === 'signup' && (
                  <p className="text-[9px] text-gray-400 leading-tight">
                    * Must be at least 8 chars, 1 uppercase letter, and 1 number.
                  </p>
                )}
                {viewMode === 'login' && (
                  <div className="flex justify-end mt-1.5">
                    <button
                      onClick={() => { setViewMode('forgot'); setError(''); setSuccessMsg(''); }}
                      className="text-[10px] font-bold text-teal-700 hover:text-teal-800 transition-colors uppercase tracking-wider"
                      type="button"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* OTP Code and New Password (only show in Reset state) */}
            {viewMode === 'reset' && (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block" htmlFor="otp">
                    6-Digit OTP Code
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <span className="material-symbols-outlined text-gray-400 text-[18px]">
                        pin
                      </span>
                    </div>
                    <input
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-teal-650/20 focus:border-teal-700 outline-none text-xs text-gray-800 transition-all font-mono tracking-widest placeholder:text-gray-300"
                      id="otp"
                      type="text"
                      maxLength="6"
                      required
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block" htmlFor="newPassword">
                    Choose New Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <span className="material-symbols-outlined text-gray-400 text-[18px]">
                        lock
                      </span>
                    </div>
                    <input
                      className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-teal-650/20 focus:border-teal-700 outline-none text-xs text-gray-800 transition-all placeholder:text-gray-400"
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  <p className="text-[9px] text-gray-400 leading-tight">
                    * Must be at least 8 chars, 1 uppercase letter, and 1 number.
                  </p>
                </div>
              </>
            )}

            {/* Submit Button */}
            <button
              className="w-full mt-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs py-3 rounded-lg shadow-md hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  PROCESSING...
                </>
              ) : (
                <>
                  {viewMode === 'login' && 'LOG IN'}
                  {viewMode === 'signup' && 'SIGN UP'}
                  {viewMode === 'forgot' && 'REQUEST RESET OTP'}
                  {viewMode === 'reset' && 'SAVE NEW PASSWORD'}
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Back Button for forgot/reset modes */}
          {!showTabs && (
            <button
              onClick={() => { setViewMode('login'); setError(''); setSuccessMsg(''); }}
              className="w-full mt-4 py-2 border border-gray-150 hover:bg-gray-50 text-gray-500 hover:text-gray-700 font-bold rounded-lg text-[10px] tracking-wider transition-all flex items-center justify-center gap-1.5 uppercase"
              type="button"
            >
              <span className="material-symbols-outlined text-[14px]">arrow_back</span>
              Back to Login
            </button>
          )}

        </div>

        {/* Footer */}
        <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4 px-4 text-xs text-white/70">
          <p>© 2026 ABC Fitness Studio</p>
          <div className="flex items-center gap-4">
            <a className="hover:text-white transition-colors" href="#">Privacy Policy</a>
            <a className="hover:text-white transition-colors" href="#">Terms of Service</a>
          </div>
        </div>
      </div>

      {/* Decorative Lights */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-blue-400/10 blur-[100px] rounded-full pointer-events-none"></div>
    </div>
  );
}