import React, { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '[http://127.0.0.1:8000](http://127.0.0.1:8000)';

function AdminApp() {
  const [adminKey, setAdminKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [activeSection, setActiveSection] = useState('overview'); // 'overview' | 'logistics' | 'telemetry' | 'moderation'

  const fetchExecutiveData = async (keyToUse = adminKey) => {
    setLoading(true);
    setAuthError(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/analytics`, {
        headers: { 'x-admin-key': keyToUse }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Invalid Security Key');
      setAnalytics(data);
      setIsAuthenticated(true);
    } catch (err) {
      setAuthError(err.message);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    fetchExecutiveData(adminKey);
  };

  const handleConfirmFlaggedBooking = async (bookingId) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/bookings/${bookingId}/confirm`, {
        method: 'PATCH',
        headers: { 'x-admin-key': adminKey }
      });
      if (res.ok) fetchExecutiveData();
    } catch (err) {
      console.error('Override failed', err);
    }
  };

  const handleRejectBooking = async (bookingId) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/bookings/${bookingId}/reject`, {
        method: 'PATCH',
        headers: { 'x-admin-key': adminKey }
      });
      if (res.ok) fetchExecutiveData();
    } catch (err) {
      console.error('Rejection failed', err);
    }
  };

  const handleApproveReview = async (reviewId) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/reviews/${reviewId}/approve`, {
        method: 'PATCH',
        headers: { 'x-admin-key': adminKey }
      });
      if (res.ok) fetchExecutiveData();
    } catch (err) {
      console.error('Review approval failed', err);
    }
  };

  // SECURE OWNER LOGIN GATE
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="space-y-2 text-center">
            <span className="inline-block text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
              Restricted Executive Portal
            </span>
            <h1 className="text-2xl font-extrabold text-white">GlamStudio Command Center</h1>
            <p className="text-xs text-neutral-400">
              Isolated Owner & Operations Analytics. Enter your RBAC Admin Secret Key to unlock business telemetry.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5">Owner Security Key</label>
              <input
                type="password"
                required
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 text-white text-sm focus:border-amber-500 outline-none"
              />
            </div>

            {authError && (
              <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-500/30 p-3 rounded-lg">
                Access Denied: {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-95 text-neutral-950 font-extrabold py-3.5 rounded-xl text-sm transition shadow-lg"
            >
              {loading ? 'Authenticating...' : 'Unlock Command Center'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const {
    kpis,
    marketing_channels,
    event_types,
    button_heat_index,
    visual_retention_index,
    strategic_insights,
    pending_bookings,
    confirmed_list,
    pending_reviews,
    inquiries_list
  } = analytics;

  const maxClicks = button_heat_index.length > 0 ? Math.max(...button_heat_index.map(b => b.clicks)) : 1;
  const maxRetention = visual_retention_index.length > 0 ? Math.max(...visual_retention_index.map(v => v.avg_seconds)) : 1;
  const conversionRate = kpis.total_signups > 0
    ? Math.round(((kpis.confirmed_bookings + kpis.flagged_bookings) / kpis.total_signups) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">

      {/* Executive Top Bar */}
      <header className="border-b border-neutral-800 bg-neutral-900/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
            GS
          </div>
          <div>
            <h1 className="font-bold text-base text-white tracking-wide">GLAMSTUDIO EXECUTIVE OPS</h1>
            <p className="text-[11px] text-emerald-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Live Telemetry & Business Intelligence
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setActiveSection('overview')} className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition ${activeSection === 'overview' ? 'bg-amber-500 text-neutral-950' : 'bg-neutral-950 text-neutral-400 hover:text-white'}`}>
            Executive Overview
          </button>
          <button onClick={() => setActiveSection('logistics')} className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${activeSection === 'logistics' ? 'bg-amber-500 text-neutral-950' : 'bg-neutral-950 text-neutral-400 hover:text-white'}`}>
            Schedule & Logistics
            {pending_bookings.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-rose-600 text-white font-bold">
                {pending_bookings.length}
              </span>
            )}
          </button>
          <button onClick={() => setActiveSection('telemetry')} className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition ${activeSection === 'telemetry' ? 'bg-amber-500 text-neutral-950' : 'bg-neutral-950 text-neutral-400 hover:text-white'}`}>
            Heat Index & Retention
          </button>
          <button onClick={() => setActiveSection('moderation')} className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition ${activeSection === 'moderation' ? 'bg-amber-500 text-neutral-950' : 'bg-neutral-950 text-neutral-400 hover:text-white'}`}>
            Concierge & Reviews
          </button>
          <button onClick={() => fetchExecutiveData()} className="px-3 py-2 rounded-lg text-xs bg-neutral-800 hover:bg-neutral-700 text-white font-medium">
            Refresh
          </button>
          <button onClick={() => { setIsAuthenticated(false); setAdminKey(''); }} className="px-3 py-2 rounded-lg text-xs bg-rose-950/60 border border-rose-500/30 text-rose-300 hover:bg-rose-900/60">
            Lock
          </button>
        </div>
      </header>

      <main className="flex-grow max-w-6xl w-full mx-auto p-4 sm:p-8 space-y-8">

        {/* Top KPI Scorecard Strip */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'Verified Revenue', value: `₱${(kpis.verified_revenue_php || 0).toLocaleString()}`, accent: 'text-emerald-400' },
            { label: 'Pending Downpayments', value: `₱${(kpis.pending_revenue_php || 0).toLocaleString()}`, accent: 'text-amber-400' },
            { label: 'Confirmed Sessions', value: kpis.confirmed_bookings, accent: 'text-emerald-300' },
            { label: 'Awaiting Review', value: kpis.flagged_bookings, accent: 'text-orange-400' },
            { label: 'Total Glam Heads', value: kpis.total_heads_booked, accent: 'text-pink-400' },
            { label: 'Verified Sign-Ups', value: kpis.total_signups, accent: 'text-sky-400' },
            { label: 'Total Log-Ins', value: kpis.total_logins, accent: 'text-indigo-400' },
            { label: 'Tracked Clicks', value: kpis.total_clicks, accent: 'text-purple-400' },
            { label: 'Lead Conversion', value: `${conversionRate}%`, accent: 'text-teal-400' }
          ].map((stat, idx) => (
            <div key={idx} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">{stat.label}</span>
              <span className={`text-xl font-extrabold mt-2 ${stat.accent}`}>{stat.value}</span>
            </div>
          ))}
        </section>

        {/* Strategic Business Health & Actionable Recommendations */}
        <section className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-amber-950/20 border border-amber-500/30 rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-amber-400">
              Executive Business Pulse & Growth Recommendations
            </h2>
            <span className="text-[11px] text-neutral-400">Automated Operations Advisor</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {strategic_insights.map((tip, i) => (
              <div key={i} className="bg-neutral-950/80 border border-neutral-800 p-3.5 rounded-xl text-xs text-neutral-200 flex items-start gap-2.5">
                <span className="text-amber-400 font-bold">◆</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION: EXECUTIVE OVERVIEW (Marketing Attribution & Occasion Demand) */}
        {activeSection === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Marketing Channel Attribution */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">Marketing Channel Attribution</h3>
                <p className="text-xs text-neutral-400">Where your verified clients are discovering and signing up from.</p>
              </div>
              {Object.keys(marketing_channels).length === 0 ? (
                <p className="text-xs text-neutral-500 py-6 text-center">No verified client sign-ups recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(marketing_channels).map(([channel, count]) => {
                    const pct = Math.round((count / Math.max(kpis.total_signups, 1)) * 100);
                    return (
                      <div key={channel} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="uppercase font-bold text-neutral-200">{channel}</span>
                          <span className="text-neutral-400">{count} client(s) ({pct}%)</span>
                        </div>
                        <div className="w-full h-2.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                          <div className="h-full bg-gradient-to-r from-pink-500 to-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Event Type Demand Breakdown */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">Occasion & Service Mix</h3>
                <p className="text-xs text-neutral-400">Most requested event categories to guide portfolio & ad spend.</p>
              </div>
              {Object.keys(event_types).length === 0 ? (
                <p className="text-xs text-neutral-500 py-6 text-center">No bookings recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(event_types).map(([evType, count]) => {
                    const totalB = kpis.confirmed_bookings + kpis.flagged_bookings;
                    const pct = Math.round((count / Math.max(totalB, 1)) * 100);
                    return (
                      <div key={evType} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-neutral-200">{evType}</span>
                          <span className="text-neutral-400">{count} session(s) ({pct}%)</span>
                        </div>
                        <div className="w-full h-2.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                          <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION: SCHEDULE & MANUAL LOGISTICS OVERRIDE */}
        {(activeSection === 'logistics' || activeSection === 'overview') && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Flagged Overlapping Bookings Queue */}
            <div className="bg-neutral-900 border border-amber-500/30 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-amber-400">Manual Logistics Review Queue ({pending_bookings.length})</h3>
                  <p className="text-xs text-neutral-400">Overlapping or tight-buffer requests awaiting your route decision.</p>
                </div>
              </div>

              {pending_bookings.length === 0 ? (
                <p className="text-xs text-neutral-500 bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                  All schedules are clear—no overlapping bookings require manual review.
                </p>
              ) : (
                <div className="space-y-3">
                  {pending_bookings.map((b) => (
                    <div key={b.id} className="bg-neutral-950 border border-amber-500/30 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-white">{b.client_name}</p>
                          <span className="text-[11px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
                            {b.payment_method}: {b.payment_reference} (PHP {b.downpayment_amount?.toLocaleString()})
                          </span>
                        </div>
                        <p className="text-xs text-neutral-300">{b.event_type} • {b.event_date} ({b.start_time} - {b.end_time}, {b.head_count} head/s)</p>
                        <p className="text-xs text-neutral-400">Venue: {b.location_address} • Contact: <b className="text-neutral-200">{b.client_contact}</b></p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleConfirmFlaggedBooking(b.id)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition whitespace-nowrap"
                        >
                          Verify Payment & Confirm
                        </button>
                        <button
                          onClick={() => handleRejectBooking(b.id)}
                          className="bg-rose-950 hover:bg-rose-800 border border-rose-500/50 text-rose-200 text-xs font-bold px-3.5 py-2 rounded-lg transition whitespace-nowrap"
                        >
                          Reject / Invalid Ref
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirmed Master Schedule */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">Confirmed Master Schedule ({confirmed_list.length})</h3>
                <p className="text-xs text-neutral-400">Locked client sessions including dynamic travel buffers.</p>
              </div>

              {confirmed_list.length === 0 ? (
                <p className="text-xs text-neutral-500 bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                  No confirmed bookings yet.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {confirmed_list.map((b) => (
                    <div key={b.id} className="bg-neutral-950 border border-neutral-800 p-3.5 rounded-xl flex justify-between items-center">
                      <div>
                        <p className="text-sm font-bold text-white">{b.event_date} • {b.start_time} - {b.end_time}</p>
                        <p className="text-xs text-neutral-400">{b.client_name} ({b.event_type}) • {b.location_address}</p>
                      </div>
                      <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        +{b.travel_buffer_minutes}m Buffer
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION: BUTTON HEAT INDEX & VISUAL RETENTION INDEX */}
        {(activeSection === 'telemetry' || activeSection === 'overview') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Button Heat Index */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">Button Click Heat Index</h3>
                <p className="text-xs text-neutral-400">Highest-engagement CTAs and navigation elements across the client app.</p>
              </div>

              {button_heat_index.length === 0 ? (
                <p className="text-xs text-neutral-500 py-6 text-center">Interact with the client app to populate click heat data.</p>
              ) : (
                <div className="space-y-3">
                  {button_heat_index.map((item) => {
                    const widthPct = Math.max(12, Math.round((item.clicks / maxClicks) * 100));
                    return (
                      <div key={item.button} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-mono text-pink-300">{item.button}</span>
                          <span className="font-bold text-white">{item.clicks} clicks</span>
                        </div>
                        <div className="w-full h-2.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                          <div className="h-full bg-gradient-to-r from-rose-600 via-orange-500 to-amber-400 rounded-full" style={{ width: `${widthPct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Visual Retention Index */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">Visual Retention Index (Dwell Time)</h3>
                <p className="text-xs text-neutral-400">Average seconds visitors spend inspecting each page/tab before switching.</p>
              </div>

              {visual_retention_index.length === 0 ? (
                <p className="text-xs text-neutral-500 py-6 text-center">Switch between tabs in the client app to record dwell time.</p>
              ) : (
                <div className="space-y-3">
                  {visual_retention_index.map((item) => {
                    const widthPct = Math.max(15, Math.round((item.avg_seconds / maxRetention) * 100));
                    return (
                      <div key={item.section} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-mono text-sky-300">{item.section}</span>
                          <span className="text-neutral-300"><b>{item.avg_seconds}s</b> avg ({item.views} views)</span>
                        </div>
                        <div className="w-full h-2.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                          <div className="h-full bg-gradient-to-r from-sky-500 to-indigo-400 rounded-full" style={{ width: `${widthPct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION: CONCIERGE LEADS & REVIEW MODERATION */}
        {(activeSection === 'moderation' || activeSection === 'overview') && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* HITL Review Moderation */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">Review Moderation Queue ({pending_reviews.length})</h3>
                <p className="text-xs text-neutral-400">Approve verified client testimonials before they appear publicly.</p>
              </div>

              {pending_reviews.length === 0 ? (
                <p className="text-xs text-neutral-500 bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                  No pending reviews waiting for moderation.
                </p>
              ) : (
                <div className="space-y-3">
                  {pending_reviews.map((rev) => (
                    <div key={rev.id} className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl flex justify-between items-center gap-3">
                      <div>
                        <p className="text-sm font-bold text-white">{rev.name} <span className="text-amber-400 text-xs">({rev.rating}/5 ★)</span></p>
                        <p className="text-xs text-neutral-300 italic mt-1">"{rev.comment}"</p>
                      </div>
                      <button
                        onClick={() => handleApproveReview(rev.id)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition whitespace-nowrap"
                      >
                        Approve & Publish
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Glam Concierge Lead Follow-Up Log */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">Glam Concierge Lead Log ({inquiries_list.length})</h3>
                <p className="text-xs text-neutral-400">Verified client questions with direct TikTok/IG/FB/SMS contact handles for follow-up.</p>
              </div>

              {inquiries_list.length === 0 ? (
                <p className="text-xs text-neutral-500 bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                  No concierge inquiries logged yet.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {inquiries_list.map((inq) => (
                    <div key={inq.id} className="bg-neutral-950 border border-neutral-800 p-3.5 rounded-xl space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-white">{inq.name}</span>
                        <span className="text-[11px] font-semibold text-pink-400">{inq.contact_channel}</span>
                      </div>
                      <p className="text-xs text-neutral-300">"{inq.message}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default AdminApp;