import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api.js';
import logo from '../logo.png';
import '../components/styles/CheckIn.css';

export default function CheckInPage() {
  const [searchParams] = useSearchParams();
  const studioId = searchParams.get('studioId') || '60916a67-7d4a-4c44-bb6a-d74c54354a81';

  // State Management
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Kiosk Flow Steps: 'input' | 'select' | 'confirm' | 'success' | 'error' | 'validity'
  const [flowStep, setFlowStep] = useState('input');
  const [checkInResult, setCheckInResult] = useState(null);
  const [countdown, setCountdown] = useState(4);
  const [inputMode, setInputMode] = useState('keypad'); // 'keypad' | 'keyboard'
  const [validityData, setValidityData] = useState(null);

  // Live clock
  const [currentTime, setCurrentTime] = useState(new Date());

  const timerRef = useRef(null);

  // Update clock every second
  useEffect(() => {
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Search members as query changes
  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    const delaySearch = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/members/${studioId}`, {
          params: { search: searchQuery.trim(), limit: 10 }
        });
        if (data.success) {
          setSearchResults(data.members || []);
        }
      } catch (err) {
        // Silent catch for search errors, since public view might not have list permissions
        console.warn('Search query failed:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchQuery, studioId]);

  // Handle countdown on success screen
  useEffect(() => {
    if (flowStep === 'success' && countdown > 0) {
      timerRef.current = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (flowStep === 'success' && countdown === 0) {
      resetForm();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [flowStep, countdown]);

  const handleKeyPress = (num) => {
    if (searchQuery.length < 10) {
      setSearchQuery(prev => prev + num);
    }
  };

  const handleBackspace = () => {
    setSearchQuery(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  // Triggered when a member is selected
  const handleSelectMember = (member) => {
    setSelectedMember(member);
    setFlowStep('confirm');
  };

  // Perform backend check-in request
  const triggerCheckIn = async (phoneStr) => {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/attendance/checkin', {
        phone: phoneStr,
        gymId: studioId
      });
      
      if (data.success) {
        setCheckInResult({
          status: data.status,
          member: data.member
        });
        setCountdown(4);
        setFlowStep('success');
      } else {
        setError(data.message || 'Verification failed.');
        setFlowStep('error');
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setCheckInResult({ status: 'not_found' });
        setFlowStep('error');
      } else if (err.response?.data?.status === 'already_checked_in') {
        setCheckInResult({ status: 'already_checked_in' });
        setError(err.response?.data?.error || 'You have already checked in today.');
        setFlowStep('error');
      } else {
        setError(err.response?.data?.error || 'An error occurred during check-in.');
        setFlowStep('error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle direct check-in with phone input
  const handleDirectCheckIn = () => {
    const cleaned = searchQuery.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      setError('Please input a valid 10-digit phone number.');
      return;
    }
    triggerCheckIn(cleaned);
  };

  const resetForm = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedMember(null);
    setCheckInResult(null);
    setError('');
    setFlowStep('input');
    setCountdown(4);
    setValidityData(null);
  };

  const whatsappNumber = '9876543210';
  const ownerName = 'Akula Bhavani Chandar';

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

  // Helper to calculate days remaining
  const getDaysRemaining = (expiryDateStr) => {
    if (!expiryDateStr) return '0 days left';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDateStr);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days expired`;
    } else if (diffDays === 0) {
      return 'Expires today';
    } else {
      return `${diffDays} days left`;
    }
  };

  // Check Validity handler — uses existing member list API
  const handleCheckValidity = async () => {
    const cleaned = searchQuery.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/members/${studioId}`, {
        params: { search: cleaned, limit: 5 }
      });
      if (data.success && data.members && data.members.length > 0) {
        // Find exact phone match
        const match = data.members.find(m => m.phone === cleaned || m.phone === `+91${cleaned}`) || data.members[0];
        setValidityData(match);
        setFlowStep('validity');
      } else {
        setError('No member found with this phone number.');
      }
    } catch (err) {
      setError('Could not look up member. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to get membership status label + color class
  const getMembershipStatus = (expiryDateStr) => {
    if (!expiryDateStr) return { label: 'Unknown', className: 'status-unknown' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDateStr);
    expiry.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: 'Expired', className: 'status-expired' };
    if (diffDays <= 5) return { label: 'Expiring Soon', className: 'status-expiring' };
    return { label: 'Active', className: 'status-active' };
  };

  // Format plan name for display
  const formatPlan = (plan) => {
    if (!plan) return 'N/A';
    if (plan === '1_month') return '1 Month';
    if (plan === '3_month') return '3 Months';
    return plan.replace(/_/g, ' ');
  };

  // Derived state
  const cleanedDigits = searchQuery.replace(/\D/g, '');
  const isValidNumber = cleanedDigits.length === 10;

  return (
    <div className="checkin-container">
      <div className="checkin-card">

        {/* Date / Time Chip */}
        <div className="datetime-chip">
          <span>
            {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            {' · '}
            {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="status-badge">Live Attendance Active</span>
        </div>

        {/* Header */}
        <div className="premium-header">
          <img src={logo} alt="ABC Fitness Studio" className="brand-logo" />
          <h1 className="brand-title">
            ABC Fitness Studio
            <span className="checkin-badge">Member Check‑In</span>
          </h1>
          <p className="brand-subtitle">
            Enter your registered mobile number to mark today's attendance
          </p>
        </div>

        {/* ─── INPUT STEP ─── */}
        {flowStep === 'input' && (
          <div className="step-content">

            {/* Mode Toggle */}
            <div className="input-toggle">
              <button
                type="button"
                className={inputMode === 'keypad' ? 'active' : ''}
                onClick={() => { setInputMode('keypad'); handleClear(); }}
              >
                🔢 On‑Screen Keypad
              </button>
              <button
                type="button"
                className={inputMode === 'keyboard' ? 'active' : ''}
                onClick={() => { setInputMode('keyboard'); handleClear(); }}
              >
                ⌨️ Keyboard Search
              </button>
            </div>

            {/* Error display */}
            {error && <div className="error-message">{error}</div>}

            {/* Phone Input */}
            <input
              type="text"
              className="main-input"
              placeholder={inputMode === 'keypad' ? 'Enter 10‑digit mobile' : 'Type name or number…'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Phone number or member search"
            />

            {/* Helper status line */}
            <p className="helper-line">
              🔒 Secure attendance check‑in · Takes less than 5 seconds
            </p>

            {/* Validation feedback (keypad mode only) */}
            {inputMode === 'keypad' && searchQuery.length > 0 && !isValidNumber && (
              <p className="validation-msg warning">
                {cleanedDigits.length}/10 digits entered
              </p>
            )}
            {inputMode === 'keypad' && isValidNumber && (
              <p className="validation-msg success">
                ✓ Ready to check‑in
              </p>
            )}

            {/* Numeric Keypad */}
            {inputMode === 'keypad' && (
              <div className="numpad">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                  <button key={n} onClick={() => handleKeyPress(n.toString())}>{n}</button>
                ))}
                <button className="backspace-btn" onClick={handleBackspace}>⌫</button>
                <button key={0} onClick={() => handleKeyPress('0')}>0</button>
                <button className="clear-btn" onClick={handleClear}>CLR</button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="action-buttons">
              <button
                type="button"
                className="primary-action-btn"
                onClick={handleDirectCheckIn}
                disabled={loading}
              >
                {loading ? 'Checking in…' : 'CHECK IN NOW'}
              </button>
              <button
                type="button"
                className="secondary-action-btn"
                onClick={handleCheckValidity}
                disabled={loading}
              >
                {loading ? 'Looking up…' : '🔍 CHECK VALIDITY'}
              </button>
            </div>

            {/* Keyboard hint */}
            {inputMode === 'keypad' && (
              <p className="keyboard-hint">You can also type using your physical keyboard</p>
            )}

            {/* Trust row */}
            <div className="trust-row">
              <span>📡 Attendance synced instantly</span>
              <span>📊 Admin dashboard updated live</span>
            </div>
          </div>
        )}

        {/* ─── SUCCESS STEP ─── */}
        {flowStep === 'success' && checkInResult && (
          <div className="success-section">
            <div className="success-animation">
              <div className="checkmark">✓</div>
            </div>
            <h2>Check‑In Successful!</h2>
            <p className="success-message">
              {checkInResult.member?.name || 'Member'}, your attendance has been recorded.
            </p>
            {checkInResult.member?.plan && (
              <div className="plan-details">
                <p><strong>Plan:</strong> {checkInResult.member.plan}</p>
                {checkInResult.member.expiryDate && (
                  <p>{getDaysRemaining(checkInResult.member.expiryDate)}</p>
                )}
              </div>
            )}
            <p className="redirecting-text">Resetting in {countdown}s…</p>
          </div>
        )}

        {/* ─── ERROR STEP ─── */}
        {flowStep === 'error' && (
          <div className="error-section">
            <div className="error-icon">✕</div>
            <h2>
              {checkInResult?.status === 'not_found'
                ? 'Member Not Found'
                : checkInResult?.status === 'already_checked_in'
                ? 'Already Checked In'
                : 'Check‑In Failed'}
            </h2>
            <p>{error || 'Something went wrong. Please try again.'}</p>
            <button className="btn btn-primary btn-large" onClick={resetForm}>
              Try Again
            </button>
          </div>
        )}

        {/* ─── VALIDITY STEP ─── */}
        {flowStep === 'validity' && validityData && (() => {
          const status = getMembershipStatus(validityData.expiry_date);
          return (
            <div className="validity-section">
              <div className="validity-icon">📋</div>
              <h2>Membership Details</h2>

              <div className="validity-card">
                <div className="validity-name">
                  {validityData.full_name || 'Member'}
                </div>
                <div className="validity-phone">
                  📞 {validityData.phone}
                </div>

                <div className="validity-grid">
                  <div className="validity-item">
                    <span className="validity-label">Plan</span>
                    <span className="validity-value">{formatPlan(validityData.plan)}</span>
                  </div>
                  <div className="validity-item">
                    <span className="validity-label">Status</span>
                    <span className={`validity-status ${status.className}`}>{status.label}</span>
                  </div>
                  <div className="validity-item">
                    <span className="validity-label">Start Date</span>
                    <span className="validity-value">
                      {validityData.start_date
                        ? new Date(validityData.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="validity-item">
                    <span className="validity-label">Expiry Date</span>
                    <span className="validity-value">
                      {validityData.expiry_date
                        ? new Date(validityData.expiry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="validity-item full-width">
                    <span className="validity-label">Remaining</span>
                    <span className="validity-value highlight">
                      {getDaysRemaining(validityData.expiry_date)}
                    </span>
                  </div>
                </div>

                {validityData.plan_price && (
                  <div className="validity-price">
                    Plan Price: ₹{validityData.plan_price}
                  </div>
                )}
              </div>

              <button className="btn btn-primary btn-large" onClick={resetForm}>
                ← Back to Check‑In
              </button>
            </div>
          );
        })()}

        {/* Footer */}
        <div className="checkin-footer">
          <p>ABC Fitness Studio © {new Date().getFullYear()}</p>
        </div>

      </div>
    </div>
  );
}