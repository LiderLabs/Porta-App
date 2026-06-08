import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useSearchParams } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import type { Id } from "../../../../convex/_generated/dataModel";

const PURPOSES = ["Meeting","Interview","Delivery","Consultation","Maintenance","Training","Site visit","Other"];

type Filter = "ALL" | "IN" | "OUT";

function hashColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  const hue = Math.abs(h) % 360;
  return `linear-gradient(135deg,hsl(${hue},55%,28%),hsl(${(hue+50)%360},65%,20%))`;
}

function exportCSV(visitors: any[]) {
  const rows = [
    ["Name","Company","Phone","Email","Purpose","Status","Check-in Time"],
    ...visitors.map(v=>[v.fullName,v.company??"",v.phone??"",v.email??"",v.purpose??"",v.status,new Date(v.checkInTime).toLocaleString()]),
  ];
  const csv = rows.map(r=>r.map((c:any)=>JSON.stringify(c)).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
  a.download = "visitors.csv"; a.click();
}

export function VisitorsPage() {
  const [filter, setFilter]     = useState<Filter>("ALL");
  const [search, setSearch]     = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [showWalkIn, setShowWalkIn]   = useState(false);
  const [walkInLoading, setWalkInLoading] = useState(false);
  const [walkInError, setWalkInError]     = useState("");
  const [form, setForm] = useState({ fullName:"", phone:"", email:"", company:"", purpose:"", hostId:"", idType:"", idNumber:"" });
  const [params] = useSearchParams();

  const { user }        = useUser();
  const visitors        = useQuery(api.visitors.list);
  const scheduledVisits = useQuery(api.scheduling.list);
  const staff           = useQuery(api.staff.list);
  const checkOut        = useMutation(api.visitors.checkOut);
  const checkIn         = useMutation(api.visitors.checkIn);
  const approve         = useMutation(api.scheduling.approve);
  const markCheckedIn   = useMutation(api.scheduling.markCheckedIn);
  const markCompleted   = useMutation(api.scheduling.markCompleted);

  const setF = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const now = new Date();
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const todayEnd   = new Date(); todayEnd.setHours(23,59,59,999);

  // Today's scheduled visits (awaiting + on premises)
  const todayScheduled = (scheduledVisits ?? [])
    .filter((v: any) =>
      v.scheduledDate >= todayStart.getTime() &&
      v.scheduledDate <= todayEnd.getTime() &&
      ["pending","approved","accepted","checked_in","in_meeting"].includes(v.status)
    )
    .sort((a: any, b: any) => a.scheduledDate - b.scheduledDate);

  const awaitingVisits  = todayScheduled.filter((v:any) => ["pending","approved","accepted"].includes(v.status));
  const onPremisesVisits = todayScheduled.filter((v:any) => ["checked_in","in_meeting"].includes(v.status));

  // Handlers for scheduled visits
  const handleScheduledCheckIn = async (v: any) => {
    setActioningId(v._id);
    try {
      if (v.status === "pending") await approve({ visitId: v._id, actorName: user?.fullName ?? "Receptionist" });
      await markCheckedIn({ visitId: v._id });
    } finally { setActioningId(null); }
  };

  const handleScheduledCheckOut = async (v: any) => {
    setActioningId(v._id);
    try { await markCompleted({ visitId: v._id }); }
    finally { setActioningId(null); }
  };

  // Walk-in handler
  const handleWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) return;
    setWalkInLoading(true); setWalkInError("");
    try {
      await checkIn({
        fullName: form.fullName.trim(),
        phone:    form.phone    || undefined,
        email:    form.email    || undefined,
        company:  form.company  || undefined,
        purpose:  form.purpose  || undefined,
        hostId:   form.hostId   ? (form.hostId as Id<"staff">) : undefined,
        idType:   form.idType   || undefined,
        idNumber: form.idNumber || undefined,
      });
      setForm({ fullName:"", phone:"", email:"", company:"", purpose:"", hostId:"", idType:"", idNumber:"" });
      setShowWalkIn(false);
    } catch { setWalkInError("Check-in failed. Please try again."); }
    finally { setWalkInLoading(false); }
  };

  // Walk-in visitor checkout
  const handleWalkInCheckOut = async (id: string) => {
    setCheckingOut(id);
    try { await checkOut({ visitorId: id as any }); } finally { setCheckingOut(null); }
  };

  // Visitor table: walk-ins only (scheduled are shown in the top section)
  const effectiveSearch = search || (params.get("search") ?? "");
  const walkIns = (visitors ?? []);
  const filtered = walkIns.filter((v: any) => {
    const okFilter = filter === "ALL"
      || (filter === "IN"  && (v.status === "IN"  || v.status === "checked_in"))
      || (filter === "OUT" && (v.status === "OUT" || v.status === "checked_out"));
    const okSearch = !effectiveSearch ||
      v.fullName.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
      (v.company??"").toLowerCase().includes(effectiveSearch.toLowerCase()) ||
      (v.purpose??"").toLowerCase().includes(effectiveSearch.toLowerCase());
    return okFilter && okSearch;
  });

  const inCount    = walkIns.filter((v:any) => v.status === "IN" || v.status === "checked_in").length + onPremisesVisits.length;
  const outCount   = walkIns.filter((v:any) => v.status === "OUT" || v.status === "checked_out").length;
  const totalCount = (visitors?.length ?? 0) + (scheduledVisits?.length ?? 0);

  return (
    <>
      <style>{`
        .vp { padding: 0; }
        .vp-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:20px; gap:16px; flex-wrap:wrap; }
        .vp-title { font-size:1.4rem; font-weight:700; color:var(--text,#e6edf3); margin-bottom:4px; }
        .vp-stats-row { display:flex; align-items:center; gap:8px; font-size:0.85rem; }
        .vp-stat { font-weight:600; color:var(--text,#e6edf3); }
        .vp-stat em { font-style:normal; color:var(--muted,#8b949e); font-weight:400; }
        .vp-stat--green { color:var(--accent,#3fb950); }
        .vp-stat--muted { color:var(--muted,#8b949e); }
        .vp-dot { width:3px; height:3px; border-radius:50%; background:var(--muted,#8b949e); }
        .vp-header-actions { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
        .vp-export-btn { display:flex; align-items:center; gap:6px; padding:8px 14px; background:transparent; border:1px solid var(--border,#30363d); border-radius:8px; font-size:0.82rem; font-weight:600; color:var(--muted,#8b949e); cursor:pointer; font-family:inherit; }
        .vp-export-btn:hover { background:var(--hov,#2d333b); color:var(--text,#e6edf3); }
        .vp-checkin-btn { display:flex; align-items:center; gap:6px; padding:8px 16px; background:var(--accent,#3fb950); color:#fff; border:none; border-radius:8px; font-size:0.85rem; font-weight:700; cursor:pointer; font-family:inherit; white-space:nowrap; }
        .vp-checkin-btn:hover { opacity:0.88; }
        /* Scheduled section */
        .vp-section-label { font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--muted,#8b949e); margin-bottom:8px; margin-top:20px; }
        .vp-section-label:first-child { margin-top:0; }
        .vp-sched-card { display:flex; align-items:center; gap:16px; background:var(--surface,#161b22); border:1px solid var(--border,#30363d); border-radius:12px; padding:14px 18px; margin-bottom:8px; }
        .vp-sched-card--premises { border-color:rgba(63,185,80,0.3); }
        .vp-sched-avatar { min-width:44px; height:44px; border-radius:50%; background:var(--accent,#3fb950); color:#fff; font-weight:700; font-size:18px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .vp-sched-avatar--premises { background:rgba(63,185,80,0.15); color:var(--accent,#3fb950); border:2px solid var(--accent,#3fb950); }
        .vp-sched-info { flex:1; min-width:0; }
        .vp-sched-name { font-weight:600; font-size:15px; color:var(--text,#e6edf3); }
        .vp-sched-meta { font-size:13px; color:var(--muted,#8b949e); margin-top:2px; }
        .vp-sched-time { text-align:center; min-width:68px; }
        .vp-sched-time-val { font-size:18px; font-weight:700; }
        .vp-sched-time--ontime { color:var(--accent,#3fb950); }
        .vp-sched-time--late { color:#f85149; }
        .vp-sched-time--early { color:var(--muted,#8b949e); }
        .vp-sched-time-lbl { font-size:11px; color:var(--muted,#8b949e); margin-top:2px; }
        .vp-sched-time-lbl--late { color:#f85149; }
        .vp-btn-checkin { padding:8px 16px; background:var(--accent,#3fb950); color:#fff; border:none; border-radius:8px; font-size:13px; font-weight:700; cursor:pointer; font-family:inherit; min-width:100px; white-space:nowrap; }
        .vp-btn-checkin:hover { opacity:0.88; }
        .vp-btn-checkin:disabled { opacity:0.5; cursor:not-allowed; }
        .vp-btn-checkout { padding:8px 16px; background:transparent; border:1px solid var(--border,#30363d); border-radius:8px; font-size:13px; font-weight:700; cursor:pointer; font-family:inherit; color:var(--muted,#8b949e); min-width:100px; white-space:nowrap; }
        .vp-btn-checkout:hover { background:var(--hov,#2d333b); color:var(--text,#e6edf3); }
        .vp-btn-checkout:disabled { opacity:0.5; cursor:not-allowed; }
        /* Toolbar + table */
        .vp-toolbar { display:flex; align-items:center; gap:12px; margin-bottom:16px; flex-wrap:wrap; }
        .vp-search { display:flex; align-items:center; gap:8px; background:var(--surface,#21262d); border:1px solid var(--border,#30363d); border-radius:8px; padding:8px 12px; flex:1; min-width:200px; max-width:320px; }
        .vp-search-input { background:none; border:none; outline:none; font-size:0.85rem; color:var(--text,#e6edf3); font-family:inherit; width:100%; }
        .vp-search-input::placeholder { color:var(--muted,#8b949e); }
        .vp-search-clear { background:none; border:none; cursor:pointer; color:var(--muted,#8b949e); font-size:14px; padding:0; line-height:1; }
        .vp-filters { display:flex; gap:4px; }
        .vp-filter { padding:7px 12px; border:1px solid var(--border,#30363d); border-radius:8px; background:transparent; font-size:0.8rem; font-weight:600; color:var(--muted,#8b949e); cursor:pointer; font-family:inherit; display:flex; align-items:center; gap:6px; }
        .vp-filter:hover { background:var(--hov,#2d333b); color:var(--text,#e6edf3); }
        .vp-filter--on { background:var(--accent-bg,rgba(63,185,80,0.12)); color:var(--accent,#3fb950); border-color:transparent; }
        .vp-filter-count { background:var(--hov,#2d333b); border-radius:999px; padding:1px 7px; font-size:0.72rem; }
        .vp-layout { display:flex; gap:16px; align-items:flex-start; }
        .vp-table-wrap { flex:1; min-width:0; background:var(--surface,#161b22); border:1px solid var(--border,#30363d); border-radius:12px; overflow:hidden; }
        .vp-table-title { padding:12px 16px 0; font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--muted,#8b949e); }
        .vp-empty { padding:40px; text-align:center; color:var(--muted,#8b949e); font-size:0.875rem; }
        .vp-table { width:100%; border-collapse:collapse; font-size:0.85rem; }
        .vp-table th { text-align:left; padding:10px 16px; color:var(--muted,#8b949e); font-weight:600; font-size:0.75rem; text-transform:uppercase; letter-spacing:.05em; border-bottom:1px solid var(--border,#30363d); background:var(--sidebar,#161b22); }
        .vp-table td { padding:12px 16px; border-bottom:1px solid var(--border,#30363d); color:var(--text,#e6edf3); vertical-align:middle; }
        .vp-table tr:last-child td { border-bottom:none; }
        .vp-table tbody tr { cursor:pointer; transition:background .1s; }
        .vp-table tbody tr:hover td { background:var(--hov,#2d333b); }
        .vp-row--selected td { background:var(--accent-bg,rgba(63,185,80,0.08)) !important; }
        .vp-person { display:flex; align-items:center; gap:10px; }
        .vp-avatar { width:34px; height:34px; border-radius:50%; color:#fff; font-weight:700; font-size:13px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .vp-person-name { font-weight:600; font-size:0.875rem; color:var(--text,#e6edf3); }
        .vp-person-email { font-size:0.75rem; color:var(--muted,#8b949e); margin-top:1px; }
        .vp-cell-muted { color:var(--muted,#8b949e); }
        .vp-badge { display:inline-flex; align-items:center; padding:3px 10px; border-radius:999px; font-size:0.72rem; font-weight:700; }
        .vp-badge--in  { background:rgba(63,185,80,0.12); color:#3fb950; }
        .vp-badge--out { background:rgba(139,148,158,0.12); color:#8b949e; }
        .vp-tbl-checkout { padding:5px 12px; border:1px solid var(--border,#30363d); border-radius:6px; background:transparent; font-size:0.78rem; font-weight:600; color:var(--muted,#8b949e); cursor:pointer; font-family:inherit; white-space:nowrap; }
        .vp-tbl-checkout:hover { background:rgba(248,81,73,0.08); color:#f85149; border-color:rgba(248,81,73,0.3); }
        .vp-tbl-checkout:disabled { opacity:0.5; cursor:not-allowed; }
        .vp-panel { width:280px; flex-shrink:0; background:var(--surface,#161b22); border:1px solid var(--border,#30363d); border-radius:12px; overflow:hidden; }
        .vp-panel-top { position:relative; padding:24px 20px 16px; text-align:center; border-bottom:1px solid var(--border,#30363d); }
        .vp-panel-avatar { width:56px; height:56px; border-radius:50%; color:#fff; font-weight:700; font-size:22px; display:flex; align-items:center; justify-content:center; margin:0 auto 10px; }
        .vp-panel-close { position:absolute; top:12px; right:12px; background:none; border:1px solid var(--border,#30363d); border-radius:6px; cursor:pointer; color:var(--muted,#8b949e); font-size:14px; padding:3px 7px; font-family:inherit; }
        .vp-panel-close:hover { background:var(--hov,#2d333b); color:var(--text,#e6edf3); }
        .vp-panel-name { font-weight:700; font-size:1rem; color:var(--text,#e6edf3); margin-bottom:4px; }
        .vp-panel-body { padding:16px 20px; }
        .vp-panel-fields { display:flex; flex-direction:column; gap:10px; margin-top:16px; }
        .vp-panel-field { display:flex; flex-direction:column; gap:2px; }
        .vp-panel-field-label { font-size:0.72rem; font-weight:600; text-transform:uppercase; letter-spacing:.05em; color:var(--muted,#8b949e); }
        .vp-panel-field-value { font-size:0.85rem; color:var(--text,#e6edf3); word-break:break-word; }
        /* Walk-in modal */
        .vp-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.55); display:flex; align-items:center; justify-content:center; z-index:100; padding:24px; }
        .vp-modal { background:var(--sidebar,#161b22); border:1px solid var(--border,#30363d); border-radius:14px; width:100%; max-width:520px; max-height:90vh; display:flex; flex-direction:column; overflow:hidden; }
        .vp-modal-head { display:flex; align-items:center; justify-content:space-between; padding:20px 24px 16px; border-bottom:1px solid var(--border,#30363d); }
        .vp-modal-title { font-size:1rem; font-weight:700; color:var(--text,#e6edf3); }
        .vp-modal-close { background:none; border:1px solid var(--border,#30363d); cursor:pointer; color:var(--muted,#8b949e); font-size:14px; padding:4px 8px; border-radius:6px; font-family:inherit; }
        .vp-modal-close:hover { background:var(--hov,#2d333b); color:var(--text,#e6edf3); }
        .vp-modal-body { padding:20px 24px; overflow-y:auto; }
        .vp-walkin-banner { background:rgba(63,185,80,0.1); border:1px solid rgba(63,185,80,0.25); border-radius:8px; padding:10px 14px; font-size:0.82rem; color:var(--accent,#3fb950); margin-bottom:16px; }
        .vp-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .vp-field { display:flex; flex-direction:column; gap:6px; }
        .vp-field-label { font-size:0.78rem; font-weight:600; color:var(--muted,#8b949e); }
        .vp-field-label--req::after { content:" *"; color:var(--accent,#3fb950); }
        .vp-input { background:var(--bg,#0d1117); border:1px solid var(--border,#30363d); border-radius:8px; padding:9px 12px; font-size:0.875rem; color:var(--text,#e6edf3); font-family:inherit; outline:none; width:100%; box-sizing:border-box; }
        .vp-input:focus { border-color:var(--accent,#3fb950); }
        .vp-error { font-size:0.8rem; color:#f85149; background:rgba(248,81,73,0.1); border:1px solid rgba(248,81,73,0.3); border-radius:8px; padding:10px 14px; margin-top:12px; }
        .vp-modal-foot { display:flex; gap:10px; justify-content:flex-end; padding:16px 24px 20px; border-top:1px solid var(--border,#30363d); }
        .vp-btn-cancel { padding:9px 18px; background:transparent; border:1px solid var(--border,#30363d); border-radius:8px; font-size:0.85rem; font-weight:600; color:var(--muted,#8b949e); cursor:pointer; font-family:inherit; }
        .vp-btn-cancel:hover { background:var(--hov,#2d333b); color:var(--text,#e6edf3); }
        .vp-btn-submit { padding:9px 20px; background:var(--accent,#3fb950); color:#fff; border:none; border-radius:8px; font-size:0.85rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .vp-btn-submit:disabled { opacity:0.5; cursor:not-allowed; }
        @media(max-width:768px){
          .vp-header { flex-direction:column; align-items:flex-start; }
          .vp-header-actions { width:100%; justify-content:space-between; }
          .vp-layout { flex-direction:column; }
          .vp-panel { width:100%; }
          .vp-filters { flex-wrap:wrap; }
          .vp-search { max-width:100%; width:100%; }
          .vp-modal { max-width:100%; border-radius:14px 14px 0 0; position:fixed; bottom:0; left:0; right:0; max-height:85vh; }
          .vp-overlay { align-items:flex-end; padding:0; }
          .vp-form-grid { grid-template-columns:1fr; }
        }
      `}</style>

      <div className="vp">
        {/* Header */}
        <div className="vp-header">
          <div>
            <h1 className="vp-title">Visitors</h1>
            <div className="vp-stats-row">
              <span className="vp-stat">{totalCount} <em>total</em></span>
              <span className="vp-dot"/>
              <span className="vp-stat vp-stat--green">{inCount} <em>in</em></span>
              <span className="vp-dot"/>
              <span className="vp-stat vp-stat--muted">{outCount} <em>out</em></span>
            </div>
          </div>
          <div className="vp-header-actions">
            {filtered.length > 0 && (
              <button className="vp-export-btn" onClick={() => exportCSV(filtered)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Export CSV
              </button>
            )}
            <button className="vp-checkin-btn" onClick={() => setShowWalkIn(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Walk-in visitor
            </button>
          </div>
        </div>

        {/* Today's scheduled visits */}
        {scheduledVisits === undefined ? null : todayScheduled.length > 0 && (
          <div style={{marginBottom: 24}}>
            {awaitingVisits.length > 0 && (
              <>
                <div className="vp-section-label">Awaiting arrival</div>
                {awaitingVisits.map((v: any) => {
                  const apptTime = new Date(v.scheduledDate);
                  const diffMins = Math.round((now.getTime() - apptTime.getTime()) / 60000);
                  const isLate   = diffMins > 5;
                  const isEarly  = diffMins < -2;
                  return (
                    <div key={v._id} className="vp-sched-card">
                      <div className="vp-sched-avatar">{(v.visitorName??v.fullName??"?")[0].toUpperCase()}</div>
                      <div className="vp-sched-info">
                        <div className="vp-sched-name">{v.visitorName ?? v.fullName}</div>
                        <div className="vp-sched-meta">
                          {v.purpose ?? "Visit"}{v.hostName ? ` · ${v.hostName}` : ""}{v.visitorCompany ? ` · ${v.visitorCompany}` : ""}
                        </div>
                      </div>
                      <div className="vp-sched-time">
                        <div className={`vp-sched-time-val vp-sched-time--${isLate?"late":isEarly?"early":"ontime"}`}>
                          {apptTime.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
                        </div>
                        <div className={`vp-sched-time-lbl${isLate?" vp-sched-time-lbl--late":""}`}>
                          {isLate ? `${diffMins}m late` : isEarly ? `${Math.abs(diffMins)}m early` : "on time"}
                        </div>
                      </div>
                      <button className="vp-btn-checkin" disabled={actioningId === v._id} onClick={() => handleScheduledCheckIn(v)}>
                        {actioningId === v._id ? "..." : "Check In"}
                      </button>
                    </div>
                  );
                })}
              </>
            )}

            {onPremisesVisits.length > 0 && (
              <>
                <div className="vp-section-label">On premises</div>
                {onPremisesVisits.map((v: any) => {
                  const checkedInAt = v.checkedInAt ? new Date(v.checkedInAt) : null;
                  return (
                    <div key={v._id} className="vp-sched-card vp-sched-card--premises">
                      <div className="vp-sched-avatar vp-sched-avatar--premises">{(v.visitorName??v.fullName??"?")[0].toUpperCase()}</div>
                      <div className="vp-sched-info">
                        <div className="vp-sched-name">{v.visitorName ?? v.fullName}</div>
                        <div className="vp-sched-meta">
                          {v.hostName ? `With ${v.hostName}` : "On premises"}{v.visitorCompany ? ` · ${v.visitorCompany}` : ""}
                        </div>
                      </div>
                      <div className="vp-sched-time">
                        <div className="vp-sched-time-val vp-sched-time--ontime">
                          {checkedInAt ? checkedInAt.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }) : "—"}
                        </div>
                        <div className="vp-sched-time-lbl">checked in</div>
                      </div>
                      <button className="vp-btn-checkout" disabled={actioningId === v._id} onClick={() => handleScheduledCheckOut(v)}>
                        {actioningId === v._id ? "..." : "Check Out"}
                      </button>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* Walk-in visitors table */}
        <div className="vp-toolbar">
          <div className="vp-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input className="vp-search-input" placeholder="Search by name, company, purpose..." value={search} onChange={e=>setSearch(e.target.value)} />
            {search && <button className="vp-search-clear" onClick={()=>setSearch("")}>×</button>}
          </div>
          <div className="vp-filters">
            {(["ALL","IN","OUT"] as Filter[]).map(f=>(
              <button key={f} className={`vp-filter${filter===f?" vp-filter--on":""}`} onClick={()=>setFilter(f)}>
                {f==="ALL"?"All walk-ins":f==="IN"?"Checked in":"Checked out"}
                <span className="vp-filter-count">
                  {f==="ALL" ? (visitors?.length??0) : f==="IN" ? walkIns.filter((v:any)=>v.status==="IN"||v.status==="checked_in").length : outCount}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="vp-layout">
          <div className="vp-table-wrap">
            <div className="vp-table-title">Walk-in visitors</div>
            {visitors === undefined ? (
              <div className="vp-empty">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="vp-empty">No walk-in visitors found.</div>
            ) : (
              <table className="vp-table">
                <thead>
                  <tr>
                    <th>Visitor</th><th>Company</th><th>Purpose</th>
                    <th>Time</th><th>Status</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((v:any) => (
                    <tr key={v._id} onClick={()=>setSelected(v)} className={selected?._id===v._id?"vp-row--selected":""}>
                      <td>
                        <div className="vp-person">
                          <div className="vp-avatar" style={{background:hashColor(v.fullName)}}>{v.fullName[0].toUpperCase()}</div>
                          <div>
                            <div className="vp-person-name">{v.fullName}</div>
                            {v.email && <div className="vp-person-email">{v.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="vp-cell-muted">{v.company||"—"}</td>
                      <td className="vp-cell-muted">{v.purpose||"—"}</td>
                      <td className="vp-cell-muted">{new Date(v.checkInTime).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</td>
                      <td><span className={`vp-badge vp-badge--${(v.status==="IN"||v.status==="checked_in")?"in":"out"}`}>{v.status==="IN"||v.status==="checked_in"?"In":"Out"}</span></td>
                      <td onClick={e=>e.stopPropagation()}>
                        {(v.status==="IN"||v.status==="checked_in") && (
                          <button className="vp-tbl-checkout" disabled={checkingOut===v._id} onClick={()=>handleWalkInCheckOut(v._id)}>
                            {checkingOut===v._id?"...":"Check out"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {selected && (
            <div className="vp-panel">
              <div className="vp-panel-top">
                <div className="vp-panel-avatar" style={{background:hashColor(selected.fullName)}}>
                  {selected.fullName[0].toUpperCase()}
                </div>
                <button className="vp-panel-close" onClick={()=>setSelected(null)}>×</button>
              </div>
              <div className="vp-panel-body">
                <div className="vp-panel-name">{selected.fullName}</div>
                <span className={`vp-badge vp-badge--${(selected.status==="IN"||selected.status==="checked_in")?"in":"out"}`} style={{margin:"4px auto 0",display:"block",width:"fit-content"}}>
                  {(selected.status==="IN"||selected.status==="checked_in")?"In":"Out"}
                </span>
                <div className="vp-panel-fields">
                  {[
                    {label:"Company",    value:selected.company},
                    {label:"Phone",      value:selected.phone},
                    {label:"Email",      value:selected.email},
                    {label:"Purpose",    value:selected.purpose},
                    {label:"Checked in", value:new Date(selected.checkInTime).toLocaleString()},
                    {label:"Checked out",value:selected.checkOutTime?new Date(selected.checkOutTime).toLocaleString():null},
                  ].filter(f=>f.value).map(({label,value})=>(
                    <div key={label} className="vp-panel-field">
                      <span className="vp-panel-field-label">{label}</span>
                      <span className="vp-panel-field-value">{value}</span>
                    </div>
                  ))}
                </div>
                {(selected.status==="IN"||selected.status==="checked_in") && (
                  <button className="vp-checkin-btn" style={{width:"100%",justifyContent:"center",marginTop:"16px"}}
                    disabled={checkingOut===selected._id}
                    onClick={()=>{handleWalkInCheckOut(selected._id);setSelected(null);}}>
                    Check out
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Walk-in modal */}
      {showWalkIn && (
        <div className="vp-overlay" onClick={() => setShowWalkIn(false)}>
          <div className="vp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vp-modal-head">
              <span className="vp-modal-title">Register walk-in visitor</span>
              <button className="vp-modal-close" onClick={() => setShowWalkIn(false)}>×</button>
            </div>
            <div className="vp-modal-body">
              <div className="vp-walkin-banner">Walk-in — visitor will be immediately checked in</div>
              <form id="vp-walkin-form" onSubmit={handleWalkIn}>
                <div className="vp-form-grid">
                  <div className="vp-field">
                    <label className="vp-field-label vp-field-label--req">Full name</label>
                    <input className="vp-input" placeholder="John Appleseed" value={form.fullName} onChange={(e) => setF("fullName", e.target.value)} required />
                  </div>
                  <div className="vp-field">
                    <label className="vp-field-label">Company</label>
                    <input className="vp-input" placeholder="Acme Inc." value={form.company} onChange={(e) => setF("company", e.target.value)} />
                  </div>
                  <div className="vp-field">
                    <label className="vp-field-label">Phone</label>
                    <input className="vp-input" type="tel" value={form.phone} onChange={(e) => setF("phone", e.target.value)} />
                  </div>
                  <div className="vp-field">
                    <label className="vp-field-label">Email</label>
                    <input className="vp-input" type="email" value={form.email} onChange={(e) => setF("email", e.target.value)} />
                  </div>
                  <div className="vp-field">
                    <label className="vp-field-label">Purpose</label>
                    <select className="vp-input" value={form.purpose} onChange={(e) => setF("purpose", e.target.value)}>
                      <option value="">Select purpose...</option>
                      {PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="vp-field">
                    <label className="vp-field-label">Host</label>
                    <select className="vp-input" value={form.hostId} onChange={(e) => setF("hostId", e.target.value)}>
                      <option value="">Select host...</option>
                      {staff?.map((s: any) => (
                        <option key={s._id} value={s._id}>{s.name}{s.department ? ` — ${s.department}` : ""}</option>
                      ))}
                    </select>
                  </div>
                  <div className="vp-field">
                    <label className="vp-field-label">ID type</label>
                    <select className="vp-input" value={form.idType} onChange={(e) => setF("idType", e.target.value)}>
                      <option value="">Select ID type</option>
                      <option value="Passport">Passport</option>
                      <option value="National ID">National ID</option>
                      <option value="Driver's License">Driver's License</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="vp-field">
                    <label className="vp-field-label">ID number</label>
                    <input className="vp-input" value={form.idNumber} onChange={(e) => setF("idNumber", e.target.value)} />
                  </div>
                </div>
                {walkInError && <p className="vp-error">{walkInError}</p>}
              </form>
            </div>
            <div className="vp-modal-foot">
              <button type="button" className="vp-btn-cancel" onClick={() => setShowWalkIn(false)}>Cancel</button>
              <button type="submit" form="vp-walkin-form" className="vp-btn-submit" disabled={walkInLoading || !form.fullName.trim()}>
                {walkInLoading ? "Checking in..." : "Check in visitor"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}