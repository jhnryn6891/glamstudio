import React, { useState, useEffect, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '[http://127.0.0.1:8000](http://127.0.0.1:8000)';

const AUTH_CHANNELS = [
  { id: 'tiktok', label: 'TikTok', placeholder: '@yourtiktokhandle' },
  { id: 'instagram', label: 'Instagram', placeholder: '@yourighandle' },
  { id: 'facebook', label: 'Facebook', placeholder: 'facebook.com/yourprofile' },
  { id: 'phone', label: 'Mobile Number', placeholder: '0917 123 4567' },
  { id: 'email', label: 'Email', placeholder: 'you@email.com' }
];

const EVENT_TYPES = [
  { name: 'Bridal & Entourage', baseDp: 4250, perHeadDp: 1000 },
  { name: 'Debut / Sweet 16', baseDp: 3250, perHeadDp: 1000 },
  { name: 'Red Carpet / Gala', baseDp: 1750, perHeadDp: 1250 },
  { name: 'Editorial / Photoshoot', baseDp: 2500, perHeadDp: 1250 },
  { name: 'Corporate / Special Occasion', baseDp: 1750, perHeadDp: 1000 }
];

const PAYMENT_CHANNELS = [
  { id: 'GCash', accountName: 'GlamStudio Atelier', accountNumber: '0917-888-2026' },
  { id: 'Maya', accountName: 'GlamStudio Atelier', accountNumber: '0917-888-2026' },
  { id: 'BDO / BPI Transfer', accountName: 'GlamStudio Artistry Services', accountNumber: 'BDO: 0045-8910-2026' }
];

const PORTFOLIO_WORKS = [
  {
    id: 'bridal',
    title: 'Bridal Elegance',
    category: 'Timeless Soft Glam',
    duration: '90 mins Bride + 40 mins/head',
    description: 'Luminous, tear-proof airbrush and skin-prep artistry engineered to stay radiant from morning ceremony through reception.',
    highlights: ['24-Hour Humidity-Locked Finish', 'Custom Individual Lashes', 'Touch-Up Kit Included'],
    img: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'red-carpet',
    title: 'Red Carpet Glam',
    category: 'Sculpted Evening & Gala',
    duration: '60 mins + Travel Buffer',
    description: 'High-definition contour, velvety matte or glass-skin finish, and statement eye artistry tailored for flash photography.',
    highlights: ['Flashback-Free HD Setting', 'Precision Wing & Smokey Eye', 'On-Location Hotel/Home Prep'],
    img: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'editorial',
    title: 'Editorial Look',
    category: 'Campaign & Creative Direction',
    duration: 'Half-Day / Per Look Rate',
    description: 'Avant-garde textures, glossy lids, and monochromatic color stories built for brand campaigns, lookbooks, and magazine spreads.',
    highlights: ['Multi-Look Transformation', 'Studio & Outdoor Lighting Tested', 'Skin-First Luxury Prep'],
    img: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'debut',
    title: 'Debutante Radiance',
    category: 'Milestone Celebration',
    duration: '75 mins + Entourage Add-Ons',
    description: 'Youthful, romantic rose-gold and champagne tones designed to transition effortlessly across pre-debut shoots and grand cotillion.',
    highlights: ['Pre-Shoot to Ball Transition', 'Hairstyling Coordination Ready', 'Long-Wear Lip & Cheek Tint'],
    img: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=900&q=80'
  }
];

function format24To12Hour(time24) {
  if (!time24 || !time24.includes(':')) return '';
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return '';
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedLook, setSelectedLook] = useState(null);

  // Client Auth & OTP State
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState('signup');
  const [selectedChannel, setSelectedChannel] = useState('tiktok');
  const [authForm, setAuthForm] = useState({ full_name: '', contact_handle: '', pin: '', otp_code: '' });
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [demoOtpHint, setDemoOtpHint] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [myBookings, setMyBookings] = useState([]);

  // Calendar Availability State
  const [availabilityMap, setAvailabilityMap] = useState({});
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Booking Form + Downpayment Gate State
  const [formData, setFormData] = useState({
    client_name: '',
    client_contact: '',
    event_type: EVENT_TYPES[0].name,
    event_date: '',
    start_time: '09:00',
    head_count: 1,
    location_address: '',
    payment_method: 'GCash',
    payment_reference: ''
  });
  const [bookingResponse, setBookingResponse] = useState(null);
  const [copiedReminders, setCopiedReminders] = useState(false);
  const [loading, setLoading] = useState(false);

  // Glam Concierge State
  const [conciergeQuestion, setConciergeQuestion] = useState('');
  const [conciergeResult, setConciergeResult] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);

  // Reviews State
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ name: '', comment: '', rating: 5 });
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Visual Retention Timer Ref
  const tabStartTimeRef = useRef(Date.now());
  const previousTabRef = useRef('home');

  const trackClick = (buttonName) => {
    fetch(`${API_BASE}/api/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'button_click',
        target_name: buttonName,
        duration_seconds: 0,
        user_handle: currentUser ? currentUser.contact_handle : 'guest'
      })
    }).catch(() => {});
  };

  useEffect(() => {
    const now = Date.now();
    const elapsedSec = Math.round((now - tabStartTimeRef.current) / 1000);
    if (elapsedSec >= 2) {
      fetch(`${API_BASE}/api/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'section_retention',
          target_name: `tab_${previousTabRef.current}`,
          duration_seconds: elapsedSec,
          user_handle: currentUser ? currentUser.contact_handle : 'guest'
        })
      }).catch(() => {});
    }
    tabStartTimeRef.current = now;
    previousTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    fetchReviews();
    fetchAvailability();
  }, []);

  useEffect(() => {
    if (currentUser) {
      const formattedContact = `${currentUser.auth_method.toUpperCase()}: ${currentUser.contact_handle}`;
      setFormData(prev => ({ ...prev, client_name: currentUser.full_name, client_contact: formattedContact }));
      setNewReview(prev => ({ ...prev, name: currentUser.full_name }));
      fetchClientBookings(currentUser.contact_handle);
    }
  }, [currentUser]);

  const fetchReviews = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/reviews`);
      if (res.ok) setReviews(await res.json());
    } catch (err) {
      console.error('Failed to load reviews', err);
    }
  };

  const fetchAvailability = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/calendar/availability`);
      if (res.ok) setAvailabilityMap(await res.json());
    } catch (err) {
      console.error('Failed to load calendar availability', err);
    }
  };

  const fetchClientBookings = async (contactHandle) => {
    try {
      const res = await fetch(`${API_BASE}/api/client/bookings?contact_handle=${encodeURIComponent(contactHandle)}`);
      if (res.ok) setMyBookings(await res.json());
    } catch (err) {
      console.error('Failed to fetch client bookings', err);
    }
  };

  // Dynamic Downpayment Calculation
  const selectedEventObj = EVENT_TYPES.find(e => e.name === formData.event_type) || EVENT_TYPES[0];
  const heads = Math.max(1, parseInt(formData.head_count, 10) || 1);
  const calculatedDownpayment = selectedEventObj.baseDp + (heads - 1) * selectedEventObj.perHeadDp;
  const activePaymentChannel = PAYMENT_CHANNELS.find(p => p.id === formData.payment_method) || PAYMENT_CHANNELS[0];

  const handleRequestOtp = async () => {
    setAuthError(null);
    if (!authForm.full_name.trim() || !authForm.contact_handle.trim() || authForm.pin.length < 4) {
      setAuthError('Please complete your Name, Contact Handle, and 4-digit PIN first.');
      return;
    }
    if (!agreedTerms) {
      setAuthError('Please read and accept the Terms, Conditions & Privacy Policy before requesting a code.');
      return;
    }
    setAuthLoading(true);
    trackClick('btn_request_otp');
    try {
      const res = await fetch(`${API_BASE}/api/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_method: selectedChannel,
          contact_handle: authForm.contact_handle
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Could not send verification code.');
      setOtpSent(true);
      setDemoOtpHint(data.demo_otp);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    trackClick(authMode === 'signup' ? 'btn_complete_signup' : 'btn_login');
    try {
      if (authMode === 'signup') {
        const res = await fetch(`${API_BASE}/api/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: authForm.full_name,
            auth_method: selectedChannel,
            contact_handle: authForm.contact_handle,
            pin: authForm.pin,
            otp_code: authForm.otp_code,
            agreed_to_terms: agreedTerms
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Sign-up failed.');
        setCurrentUser(data);
        setOtpSent(false);
        setDemoOtpHint(null);
        setAuthForm({ full_name: '', contact_handle: '', pin: '', otp_code: '' });
      } else {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contact_handle: authForm.contact_handle,
            pin: authForm.pin
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Login failed.');
        setCurrentUser(data);
        setAuthForm({ full_name: '', contact_handle: '', pin: '', otp_code: '' });
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!formData.event_date) {
      setBookingResponse({ type: 'error', text: 'Please select an event date from the availability calendar.' });
      return;
    }
    if (!formData.payment_reference.trim()) {
      setBookingResponse({ type: 'error', text: 'Please enter your downpayment transaction reference number to reserve the date.' });
      return;
    }
    setLoading(true);
    setBookingResponse(null);
    setCopiedReminders(false);
    trackClick('btn_confirm_booking_with_dp');
    try {
      const res = await fetch(`${API_BASE}/api/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          head_count: heads,
          downpayment_amount: calculatedDownpayment
        })
      });
      const data = await res.json();
      if (!res.ok) {
        const errorMsg = Array.isArray(data.detail)
          ? data.detail.map(e => `${e.loc?.[e.loc.length - 1] || 'Field'}: ${e.msg}`).join(', ')
          : (typeof data.detail === 'string' ? data.detail : 'Booking failed');
        throw new Error(errorMsg);
      }
      if (currentUser) fetchClientBookings(currentUser.contact_handle);
    } catch (err) {
      setBookingResponse({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const sendConciergeMessage = async (questionText) => {
    if (!currentUser || !questionText.trim()) return;
    setChatLoading(true);
    setConciergeResult(null);
    trackClick('btn_ask_glam_concierge');
    try {
      const formattedContact = `${currentUser.auth_method.toUpperCase()}: ${currentUser.contact_handle}`;
      const res = await fetch(`${API_BASE}/api/inquire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: currentUser.full_name,
          contact_channel: formattedContact,
          message: questionText
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Concierge request failed');
      setConciergeResult(data);
      setConciergeQuestion('');
    } catch (err) {
      setConciergeResult({ ai_reply: 'Unable to reach Glam Concierge right now. Please try again.', packages: [], latency_ms: 0 });
    } finally {
      setChatLoading(false);
    }
  };

  const handleConciergeSubmit = (e) => {
    e.preventDefault();
    sendConciergeMessage(conciergeQuestion);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    trackClick('btn_submit_review');
    try {
      const res = await fetch(`${API_BASE}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReview)
      });
      if (res.ok) {
        setReviewSubmitted(true);
        setNewReview({ name: currentUser ? currentUser.full_name : '', comment: '', rating: 5 });
      }
    } catch (err) {
      console.error('Failed to submit review', err);
    }
  };

  const renderInteractiveCalendar = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayIdx = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthLabel = calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
    const todayStr = new Date().toISOString().split('T')[0];

    const cells = [];
    for (let i = 0; i < firstDayIdx; i++) {
      cells.push(<div key={`empty-${i}`} className="h-10" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const info = availabilityMap[dateStr];
      const isSelected = formData.event_date === dateStr;
      const isPast = dateStr < todayStr;

      let statusStyle = 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-pink-500/60';
      let badgeDot = null;

      if (isPast) {
        statusStyle = 'bg-neutral-950/40 border-neutral-900 text-neutral-600 cursor-not-allowed';
      } else if (info?.status === 'hot') {
        statusStyle = 'bg-rose-950/60 border-rose-500/70 text-rose-200 hover:bg-rose-900/60';
        badgeDot = <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />;
      } else if (info?.status === 'booked') {
        statusStyle = 'bg-amber-950/50 border-amber-500/60 text-amber-200 hover:bg-amber-900/50';
        badgeDot = <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />;
      }

      if (isSelected) {
        statusStyle = 'bg-pink-600 border-pink-400 text-white font-bold shadow-lg shadow-pink-600/30 scale-105';
      }

      cells.push(
        <button
          type="button"
          key={dateStr}
          disabled={isPast}
          onClick={() => {
            trackClick('calendar_date_select');
            setFormData({ ...formData, event_date: dateStr });
          }}
          className={`h-11 rounded-xl border text-xs flex flex-col items-center justify-center gap-0.5 transition duration-200 ${statusStyle}`}
        >
          <span>{day}</span>
          {!isPast && badgeDot}
        </button>
      );
    }

    return (
      <div className="bg-neutral-950/90 border border-neutral-800 rounded-2xl p-4 space-y-3">
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={() => setCalendarMonth(new Date(year, month - 1, 1))}
            className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 hover:text-white"
          >
            Prev
          </button>
          <span className="text-sm font-bold text-white tracking-wide">{monthLabel}</span>
          <button
            type="button"
            onClick={() => setCalendarMonth(new Date(year, month + 1, 1))}
            className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 hover:text-white"
          >
            Next
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-neutral-500">
          <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
        </div>

        <div className="grid grid-cols-7 gap-1.5">{cells}</div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-800/80 text-[11px] text-neutral-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-neutral-900 border border-neutral-700 inline-block" /> Open
          </span>
          <span className="flex items-center gap-1.5 text-amber-300">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-950 border border-amber-500 inline-block" /> Partial Bookings
          </span>
          <span className="flex items-center gap-1.5 text-rose-300">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-950 border border-rose-500 inline-block" /> Hot Date (Book Fast!)
          </span>
        </div>
      </div>
    );
  };

  const activeChannelObj = AUTH_CHANNELS.find(c => c.id === selectedChannel) || AUTH_CHANNELS[0];
  const estimatedBlockMinutes = heads * 40 + 60;

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-950 to-black text-neutral-100 flex flex-col font-sans">

      {/* Navigation Bar */}
      <nav className="border-b border-neutral-800 bg-neutral-950/85 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <button
          onClick={() => { trackClick('nav_logo'); setActiveTab('home'); }}
          className="flex items-center space-x-2 text-left"
        >
          <span className="text-xl">💄</span>
          <span className="font-bold text-lg tracking-wider text-white">
            GLAMSTUDIO <span className="text-pink-500 text-xs uppercase px-2 py-0.5 bg-pink-500/10 border border-pink-500/20 rounded-full">Atelier</span>
          </span>
        </button>

        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 text-sm font-medium">
          <button onClick={() => { trackClick('nav_home'); setActiveTab('home'); }} className={`px-3.5 py-2 rounded-lg transition ${activeTab === 'home' ? 'bg-pink-600 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'}`}>Home</button>
          <button onClick={() => { trackClick('nav_portfolio'); setActiveTab('portfolio'); }} className={`px-3.5 py-2 rounded-lg transition ${activeTab === 'portfolio' ? 'bg-pink-600 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'}`}>Portfolio</button>
          <button onClick={() => { trackClick('nav_book'); setActiveTab('book'); }} className={`px-3.5 py-2 rounded-lg transition ${activeTab === 'book' ? 'bg-pink-600 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'}`}>Book Session</button>
          <button onClick={() => { trackClick('nav_concierge'); setActiveTab('concierge'); }} className={`px-3.5 py-2 rounded-lg transition ${activeTab === 'concierge' ? 'bg-pink-600 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'}`}>Glam Concierge</button>
          <button onClick={() => { trackClick('nav_reviews'); setActiveTab('reviews'); }} className={`px-3.5 py-2 rounded-lg transition ${activeTab === 'reviews' ? 'bg-pink-600 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'}`}>Client Love</button>
          <button onClick={() => { trackClick('nav_account'); setActiveTab('account'); }} className={`px-3.5 py-2 rounded-lg border transition ${activeTab === 'account' ? 'bg-pink-600 border-pink-500 text-white' : currentUser ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300' : 'border-neutral-700 text-neutral-300 hover:bg-neutral-900'}`}>
            {currentUser ? `✓ ${currentUser.full_name.split(' ')[0]}` : 'Sign Up / Log In'}
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow p-4 sm:p-8 max-w-5xl mx-auto w-full">

        {/* TAB 1: HOME */}
        {activeTab === 'home' && (
          <div className="space-y-12 py-6">
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <span className="text-pink-500 font-semibold tracking-widest text-xs uppercase bg-pink-500/10 px-3 py-1 rounded-full border border-pink-500/20">
                On-Location Bridal & Editorial Artistry
              </span>
              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white">
                Luxury Mobile Makeup Artistry, Perfected.
              </h1>
              <p className="text-neutral-400 text-base sm:text-lg">
                Bespoke bridal, debut, and red-carpet glam delivered directly to your suite—backed by intelligent route scheduling.
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <button
                  onClick={() => { trackClick('hero_book_now'); setActiveTab('book'); }}
                  className="bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:opacity-95 hover:scale-[1.02] transition"
                >
                  Reserve Your Date
                </button>
                <button
                  onClick={() => { trackClick('hero_view_packages'); setActiveTab('concierge'); }}
                  className="bg-neutral-900 border border-neutral-700 text-white font-semibold py-3 px-6 rounded-xl hover:bg-neutral-800 transition"
                >
                  Check 2026 Packages & Rates
                </button>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">Featured Portfolio Work</h2>
                  <p className="text-xs text-neutral-400">Click any signature look to inspect techniques, inclusions, and artistry details.</p>
                </div>
                <button onClick={() => { trackClick('home_see_all_looks'); setActiveTab('portfolio'); }} className="text-xs text-pink-400 hover:text-pink-300 font-semibold">
                  View All Looks →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {PORTFOLIO_WORKS.slice(0, 3).map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => {
                      trackClick(`portfolio_card_${item.id}`);
                      setSelectedLook(item);
                      setActiveTab('portfolio');
                    }}
                    className="text-left bg-neutral-900 border border-neutral-800 hover:border-pink-500/50 rounded-2xl overflow-hidden shadow-xl group transition duration-300 hover:-translate-y-1"
                  >
                    <div className="h-52 overflow-hidden relative">
                      <img src={item.img} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                      <span className="absolute top-3 right-3 bg-black/70 backdrop-blur-md text-pink-300 text-[10px] font-semibold uppercase px-2.5 py-1 rounded-full border border-pink-500/30">
                        View Lookbook
                      </span>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-white group-hover:text-pink-400 transition">{item.title}</h3>
                      <p className="text-xs text-neutral-400 mt-1">{item.category}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 1B: FULL MAKEUP ARTIST PORTFOLIO SHOWCASE */}
        {activeTab === 'portfolio' && (
          <div className="space-y-8 py-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-800 pb-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-pink-500">Signature Artistry Archive</span>
                <h2 className="text-3xl font-extrabold text-white mt-1">Makeup Artist Lookbook & Services</h2>
                <p className="text-sm text-neutral-400 mt-1">Curated skin-first transformations crafted for high-definition photography and all-day wear.</p>
              </div>
              <button
                onClick={() => { trackClick('portfolio_book_session'); setActiveTab('book'); }}
                className="bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold px-5 py-3 rounded-xl transition shadow-lg"
              >
                Book This Artist
              </button>
            </div>

            {selectedLook && (
              <div className="bg-neutral-900 border border-pink-500/40 rounded-2xl overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-2">
                <div className="h-72 md:h-auto">
                  <img src={selectedLook.img} alt={selectedLook.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-6 sm:p-8 flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs uppercase font-bold text-pink-400">{selectedLook.category}</span>
                      <button onClick={() => setSelectedLook(null)} className="text-xs text-neutral-400 hover:text-white">Close Spotlight ✕</button>
                    </div>
                    <h3 className="text-2xl font-bold text-white">{selectedLook.title}</h3>
                    <p className="text-sm text-neutral-300 leading-relaxed">{selectedLook.description}</p>
                    <div className="pt-2 space-y-1.5">
                      {selectedLook.highlights.map((h, i) => (
                        <p key={i} className="text-xs text-emerald-300 flex items-center gap-2">
                          <span>✦</span> {h}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="pt-4 border-t border-neutral-800 flex items-center justify-between">
                    <span className="text-xs text-neutral-400">Est. Time: <b className="text-white">{selectedLook.duration}</b></span>
                    <button
                      onClick={() => {
                        trackClick(`book_from_spotlight_${selectedLook.id}`);
                        setActiveTab('book');
                      }}
                      className="bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition"
                    >
                      Reserve This Look
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {PORTFOLIO_WORKS.map((work) => (
                <div key={work.id} className="bg-neutral-900/90 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col justify-between shadow-xl">
                  <div>
                    <div className="h-64 overflow-hidden relative group">
                      <img src={work.img} alt={work.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent" />
                      <div className="absolute bottom-3 left-4">
                        <span className="text-[11px] uppercase tracking-wider text-pink-400 font-bold">{work.category}</span>
                        <h3 className="text-xl font-bold text-white">{work.title}</h3>
                      </div>
                    </div>
                    <div className="p-5 space-y-3">
                      <p className="text-xs text-neutral-300 leading-relaxed">{work.description}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {work.highlights.map((tag, idx) => (
                          <span key={idx} className="text-[10px] bg-neutral-950 border border-neutral-800 text-neutral-300 px-2.5 py-1 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="px-5 py-3.5 bg-neutral-950/60 border-t border-neutral-800 flex justify-between items-center">
                    <span className="text-[11px] text-neutral-400">{work.duration}</span>
                    <button
                      onClick={() => {
                        trackClick(`portfolio_select_${work.id}`);
                        setSelectedLook(work);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="text-xs font-semibold text-pink-400 hover:text-pink-300"
                    >
                      Inspect Details →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: BOOK SESSION (With Mandatory Downpayment Gate & Automated Prep Reminders) */}
        {activeTab === 'book' && (
          <div className="max-w-2xl mx-auto bg-neutral-900/85 border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Reserve Your Glam Session</h2>
              <p className="text-neutral-400 text-sm mt-1">
                {currentUser
                  ? `Signed in as ${currentUser.full_name} — we will follow up via your verified ${currentUser.auth_method.toUpperCase()}.`
                  : 'Select an available date and complete your 50% reservation downpayment to lock your slot.'}
              </p>
            </div>

            {!currentUser && (
              <div className="p-3.5 rounded-xl bg-pink-950/30 border border-pink-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-pink-200">Want automatic follow-ups via TikTok, Instagram, Facebook, or SMS?</p>
                <button
                  type="button"
                  onClick={() => { trackClick('book_banner_signup'); setActiveTab('account'); }}
                  className="text-xs bg-pink-600 hover:bg-pink-500 text-white px-3.5 py-1.5 rounded-lg font-semibold whitespace-nowrap"
                >
                  Quick Sign Up First
                </button>
              </div>
            )}

            <form onSubmit={handleBookingSubmit} className="space-y-5">
              {/* Auto-filled Contact Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">Client Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                    placeholder="Maria Clara"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white text-sm focus:border-pink-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">Preferred Follow-Up Channel</label>
                  <input
                    type="text"
                    required
                    value={formData.client_contact}
                    onChange={(e) => setFormData({ ...formData, client_contact: e.target.value })}
                    placeholder="TIKTOK: @yourhandle or 0917..."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white text-sm focus:border-pink-500 outline-none"
                  />
                </div>
              </div>

              {/* Event Type Input */}
              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">Event Type / Occasion</label>
                <select
                  value={formData.event_type}
                  onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white text-sm focus:border-pink-500 outline-none"
                >
                  {EVENT_TYPES.map((ev) => (
                    <option key={ev.name} value={ev.name}>{ev.name}</option>
                  ))}
                </select>
              </div>

              {/* Color-Coded Interactive Hot-Date Calendar */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold uppercase text-neutral-400">Select Event Date</label>
                  <span className="text-xs font-bold text-pink-400">
                    {formData.event_date ? `Selected: ${formData.event_date}` : 'Tap a date on the calendar'}
                  </span>
                </div>
                {renderInteractiveCalendar()}
              </div>

              {/* 24-Hour Start Time + Estimated Time Block */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-neutral-950/70 border border-neutral-800 p-4 rounded-xl space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-semibold uppercase text-neutral-400">Start Time (24-Hr)</label>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-pink-500/15 text-pink-300 border border-pink-500/30">
                      {format24To12Hour(formData.start_time) || 'Select Time'}
                    </span>
                  </div>
                  <input
                    type="time"
                    required
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-white text-sm focus:border-pink-500 outline-none"
                  />
                  <p className="text-[11px] text-neutral-500">
                    Equivalent: <b className="text-neutral-300">{format24To12Hour(formData.start_time)}</b>
                  </p>
                </div>

                <div className="bg-neutral-950/70 border border-neutral-800 p-4 rounded-xl flex flex-col justify-between">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">Head Count</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      required
                      value={formData.head_count}
                      onChange={(e) => setFormData({ ...formData, head_count: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-white text-sm focus:border-pink-500 outline-none"
                    />
                  </div>
                  <div className="pt-2 flex justify-between items-baseline">
                    <span className="text-[11px] text-neutral-400">Estimated Time Block:</span>
                    <span className="text-sm font-bold text-pink-400">~{estimatedBlockMinutes} mins</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">Event Location / Venue</label>
                <input
                  type="text"
                  required
                  value={formData.location_address}
                  onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
                  placeholder="e.g., Makati Shangri-La or Tagaytay Highlands"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white text-sm focus:border-pink-500 outline-none"
                />
              </div>

              {/* MANDATORY DOWNPAYMENT GATE */}
              <div className="bg-gradient-to-br from-neutral-950 via-neutral-950 to-amber-950/20 border border-amber-500/40 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Step 2: Reservation Downpayment Required</span>
                    <h3 className="text-base font-bold text-white">50% Date-Lock Downpayment</h3>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-[11px] text-neutral-400 block">Required Reservation Fee</span>
                    <span className="text-xl font-extrabold text-amber-400">PHP {calculatedDownpayment.toLocaleString()}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-2">Choose Payment Channel</label>
                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_CHANNELS.map((ch) => (
                      <button
                        type="button"
                        key={ch.id}
                        onClick={() => setFormData({ ...formData, payment_method: ch.id })}
                        className={`py-2 px-2 rounded-lg text-xs font-bold border transition ${formData.payment_method === ch.id ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'}`}
                      >
                        {ch.id}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-neutral-900/90 border border-neutral-800 p-3.5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                  <div>
                    <span className="text-neutral-400 block">Send PHP {calculatedDownpayment.toLocaleString()} to:</span>
                    <b className="text-white">{activePaymentChannel.accountName}</b>
                  </div>
                  <span className="font-mono text-amber-300 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg">
                    {activePaymentChannel.accountNumber}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">
                    Transaction Reference Number <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.payment_reference}
                    onChange={(e) => setFormData({ ...formData, payment_reference: e.target.value })}
                    placeholder="Enter GCash / Maya / Bank Ref # (e.g., GC-90482173)"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white font-mono text-sm focus:border-amber-400 outline-none"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Your date cannot be reserved without a valid downpayment reference number.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:opacity-95 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-pink-600/20"
              >
                {loading ? 'Submitting Downpayment & Locking Date...' : `Submit Downpayment (PHP ${calculatedDownpayment.toLocaleString()}) & Lock Date`}
              </button>
            </form>

            {/* Celebratory Confirmation + Automated Booking Reminders & Prep Policies */}
            {bookingResponse && bookingResponse.type === 'success' && (
              <div className="mt-6 space-y-4">
                <div className="p-6 rounded-2xl border border-pink-400/50 bg-gradient-to-br from-pink-950/60 via-neutral-900 to-emerald-950/40 shadow-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                      ✨ Downpayment Logged • Ref #{bookingResponse.data.booking_id}
                    </span>
                    <span className="text-xs font-mono text-amber-300">
                      {bookingResponse.data.payment_method}: {bookingResponse.data.payment_reference}
                    </span>
                  </div>

                  <h3 className="text-xl font-extrabold text-white">
                    Thank You, {bookingResponse.data.client}! Your Glam Date is Held.
                  </h3>
                  <p className="text-sm text-neutral-200 mt-2 leading-relaxed">{bookingResponse.data.message}</p>

                  <div className="mt-4 pt-4 border-t border-neutral-800/80 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-neutral-300">
                    <div>
                      <span className="text-neutral-500 block">Occasion</span>
                      <b>{bookingResponse.data.event_type}</b>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Date & Call Time</span>
                      <b>{bookingResponse.data.event_date} @ {bookingResponse.data.start_time}</b>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Downpayment Paid</span>
                      <b className="text-amber-300">PHP {bookingResponse.data.downpayment_amount?.toLocaleString()}</b>
                    </div>
                  </div>
                </div>

                {/* Automated Booking Reminders & Client Prep Policies Card */}
                {bookingResponse.data.automated_reminders_and_policies && (
                  <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-pink-400">
                        📋 Automated Glam Prep Reminders & Booking Policies
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(bookingResponse.data.automated_reminders_and_policies.join('\n'));
                          setCopiedReminders(true);
                        }}
                        className="text-[11px] bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1 rounded-lg font-semibold"
                      >
                        {copiedReminders ? '✓ Copied!' : 'Copy Checklist'}
                      </button>
                    </div>
                    <ul className="space-y-2 text-xs text-neutral-300 leading-relaxed">
                      {bookingResponse.data.automated_reminders_and_policies.map((rule, idx) => (
                        <li key={idx} className="bg-neutral-900/70 border border-neutral-800/80 p-2.5 rounded-lg">
                          {rule}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {bookingResponse && bookingResponse.type === 'error' && (
              <div className="mt-6 p-4 bg-rose-950/50 border border-rose-500/30 rounded-xl text-rose-300 text-sm">
                <p>{bookingResponse.text}</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: GLAM CONCIERGE (With Automated Marketing Packages & Rate Card) */}
        {activeTab === 'concierge' && (
          <div className="max-w-3xl mx-auto bg-neutral-900/85 border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-pink-400">24/7 Beauty & Packages Advisor</span>
              <h2 className="text-2xl font-bold text-white mt-1">Glam Concierge & 2026 Packages</h2>
              <p className="text-neutral-400 text-sm mt-1">
                Request our automated 2026 Service & Rate Card or ask about bridal timelines and out-of-town travel buffers.
              </p>
            </div>

            {!currentUser ? (
              <div className="bg-neutral-950 border border-pink-500/30 rounded-2xl p-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-pink-500/10 border border-pink-500/30 flex items-center justify-center mx-auto text-xl">
                  ✨
                </div>
                <h3 className="text-lg font-bold text-white">Verify Your Contact Channel First</h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto leading-relaxed">
                  Sign up or log in with your TikTok, Instagram, Facebook, Mobile Number, or Email so Glam Concierge can send our 2026 Packages & Rate Card directly to you.
                </p>
                <button
                  type="button"
                  onClick={() => { trackClick('concierge_gate_signup'); setActiveTab('account'); }}
                  className="bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold px-6 py-3 rounded-xl transition shadow-lg"
                >
                  Quick Sign Up / Log In to Unlock
                </button>
              </div>
            ) : (
              <>
                <div className="bg-neutral-950 border border-neutral-800 p-3.5 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Sending assets to: <b className="text-white">{currentUser.full_name}</b></span>
                  <span className="text-emerald-400 font-semibold uppercase">{currentUser.auth_method}: {currentUser.contact_handle}</span>
                </div>

                {/* Instant One-Tap Marketing Asset Prompts */}
                <div className="space-y-2">
                  <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold block">Instant Concierge Requests:</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Send me your 2026 Bridal & Entourage Packages & Rates',
                      'What are your Debut & Red Carpet Glam prices?',
                      'How much is the travel buffer for Tagaytay or Cavite?'
                    ].map((preset, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => sendConciergeMessage(preset)}
                        className="text-xs bg-neutral-950 hover:bg-pink-950/40 border border-neutral-800 hover:border-pink-500/50 text-pink-300 px-3.5 py-2 rounded-xl transition"
                      >
                        ✦ {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleConciergeSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">Or Type Your Custom Inquiry</label>
                    <textarea
                      rows="2"
                      required
                      value={conciergeQuestion}
                      onChange={(e) => setConciergeQuestion(e.target.value)}
                      placeholder="Ask about group discounts, airbrush upgrades, or early call times..."
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white text-sm focus:border-pink-500 outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={chatLoading}
                    className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:opacity-95 text-white font-bold py-3 rounded-xl transition shadow-lg"
                  >
                    {chatLoading ? 'Generating Concierge Package Kit...' : 'Request Prices, Packages & Advice'}
                  </button>
                </form>

                {conciergeResult && (
                  <div className="space-y-5 pt-2">
                    <div className="p-5 rounded-2xl border border-pink-400/40 bg-gradient-to-br from-pink-950/40 via-neutral-950 to-sky-950/30 space-y-2.5 shadow-xl">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold uppercase tracking-wider text-pink-300 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Glam Concierge Automated Dispatch
                        </span>
                        <span className="text-neutral-500">{conciergeResult.latency_ms}ms</span>
                      </div>
                      <p className="text-neutral-100 text-sm leading-relaxed">{conciergeResult.ai_reply}</p>
                    </div>

                    {/* Automated Marketing Package Cards */}
                    {conciergeResult.packages && conciergeResult.packages.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                          ✨ 2026 Official Service & Rate Card
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {conciergeResult.packages.map((pkg) => (
                            <div key={pkg.id} className="bg-neutral-950 border border-neutral-800 hover:border-pink-500/40 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                              <div className="space-y-2">
                                <div className="flex justify-between items-start gap-2">
                                  <h4 className="font-bold text-white text-base">{pkg.name}</h4>
                                  <span className="text-sm font-extrabold text-pink-400 whitespace-nowrap">
                                    PHP {pkg.price_php.toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-[11px] text-amber-300 font-semibold">
                                  50% Reservation Downpayment: PHP {pkg.downpayment_php.toLocaleString()}
                                </p>
                                <p className="text-[11px] text-neutral-400">{pkg.duration}</p>
                                <ul className="space-y-1 pt-2 border-t border-neutral-800/80 text-xs text-neutral-300">
                                  {pkg.inclusions.map((inc, i) => (
                                    <li key={i}>• {inc}</li>
                                  ))}
                                </ul>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  trackClick(`concierge_book_pkg_${pkg.id}`);
                                  setFormData(prev => ({ ...prev, event_type: pkg.event_type }));
                                  setActiveTab('book');
                                }}
                                className="w-full bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold py-2.5 rounded-xl transition"
                              >
                                Select & Book This Package →
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 4: CLIENT LOVE */}
        {activeTab === 'reviews' && (
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-pink-400">Verified Client Stories</span>
              <h2 className="text-3xl font-extrabold text-white">Client Love & Testimonials</h2>
              <p className="text-xs text-neutral-400">Real experiences from brides, debutantes, and creative directors.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {reviews.map((rev) => (
                <div key={rev.id} className="bg-neutral-900/80 border border-neutral-800 p-5 rounded-2xl flex flex-col justify-between shadow-lg">
                  <p className="text-neutral-300 text-sm italic mb-4">"{rev.comment}"</p>
                  <div className="flex justify-between items-center border-t border-neutral-800/80 pt-3">
                    <span className="font-semibold text-white text-sm">{rev.name}</span>
                    <span className="text-pink-400 text-xs">{'⭐'.repeat(rev.rating)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-xl space-y-4">
              <h3 className="font-bold text-white text-lg">Share Your Glam Experience</h3>
              <form onSubmit={handleReviewSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Your Name"
                    value={newReview.name}
                    onChange={(e) => setNewReview({ ...newReview, name: e.target.value })}
                    className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white text-sm focus:border-pink-500 outline-none"
                  />
                  <select
                    value={newReview.rating}
                    onChange={(e) => setNewReview({ ...newReview, rating: parseInt(e.target.value, 10) })}
                    className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white text-sm focus:border-pink-500 outline-none"
                  >
                    <option value="5">5/5 Stars — Flawless</option>
                    <option value="4">4/5 Stars — Loved It</option>
                    <option value="3">3/5 Stars — Good</option>
                  </select>
                </div>
                <textarea
                  rows="3"
                  required
                  placeholder="Tell future brides and clients about your makeup session..."
                  value={newReview.comment}
                  onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white text-sm focus:border-pink-500 outline-none"
                />
                <button type="submit" className="w-full bg-pink-600 hover:bg-pink-500 text-white font-semibold py-2.5 rounded-xl text-sm transition">
                  Submit Review
                </button>
              </form>
              {reviewSubmitted && (
                <p className="text-xs text-emerald-400 mt-2 text-center">Thank you! Your review has been received and will appear once verified.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: MULTI-CHANNEL SIGN-UP & LOG-IN WITH OTP + TERMS */}
        {activeTab === 'account' && (
          <div className="max-w-lg mx-auto bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            {currentUser ? (
              <div className="space-y-6">
                <div className="flex justify-between items-start border-b border-neutral-800 pb-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                      ✓ OTP Verified via {currentUser.auth_method}
                    </span>
                    <h2 className="text-2xl font-bold text-white mt-2">{currentUser.full_name}</h2>
                    <p className="text-xs text-neutral-400 mt-0.5">{currentUser.contact_handle}</p>
                  </div>
                  <button
                    onClick={() => { trackClick('btn_logout'); setCurrentUser(null); setMyBookings([]); }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
                  >
                    Log Out
                  </button>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">Your Reserved Sessions ({myBookings.length})</h3>
                  {myBookings.length === 0 ? (
                    <div className="bg-neutral-950 border border-neutral-800 p-5 rounded-xl text-center space-y-3">
                      <p className="text-xs text-neutral-400">No upcoming glam sessions scheduled yet.</p>
                      <button
                        onClick={() => { trackClick('account_book_now'); setActiveTab('book'); }}
                        className="text-xs bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 rounded-lg font-semibold transition"
                      >
                        Reserve a Date
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {myBookings.map((b) => (
                        <div key={b.id} className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl flex justify-between items-center gap-2">
                          <div>
                            <p className="text-sm font-bold text-white">{b.event_type} • {b.event_date}</p>
                            <p className="text-xs text-neutral-400">{b.start_time} ({format24To12Hour(b.start_time)}) • DP: PHP {b.downpayment_amount?.toLocaleString()}</p>
                          </div>
                          <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${b.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                            {b.status === 'confirmed' ? 'Confirmed' : 'Verifying DP'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="flex bg-neutral-950 p-1 rounded-xl border border-neutral-800">
                  <button
                    onClick={() => { setAuthMode('signup'); setAuthError(null); setOtpSent(false); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${authMode === 'signup' ? 'bg-pink-600 text-white' : 'text-neutral-400 hover:text-white'}`}
                  >
                    Quick Sign Up
                  </button>
                  <button
                    onClick={() => { setAuthMode('login'); setAuthError(null); setOtpSent(false); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${authMode === 'login' ? 'bg-pink-600 text-white' : 'text-neutral-400 hover:text-white'}`}
                  >
                    Log In
                  </button>
                </div>

                <div>
                  <h2 className="text-xl font-bold text-white">{authMode === 'signup' ? 'Create Your Verified Glam Pass' : 'Welcome Back'}</h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    {authMode === 'signup'
                      ? 'Choose TikTok, Instagram, Facebook, Mobile Number, or Email and verify with a 6-digit OTP.'
                      : 'Sign in with your registered contact handle and 4-digit PIN.'}
                  </p>
                </div>

                {authMode === 'signup' && (
                  <div>
                    <label className="block text-xs font-semibold uppercase text-neutral-400 mb-2">Preferred Contact Channel</label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {AUTH_CHANNELS.map((ch) => (
                        <button
                          type="button"
                          key={ch.id}
                          onClick={() => { setSelectedChannel(ch.id); setOtpSent(false); }}
                          className={`py-2 px-2 rounded-lg text-xs font-semibold border transition ${selectedChannel === ch.id ? 'bg-pink-600/20 border-pink-500 text-pink-300' : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'}`}
                        >
                          {ch.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  {authMode === 'signup' && (
                    <div>
                      <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        disabled={otpSent}
                        value={authForm.full_name}
                        onChange={(e) => setAuthForm({ ...authForm, full_name: e.target.value })}
                        placeholder="Maria Clara"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white text-sm focus:border-pink-500 outline-none disabled:opacity-60"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">
                      {authMode === 'signup' ? `${activeChannelObj.label} Handle / Contact` : 'TikTok / Instagram / Facebook / Mobile / Email'}
                    </label>
                    <input
                      type="text"
                      required
                      disabled={authMode === 'signup' && otpSent}
                      value={authForm.contact_handle}
                      onChange={(e) => setAuthForm({ ...authForm, contact_handle: e.target.value })}
                      placeholder={authMode === 'signup' ? activeChannelObj.placeholder : '@tiktok, @ig, 0917..., or email'}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white text-sm focus:border-pink-500 outline-none disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">Create 4-Digit Security PIN</label>
                    <input
                      type="password"
                      required
                      minLength="4"
                      disabled={authMode === 'signup' && otpSent}
                      value={authForm.pin}
                      onChange={(e) => setAuthForm({ ...authForm, pin: e.target.value })}
                      placeholder="••••"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white text-sm focus:border-pink-500 outline-none disabled:opacity-60"
                    />
                  </div>

                  {authMode === 'signup' && (
                    <div className="bg-neutral-950/80 border border-neutral-800 p-3.5 rounded-xl flex items-start gap-3">
                      <input
                        id="terms-check"
                        type="checkbox"
                        checked={agreedTerms}
                        onChange={(e) => setAgreedTerms(e.target.checked)}
                        className="mt-0.5 accent-pink-600 w-4 h-4 cursor-pointer"
                      />
                      <label htmlFor="terms-check" className="text-xs text-neutral-300 leading-relaxed">
                        I confirm my details are accurate and agree to the{' '}
                        <button
                          type="button"
                          onClick={() => setShowTermsModal(true)}
                          className="text-pink-400 underline hover:text-pink-300 font-semibold"
                        >
                          Terms of Service, Downpayment Policy & Data Privacy Agreement
                        </button>.
                      </label>
                    </div>
                  )}

                  {authMode === 'signup' && otpSent && (
                    <div className="bg-emerald-950/30 border border-emerald-500/40 p-4 rounded-xl space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-emerald-300">Enter 6-Digit Verification OTP</span>
                        {demoOtpHint && (
                          <span className="text-[11px] bg-emerald-500/20 text-emerald-200 px-2 py-0.5 rounded font-mono">
                            Demo Code: {demoOtpHint}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        maxLength="6"
                        value={authForm.otp_code}
                        onChange={(e) => setAuthForm({ ...authForm, otp_code: e.target.value })}
                        placeholder="123456"
                        className="w-full bg-neutral-950 border border-emerald-500/50 rounded-lg p-3 text-center tracking-[0.5em] font-mono text-lg text-white outline-none"
                      />
                    </div>
                  )}

                  {authError && (
                    <p className="text-xs text-rose-400 bg-rose-950/40 p-3 rounded-lg border border-rose-500/30">{authError}</p>
                  )}

                  {authMode === 'signup' && !otpSent ? (
                    <button
                      type="button"
                      onClick={handleRequestOtp}
                      disabled={authLoading}
                      className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 rounded-xl text-sm transition shadow-lg"
                    >
                      {authLoading ? 'Sending Verification Code...' : `Send Verification Code to ${activeChannelObj.label}`}
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:opacity-95 text-white font-bold py-3 rounded-xl text-sm transition shadow-lg"
                    >
                      {authLoading ? 'Verifying...' : authMode === 'signup' ? 'Verify OTP & Activate Account' : 'Log In to Portal'}
                    </button>
                  )}
                </form>
              </>
            )}
          </div>
        )}

      </main>

      {/* Terms & Conditions Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 max-w-lg w-full rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <h3 className="text-lg font-bold text-white">Terms, Downpayment Policy & Data Privacy</h3>
              <button onClick={() => setShowTermsModal(false)} className="text-neutral-400 hover:text-white text-sm">✕</button>
            </div>
            <div className="text-xs text-neutral-300 space-y-3 max-h-72 overflow-y-auto pr-2 leading-relaxed">
              <p><b>1. Privacy-First Data Protection:</b> Your contact details (TikTok, Instagram, Facebook, Mobile Number, or Email) are encrypted and strictly used for appointment coordination. We never expose your name or schedule publicly.</p>
              <p><b>2. Mandatory 50% Reservation Downpayment:</b> Dates are only held upon submission of a valid GCash, Maya, or Bank Transfer reference number. Downpayments are non-refundable but transferable once if rescheduled at least 7 days prior.</p>
              <p><b>3. Travel & Preparation Buffers:</b> Metro Manila sessions include a 60-minute logistics buffer; out-of-town venues (Cavite, Laguna, Tagaytay, Rizal, Batangas) include a 120-minute buffer.</p>
              <p><b>4. Client Verification:</b> One-time passcodes (OTP) prevent spam reservations and protect real client time slots.</p>
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setAgreedTerms(true); setShowTermsModal(false); }}
                className="bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl"
              >
                I Agree & Accept
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-neutral-800 text-center py-6 text-xs text-neutral-500">
        © 2026 GlamStudio Atelier • Privacy-First Mobile Artistry & Intelligent Scheduling
      </footer>
    </div>
  );
}

export default App;