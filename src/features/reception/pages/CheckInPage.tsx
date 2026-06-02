import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useUser } from "@clerk/clerk-react";
import type { Id } from "../../../../convex/_generated/dataModel";

const PURPOSES = ["Meeting","Interview","Delivery","Consultation","Maintenance","Training","Site visit","Other"];

export function CheckInPage() {
  const { user } = useUser();
  const staff          = useQuery(api.staff.list);
  const visits         = useQuery(api.scheduling.list);
  const checkIn        = useMutation(api.visitors.checkIn);
  const markCheckedIn  = useMutation(api.scheduling.markCheckedIn);
  const markCompleted  = useMutation(api.scheduling.markCompleted);
  const approve        = useMutation(api.scheduling.approve);

  const [showWalkIn, setShowWalkIn] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [actioningId, setActioningId] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName: "", phone: "", email: "", company: "",
    purpose: "", hostId: "", idType: "", idNumber: "",
  });
  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const todayEnd   = new Date(); todayEnd.setHours(23,59,59,999);

  const todayVisits = (visits ?? [])
    .filter((v: any) =>
      v.scheduledDate >= todayStart.getTime() &&
      v.scheduledDate <= todayEnd.getTime() &&
      ["pending","approved","accepted","checked_in","in_meeting"].includes(v.status)
    )
    .sort((a: any, b: any) => a.scheduledDate - b.scheduledDate);

  const handleCheckIn = async (v: any) => {
    setActioningId(v._id);
    try {
      if (["pending"].includes(v.status)) {
        await approve({ visitId: v._id, actorName: user?.fullName ?? "Receptionist" });
      }
      await markCheckedIn({ visitId: v._id });
    } finally { setActioningId(null); }
  };

  const handleCheckOut = async (v: any) => {
    setActioningId(v._id);
    try { await markCompleted({ visitId: v._id }); }
    finally { setActioningId(null); }
  };

  const handleWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) return;
    setLoading(true); setError("");
    try {
      await checkIn({
        fullName:  form.fullName.trim(),
        phone:     form.phone    || undefined,
        email:     form.email    || undefined,
        company:   form.company  || undefined,
        purpose:   form.purpose  || undefined,
        hostId:    form.hostId   ? (form.hostId as Id<"staff">) : undefined,
        idType:    form.idType   || undefined,
        idNumber:  form.idNumber || undefined,
      });
      setForm({ fullName:"", phone:"", email:"", company:"", purpose:"", hostId:"", idType:"", idNumber:"" });
      setShowWalkIn(false);
    } catch { setError("Check-in failed. Please try again."); }
    finally { setLoading(false); }
  };

  const now = new Date();
  const awaitingCount = todayVisits.filter((v:any) => ["pending","approved","accepted"].includes(v.status)).length;
  const onPremisesCount = todayVisits.filter((v:any) => v.status === "checked_in").length;

  return (
    <>
      <style>{`
        .ci-page { padding: 0; }
        .ci-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:24px; gap:16px; flex-wrap:wrap; }
        .ci-title { font-size:1.4rem; font-weight:700; color:var(--text,#e6edf3); margin-bottom:4px; }
        .ci-subtitle { font-size:0.85rem; color:var(--muted,#8b949e); }
        .ci-walkin-btn { display:flex; align-items:center; gap:6px; padding:9px 18px; background:var(--accent,#3fb950); color:#fff; border:none; border-radius:8px; font-size:0.85rem; font-weight:700; cursor:pointer; font-family:inherit; white-space:nowrap; }
        .ci-walkin-btn:hover { opacity:0.88; }
        .ci-section-label { font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--muted,#8b949e); margin-bottom:8px; margin-top:16px; }
        .ci-section-label:first-child { margin-top:0; }
        .ci-card { display:flex; align-items:center; gap:16px; background:var(--surface,#161b22); border:1px solid var(--border,#30363d); border-radius:12px; padding:16px 20px; margin-bottom:8px; }
        .ci-card--on-premises { border-color:rgba(63,185,80,0.3); }
        .ci-avatar { min-width:48px; height:48px; border-radius:50%; background:var(--accent,#3fb950); color:#fff; font-weight:700; font-size:20px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .ci-avatar--premises { background:rgba(63,185,80,0.15); color:var(--accent,#3fb950); border:2px solid var(--accent,#3fb950); }
        .ci-info { flex:1; min-width:0; }
        .ci-name { font-weight:600; font-size:15px; color:var(--text,#e6edf3); }
        .ci-meta { font-size:13px; color:var(--muted,#8b949e); margin-top:2px; }
        .ci-time-block { text-align:center; min-width:72px; }
        .ci-time { font-size:20px; font-weight:700; }
        .ci-time--ontime { color:var(--accent,#3fb950); }
        .ci-time--late { color:#f85149; }
        .ci-time--early { color:var(--muted,#8b949e); }
        .ci-time-label { font-size:11px; color:var(--muted,#8b949e); margin-top:2px; }
        .ci-time-label--late { color:#f85149; }
        .ci-btn-checkin { padding:9px 18px; background:var(--accent,#3fb950); color:#fff; border:none; border-radius:8px; font-size:14px; font-weight:700; cursor:pointer; font-family:inherit; min-width:110px; white-space:nowrap; }
        .ci-btn-checkin:hover { opacity:0.88; }
        .ci-btn-checkin:disabled { opacity:0.5; cursor:not-allowed; }
        .ci-btn-checkout { padding:9px 18px; background:transparent; border:1px solid var(--border,#30363d); border-radius:8px; font-size:14px; font-weight:700; cursor:pointer; font-family:inherit; color:var(--muted,#8b949e); min-width:110px; white-space:nowrap; }
        .ci-btn-checkout:hover { background:var(--hov,#2d333b); color:var(--text,#e6edf3); }
        .ci-btn-checkout:disabled { opacity:0.5; cursor:not-allowed; }
        .ci-empty { background:var(--surface,#161b22); border:1px solid var(--border,#30363d); border-radius:12px; padding:32px; text-align:center; color:var(--muted,#8b949e); font-size:0.875rem; }
        /* Modal */
        .ci-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.55); display:flex; align-items:center; justify-content:center; z-index:100; padding:24px; }
        .ci-modal { background:var(--sidebar,#161b22); border:1px solid var(--border,#30363d); border-radius:14px; width:100%; max-width:520px; max-height:90vh; display:flex; flex-direction:column; overflow:hidden; }
        .ci-modal-head { display:flex; align-items:center; justify-content:space-between; padding:20px 24px 16px; border-bottom:1px solid var(--border,#30363d); }
        .ci-modal-title { font-size:1rem; font-weight:700; color:var(--text,#e6edf3); }
        .ci-modal-close { background:none; border:1px solid var(--border,#30363d); cursor:pointer; color:var(--muted,#8b949e); font-size:14px; padding:4px 8px; border-radius:6px; font-family:inherit; }
        .ci-modal-close:hover { background:var(--hov,#2d333b); color:var(--text,#e6edf3); }
        .ci-modal-body { padding:20px 24px; overflow-y:auto; }
        .ci-walkin-banner { background:rgba(63,185,80,0.1); border:1px solid rgba(63,185,80,0.25); border-radius:8px; padding:10px 14px; font-size:0.82rem; color:var(--accent,#3fb950); margin-bottom:16px; }
        .ci-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .ci-field { display:flex; flex-direction:column; gap:6px; }
        .ci-field--full { grid-column:1/-1; }
        .ci-field-label { font-size:0.78rem; font-weight:600; color:var(--muted,#8b949e); }
        .ci-field-label--req::after { content:" *"; color:var(--accent,#3fb950); }
        .ci-input { background:var(--bg,#0d1117); border:1px solid var(--border,#30363d); border-radius:8px; padding:9px 12px; font-size:0.875rem; color:var(--text,#e6edf3); font-family:inherit; outline:none; width:100%; }
        .ci-input:focus { border-color:var(--accent,#3fb950); }
        .ci-error { font-size:0.8rem; color:#f85149; background:rgba(248,81,73,0.1); border:1px solid rgba(248,81,73,0.3); border-radius:8px; padding:10px 14px; margin-top:12px; }
        .ci-modal-foot { display:flex; gap:10px; justify-content:flex-end; padding:16px 24px 20px; border-top:1px solid var(--border,#30363d); }
        .ci-btn-cancel { padding:9px 18px; background:transparent; border:1px solid var(--border,#30363d); border-radius:8px; font-size:0.85rem; font-weight:600; color:var(--muted,#8b949e); cursor:pointer; font-family:inherit; }
        .ci-btn-cancel:hover { background:var(--hov,#2d333b); color:var(--text,#e6edf3); }
        .ci-btn-submit { padding:9px 20px; background:var(--accent,#3fb950); color:#fff; border:none; border-radius:8px; font-size:0.85rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .ci-btn-submit:disabled { opacity:0.5; cursor:not-allowed; }
      `}</style>
      <div className="ci-page">
        <div className="ci-header">
          <div>
            <h1 className="ci-title">Check In</h1>
            <p className="ci-subtitle">{awaitingCount} awaiting &middot; {onPremisesCount} on premises</p>
          </div>
          <button className="ci-walkin-btn" onClick={() => setShowWalkIn(true)}>
            + Walk-in visitor
          </button>
        </div>

        {visits === undefined ? (
          <div className="ci-empty">Loading...</div>
        ) : todayVisits.length === 0 ? (
          <div className="ci-empty">No appointments scheduled for today.</div>
        ) : (
          <div>
            {todayVisits.filter((v:any) => ["pending","approved","accepted"].includes(v.status)).length > 0 && (
              <>
                <div className="ci-section-label">Awaiting arrival</div>
                {todayVisits
                  .filter((v:any) => ["pending","approved","accepted"].includes(v.status))
                  .map((v: any) => {
                    const apptTime = new Date(v.scheduledDate);
                    const diffMins = Math.round((now.getTime() - apptTime.getTime()) / 60000);
                    const isLate   = diffMins > 5;
                    const isEarly  = diffMins < -2;
                    return (
                      <div key={v._id} className="ci-card">
                        <div className="ci-avatar">{v.visitorName[0].toUpperCase()}</div>
                        <div className="ci-info">
                          <div className="ci-name">{v.visitorName}</div>
                          <div className="ci-meta">
                            {v.purpose ?? "Visit"}{v.hostName ? ` · ${v.hostName}` : ""}{v.visitorCompany ? ` · ${v.visitorCompany}` : ""}
                          </div>
                        </div>
                        <div className="ci-time-block">
                          <div className={`ci-time ci-time--${isLate?"late":isEarly?"early":"ontime"}`}>
                            {apptTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                          <div className={`ci-time-label${isLate?" ci-time-label--late":""}`}>
                            {isLate ? `${diffMins}m late` : isEarly ? `${Math.abs(diffMins)}m early` : "on time"}
                          </div>
                        </div>
                        <button className="ci-btn-checkin" disabled={actioningId === v._id} onClick={() => handleCheckIn(v)}>
                          {actioningId === v._id ? "..." : "Check In"}
                        </button>
                      </div>
                    );
                  })}
              </>
            )}

            {todayVisits.filter((v:any) => ["checked_in","in_meeting"].includes(v.status)).length > 0 && (
              <>
                <div className="ci-section-label">On premises</div>
                {todayVisits
                  .filter((v:any) => ["checked_in","in_meeting"].includes(v.status))
                  .map((v: any) => {
                    const checkedInAt = v.checkedInAt ? new Date(v.checkedInAt) : null;
                    return (
                      <div key={v._id} className="ci-card ci-card--on-premises">
                        <div className="ci-avatar ci-avatar--premises">{v.visitorName[0].toUpperCase()}</div>
                        <div className="ci-info">
                          <div className="ci-name">{v.visitorName}</div>
                          <div className="ci-meta">
                            {v.hostName ? `With ${v.hostName}` : "On premises"}{v.visitorCompany ? ` · ${v.visitorCompany}` : ""}
                          </div>
                        </div>
                        <div className="ci-time-block">
                          <div className="ci-time ci-time--ontime">
                            {checkedInAt ? checkedInAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                          </div>
                          <div className="ci-time-label">checked in</div>
                        </div>
                        <button className="ci-btn-checkout" disabled={actioningId === v._id} onClick={() => handleCheckOut(v)}>
                          {actioningId === v._id ? "..." : "Check Out"}
                        </button>
                      </div>
                    );
                  })}
              </>
            )}
          </div>
        )}

        {showWalkIn && (
          <div className="ci-overlay" onClick={() => setShowWalkIn(false)}>
            <div className="ci-modal" onClick={(e) => e.stopPropagation()}>
              <div className="ci-modal-head">
                <span className="ci-modal-title">Register walk-in visitor</span>
                <button className="ci-modal-close" onClick={() => setShowWalkIn(false)}>x</button>
              </div>
              <div className="ci-modal-body">
                <div className="ci-walkin-banner">Walk-in — visitor will be immediately checked in</div>
                <form id="walkin-form" onSubmit={handleWalkIn}>
                  <div className="ci-form-grid">
                    <div className="ci-field">
                      <label className="ci-field-label ci-field-label--req">Full name</label>
                      <input className="ci-input" placeholder="John Appleseed" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} required />
                    </div>
                    <div className="ci-field">
                      <label className="ci-field-label">Company</label>
                      <input className="ci-input" placeholder="Acme Inc." value={form.company} onChange={(e) => set("company", e.target.value)} />
                    </div>
                    <div className="ci-field">
                      <label className="ci-field-label">Phone</label>
                      <input className="ci-input" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                    </div>
                    <div className="ci-field">
                      <label className="ci-field-label">Email</label>
                      <input className="ci-input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
                    </div>
                    <div className="ci-field">
                      <label className="ci-field-label">Purpose</label>
                      <select className="ci-input" value={form.purpose} onChange={(e) => set("purpose", e.target.value)}>
                        <option value="">Select purpose...</option>
                        {PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="ci-field">
                      <label className="ci-field-label">Host</label>
                      <select className="ci-input" value={form.hostId} onChange={(e) => set("hostId", e.target.value)}>
                        <option value="">Select host...</option>
                        {staff?.map((s: any) => (
                          <option key={s._id} value={s._id}>{s.name}{s.department ? ` — ${s.department}` : ""}</option>
                        ))}
                      </select>
                    </div>
                    <div className="ci-field">
                      <label className="ci-field-label">ID type</label>
                      <select className="ci-input" value={form.idType} onChange={(e) => set("idType", e.target.value)}>
                        <option value="">Select ID type</option>
                        <option value="Passport">Passport</option>
                        <option value="National ID">National ID</option>
                        <option value="Driver's License">Driver&apos;s License</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="ci-field">
                      <label className="ci-field-label">ID number</label>
                      <input className="ci-input" value={form.idNumber} onChange={(e) => set("idNumber", e.target.value)} />
                    </div>
                  </div>
                  {error && <p className="ci-error">{error}</p>}
                </form>
              </div>
              <div className="ci-modal-foot">
                <button type="button" className="ci-btn-cancel" onClick={() => setShowWalkIn(false)}>Cancel</button>
                <button type="submit" form="walkin-form" className="ci-btn-submit" disabled={loading || !form.fullName.trim()}>
                  {loading ? "Checking in..." : "Check in visitor"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </>
  );
}
