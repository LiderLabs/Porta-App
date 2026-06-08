import { useState, useMemo } from "react";
import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useUser } from "@clerk/clerk-react";
import { NotifyModal, NotifyTemplate, NotifyData } from "../../shared/NotifyModal";

// ── types ──────────────────────────────────────────────────────────────────
type StatusFilter = "ALL" | "pending" | "approved" | "checked_in" | "in_meeting" | "completed" | "rejected" | "cancelled" | "no_show";
type ViewMode = "list" | "calendar";
type TabMode = "appointments" | "walkins";

const MONTHS   = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS     = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const PURPOSES = ["Meeting","Interview","Delivery","Consultation","Maintenance","Training","Site visit","Other"];

// ── status helpers ─────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  pending:"Pending", approved:"Approved", accepted:"Approved",
  rejected:"Rejected", declined:"Rejected",
  checked_in:"Checked in", in_meeting:"In meeting",
  completed:"Completed", cancelled:"Cancelled",
  no_show:"No show", rescheduled:"Rescheduled",
};

const STATUS_COLOR: Record<string, string> = {
  pending:"badge--pending", approved:"badge--accepted", accepted:"badge--accepted",
  rejected:"badge--declined", declined:"badge--declined",
  checked_in:"badge--checked-in", in_meeting:"badge--in-meeting",
  completed:"badge--completed", cancelled:"badge--cancelled",
  no_show:"badge--no-show", rescheduled:"badge--rescheduled",
};

const TRANSITIONS: Record<string, { label: string; action: string; cls: string }[]> = {
  pending:    [{ label:"Approve",    action:"approve",    cls:"action-btn--accept" },
               { label:"Reject",     action:"reject",     cls:"action-btn--decline" }],
  approved:   [{ label:"Check in",  action:"check_in",   cls:"action-btn--accept" },
               { label:"No show",   action:"no_show",    cls:"action-btn--decline" },
               { label:"Cancel",    action:"cancel",     cls:"action-btn--delete" }],
  accepted:   [{ label:"Check in",  action:"check_in",   cls:"action-btn--accept" },
               { label:"No show",   action:"no_show",    cls:"action-btn--decline" }],
  checked_in: [{ label:"In meeting",action:"in_meeting", cls:"action-btn--accept" },
               { label:"Check out", action:"complete",   cls:"action-btn--complete" }],
  in_meeting: [{ label:"Check out", action:"complete",   cls:"action-btn--complete" }],
};

// ── color hash for walk-in avatars ─────────────────────────────────────────
function hashColor(name: string) {
  const colors = ["#3aaa45","#0087a8","#dd6b20","#7c3aed","#db2777","#059669","#d97706","#2563eb"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

// ── calendar ───────────────────────────────────────────────────────────────
function LiveCalendar({ visits, blockedSlots, onSelectVisit }: {
  visits: any[]; blockedSlots: any[]; onSelectVisit: (v: any) => void;
}) {
  const [cur, setCur] = React.useState(new Date());
  const year = cur.getFullYear(), month = cur.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const today = new Date();

  const visitsByDay: Record<number, any[]> = {};
  visits.forEach((v: any) => {
    const d = new Date(v.scheduledDate);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      visitsByDay[day] = [...(visitsByDay[day] ?? []), v];
    }
  });

  const blockedByDay: Record<number, any[]> = {};
  blockedSlots.forEach((b: any) => {
    const d = new Date(b.startTime);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      blockedByDay[day] = [...(blockedByDay[day] ?? []), b];
    }
  });

  return (
    <div className="calendar-card">
      <div className="calendar-nav">
        <button className="btn-ghost" onClick={() => setCur(new Date(year, month - 1, 1))}>‹</button>
        <span className="calendar-month">{MONTHS[month]} {year}</span>
        <button className="btn-ghost" onClick={() => setCur(new Date(year, month + 1, 1))}>›</button>
      </div>
      <div className="calendar-live-badge">● LIVE</div>
      <div className="calendar-grid">
        {DAYS.map(d => <div key={d} className="calendar-day-header">{d}</div>)}
        {cells.map((day, i) => {
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const dayVisits  = visitsByDay[day]  ?? [];
          const dayBlocked = blockedByDay[day] ?? [];
          return (
            <div key={i} className={`calendar-cell${isToday ? " calendar-cell--today" : ""}`}>
              {day && (<>
                <span className="calendar-day-num">{day}</span>
                <div className="calendar-events">
                  {dayBlocked.slice(0,1).map((b: any) => (
                    <div key={b._id} className="calendar-event calendar-event--blocked" title={b.reason ?? "Blocked"}>
                      🔒<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:"4px"}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>{b.staffName?.split(" ")[0] ?? "Blocked"}
                    </div>
                  ))}
                  {dayBlocked.length > 1 && <div className="calendar-more">+{dayBlocked.length-1} blocked</div>}

                  {dayVisits.slice(0,2).map((v: any) => (
                    <button key={v._id} type="button" className={`calendar-event calendar-event--${v.status}`}
                      onClick={(e) => { e.stopPropagation(); onSelectVisit(v); }} style={{ cursor:"pointer", border:"none", width:"100%", textAlign:"left", background:"inherit", pointerEvents:"auto" }}>
                      {(v.visitorName ?? "Visitor").split(" ")[0]}
                    </button>
                  ))}
                  {dayVisits.length > 2 && <div className="calendar-more">+{dayVisits.length-2} more</div>}
                </div>
              </>)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── reschedule modal ───────────────────────────────────────────────────────
function RescheduleModal({ visit, onClose, onDone }: { visit: any; onClose: () => void; onDone: () => void; }) {
  const reschedule = useMutation(api.scheduling.reschedule);
  const [date, setDate] = useState(new Date(visit.scheduledDate).toISOString().slice(0,10));
  const [time, setTime] = useState(new Date(visit.scheduledDate).toTimeString().slice(0,5));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try { await reschedule({ visitId: visit._id, scheduledDate: new Date(`${date}T${time}`).getTime() }); onDone(); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth:400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Reschedule visit</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-form">
          <div className="form-grid">
            <div className="field-group field-group--required">
              <label className="field-label">New date</label>
              <input type="date" className="field-input" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="field-group field-group--required">
              <label className="field-label">New time</label>
              <input type="time" className="field-input" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn-primary" disabled={saving || !date || !time} onClick={handleSave}>
              {saving ? "Saving…" : "Reschedule"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── main page ──────────────────────────────────────────────────────────────
export function SchedulingPage() {
  const { user } = useUser();
  const myOrg = useQuery(api.orgSettings.getMyOrg);
  const orgName = myOrg?.name ?? "our office";

  // view state
  const [filter, setFilter]             = useState<StatusFilter>("ALL");
  const [search, setSearch]             = useState("");
  const [view, setView]                 = useState<ViewMode>("list");
  const [tab, setTab]                   = useState<TabMode>("appointments");
  const [showModal, setShowModal]       = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [message, setMessage]           = useState("");
  const [showReschedule, setShowReschedule] = useState(false);
  const [actioningId, setActioningId]   = useState<string | null>(null);
  const [checkingOut, setCheckingOut]   = useState<string | null>(null);
  const [notifyModal, setNotifyModal] = useState<{ template: NotifyTemplate; data: NotifyData; target: "visitor"|"host"; title: string } | null>(null);

  const [form, setForm] = useState({
    visitorName:"", visitorEmail:"", visitorPhone:"", visitorCompany:"",
    purpose:"", scheduledDate:"", scheduledTime:"", hostStaffId:"", notes:"",
    isWalkIn: false,
  });

  // ── data ──
  const visits    = useQuery(api.scheduling.list);
  const visitors  = useQuery(api.visitors.list);
  const staff     = useQuery(api.staff.list);
  const messages  = useQuery(api.messages.listByVisit, selectedVisit?._id && !selectedVisit?.fullName ? { visitId: selectedVisit._id } : "skip");

  const calMonth  = useMemo(() => new Date(), []);
  const rangeStart = useMemo(() => new Date(calMonth.getFullYear(), calMonth.getMonth(), 1).getTime(), [calMonth]);
  const rangeEnd   = useMemo(() => new Date(calMonth.getFullYear(), calMonth.getMonth()+1, 0, 23,59,59,999).getTime(), [calMonth]);
  const liveCalendar = useQuery(api.scheduling.getLiveCalendar, { rangeStart, rangeEnd });

  const proposedStart = useMemo(() => {
    if (!form.scheduledDate || !form.scheduledTime || !form.hostStaffId) return 0;
    return new Date(`${form.scheduledDate}T${form.scheduledTime}`).getTime();
  }, [form.scheduledDate, form.scheduledTime, form.hostStaffId]);

  const conflictData = useQuery(api.scheduling.checkConflicts,
    proposedStart && form.hostStaffId
      ? { hostId: form.hostStaffId as Id<"staff">, proposedStart, proposedEnd: proposedStart + 60*60*1000 }
      : "skip"
  );

  // ── mutations ──
  const scheduleVisit  = useMutation(api.scheduling.create);
  const approve        = useMutation(api.scheduling.approve);
  const reject         = useMutation(api.scheduling.reject);
  const markCheckedIn  = useMutation(api.scheduling.markCheckedIn);
  const markInMeeting  = useMutation(api.scheduling.markInMeeting);
  const markCompleted  = useMutation(api.scheduling.markCompleted);
  const markNoShow     = useMutation(api.scheduling.markNoShow);
  const cancel         = useMutation(api.scheduling.cancel);
  const deleteVisit    = useMutation(api.scheduling.remove);
  const sendMessage    = useMutation(api.messages.send);
  const checkOutWalkIn = useMutation(api.visitors.checkOut);

  // ── today buckets ──
  const now = new Date();
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const todayEnd   = new Date(); todayEnd.setHours(23,59,59,999);

  const todayAppts = useMemo(() => (visits ?? [])
    .filter((v: any) =>
      v.scheduledDate >= todayStart.getTime() &&
      v.scheduledDate <= todayEnd.getTime() &&
      ["pending","approved","accepted","checked_in","in_meeting"].includes(v.status)
    )
    .sort((a: any, b: any) => a.scheduledDate - b.scheduledDate),
  [visits]);

  const todayWalkInsIn = useMemo(() =>
    (visitors ?? []).filter((v: any) => v.status === "IN"),
  [visitors]);

  // ── filtered lists ──
  const FILTER_OPTIONS: StatusFilter[] = ["ALL","pending","approved","checked_in","in_meeting","completed","rejected","cancelled","no_show"];

  const filteredAppts = (visits ?? []).filter((v: any) => {
    const norm = v.status === "accepted" ? "approved" : v.status === "declined" ? "rejected" : v.status;
    const matchStatus = filter === "ALL" || norm === filter;
    const matchSearch = !search ||
      v.visitorName.toLowerCase().includes(search.toLowerCase()) ||
      (v.purpose ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (v.visitorEmail ?? "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const filteredWalkIns = (visitors ?? []).filter((v: any) =>
    !search ||
    v.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (v.company ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (v.purpose ?? "").toLowerCase().includes(search.toLowerCase())
  );

  // ── action dispatcher ──
  const handleAction = async (action: string, visit: any) => {
    setActioningId(visit._id);
    try {
      switch (action) {
        case "approve":    await approve({ visitId: visit._id, actorName: user?.fullName ?? "Receptionist" }); setNotifyModal({template:"approved",target:"visitor",title:"Notify visitor — Approved",data:{visitorName:visit.visitorName,visitorPhone:visit.visitorPhone,visitorEmail:visit.visitorEmail,hostName:visit.hostName,scheduledDate:visit.scheduledDate,purpose:visit.purpose,orgName:orgName}}); break;
        case "reject":     await reject({ visitId: visit._id }); setNotifyModal({template:"rejected",target:"visitor",title:"Notify visitor — Rejected",data:{visitorName:visit.visitorName,visitorPhone:visit.visitorPhone,visitorEmail:visit.visitorEmail,hostName:visit.hostName,scheduledDate:visit.scheduledDate,purpose:visit.purpose,orgName:orgName}}); break;
        case "check_in":   await markCheckedIn({ visitId: visit._id }); break;
        case "in_meeting": await markInMeeting({ visitId: visit._id }); break;
        case "complete":   await markCompleted({ visitId: visit._id }); break;
        case "no_show":    await markNoShow({ visitId: visit._id }); break;
        case "cancel":     await cancel({ visitId: visit._id }); break;
      }
      if (selectedVisit?._id === visit._id) {
        const nextStatus: Record<string,string> = { approve:"approved", reject:"rejected", check_in:"checked_in", in_meeting:"in_meeting", complete:"completed", no_show:"no_show", cancel:"cancelled" };
        setSelectedVisit((sv: any) => ({ ...sv, status: nextStatus[action] ?? sv.status }));
      }
    } finally { setActioningId(null); }
  };

  const handleWalkInCheckOut = async (id: string) => {
    setCheckingOut(id);
    try { await checkOutWalkIn({ visitorId: id as Id<"visitors"> }); }
    finally { setCheckingOut(null); }
  };

  // ── submit new visit ──
  const today = new Date().toISOString().split("T")[0];
  const handleSubmit = async () => {
    if (!form.visitorName || !form.scheduledDate || !form.scheduledTime) return;
    setSubmitting(true);
    try {
      const dt = new Date(`${form.scheduledDate}T${form.scheduledTime}`).getTime();
      const visitId = await scheduleVisit({
        visitorName:    form.visitorName,
        visitorEmail:   form.visitorEmail   || undefined,
        visitorPhone:   form.visitorPhone   || undefined,
        visitorCompany: form.visitorCompany || undefined,
        purpose:        form.purpose        || undefined,
        scheduledDate:  dt,
        hostStaffId:    (form.hostStaffId || undefined) as Id<"staff"> | undefined,
        notes:          form.notes          || undefined,
        source:         form.isWalkIn ? "walkin" : "admin",
      });
      if (form.isWalkIn && visitId) {
        await approve({ visitId: visitId as Id<"scheduledVisits">, actorName: user?.fullName ?? "Receptionist" });
        await markCheckedIn({ visitId: visitId as Id<"scheduledVisits"> });
      }
      setShowModal(false);
      setForm({ visitorName:"", visitorEmail:"", visitorPhone:"", visitorCompany:"", purpose:"", scheduledDate:"", scheduledTime:"", hostStaffId:"", notes:"", isWalkIn:false });
    } finally { setSubmitting(false); }
  };

  const handleSend = async () => {
    if (!message.trim() || !selectedVisit) return;
    await sendMessage({ visitId: selectedVisit._id, senderClerkId: user?.id ?? "", senderName: user?.fullName ?? "Receptionist", senderRole:"receptionist", message: message.trim() });
    setMessage("");
  };

  // ── today banner row renderer ──
  const TodayRow = ({ v, isAppt }: { v: any; isAppt: boolean }) => {
    const isAwaiting = isAppt && ["pending","approved","accepted"].includes(v.status);
    const isOnsite   = isAppt ? ["checked_in","in_meeting"].includes(v.status) : v.status === "IN";
    const apptTime   = isAppt ? new Date(v.scheduledDate) : new Date(v.checkInTime);
    const diffMins   = Math.round((now.getTime() - apptTime.getTime()) / 60000);
    const isLate     = isAwaiting && diffMins > 5;
    const name       = v.visitorName ?? v.fullName;
    const acting     = actioningId === v._id || checkingOut === v._id;

    return (
      <div style={{
        display:"flex", alignItems:"center", gap:16,
        background:"var(--card)",
        border:`1px solid ${isOnsite ? "rgba(58,170,69,0.35)" : "var(--border)"}`,
        borderRadius:12, padding:"14px 18px",
      }}>
        <div style={{
          minWidth:44, height:44, borderRadius:"50%",
          background: isOnsite ? "rgba(58,170,69,0.15)" : "var(--brand)",
          color: isOnsite ? "var(--brand)" : "#fff",
          border: isOnsite ? "2px solid var(--brand)" : "none",
          fontWeight:700, fontSize:18,
          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
        }}>{name[0].toUpperCase()}</div>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:600, fontSize:14, color:"var(--ink)" }}>{name}</div>
          <div style={{ fontSize:12, color:"var(--muted)", marginTop:2 }}>
            {isAppt
              ? `${v.purpose ?? "Visit"}${v.hostName ? ` · ${v.hostName}` : ""}`
              : `${v.purpose ?? "Walk-in"}${v.company ? ` · ${v.company}` : ""}`}
          </div>
        </div>

        <div style={{ textAlign:"center", minWidth:64, flexShrink:0 }}>
          <div style={{ fontSize:16, fontWeight:700, color: isLate ? "var(--red)" : isOnsite ? "var(--brand)" : "var(--ink)" }}>
            {apptTime.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
          </div>
          <div style={{ fontSize:11, color: isLate ? "var(--red)" : "var(--muted)", marginTop:2 }}>
            {isOnsite ? "checked in" : isLate ? `${diffMins}m late` : "appt time"}
          </div>
        </div>

        {isAwaiting && (
          <div style={{ display:"flex", gap:8, flexShrink:0 }}>
            {v.status === "pending" && (
              <button className="action-btn action-btn--accept" disabled={acting}
                onClick={() => handleAction("approve", v)}>
                Approve
              </button>
            )}
            {["approved","accepted"].includes(v.status) && (
              <button className="btn-primary" style={{ fontSize:13, padding:"7px 18px", fontWeight:700 }}
                disabled={acting} onClick={() => handleAction("check_in", v)}>
                {acting ? <span style={{opacity:.5}}>...</span> : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:"4px"}}><polyline points="20 6 9 17 4 12"/></svg>Check In</>}
              </button>
            )}
            <button className="action-btn action-btn--decline" disabled={acting}
              onClick={() => handleAction("no_show", v)}>
              No show
            </button>
          </div>
        )}
        {isOnsite && (
          <div style={{ display:"flex", gap:8, flexShrink:0 }}>
            {isAppt && v.status === "checked_in" && (
              <button className="action-btn action-btn--accept" disabled={acting}
                onClick={() => handleAction("in_meeting", v)}>
                In meeting
              </button>
            )}
            <button className="btn-secondary" style={{ fontSize:13, fontWeight:700 }}
              disabled={acting}
              onClick={() => isAppt ? handleAction("complete", v) : handleWalkInCheckOut(v._id)}>
              {acting ? "…" : "→ Check Out"}
            </button>
          </div>
        )}
      </div>
    );
  };

  // ── render ──────────────────────────────────────────────────────────────
  return (
    <div className="scheduling-page">

      {/* ── header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Check In</h1>
          <p className="page-subtitle">
            <div className="appt-stat-bar">
              <div className="appt-stat-pill">
                <div className="appt-stat-icon appt-stat-icon--pending">🕐</div>
                <div><div className="appt-stat-num">{visits?.filter((v:any) => v.status === "pending").length ?? 0}</div><div className="appt-stat-lbl">Awaiting review</div></div>
              </div>
              <div className="appt-stat-pill">
                <div className="appt-stat-icon appt-stat-icon--approved"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg></div>
                <div><div className="appt-stat-num">{visits?.filter((v:any) => ["approved","accepted"].includes(v.status)).length ?? 0}</div><div className="appt-stat-lbl">Approved</div></div>
              </div>
              <div className="appt-stat-pill">
                <div className="appt-stat-icon appt-stat-icon--checkin">📍</div>
                <div><div className="appt-stat-num">{visits?.filter((v:any) => ["checked_in","in_meeting"].includes(v.status)).length ?? 0}</div><div className="appt-stat-lbl">On premises</div></div>
              </div>
              <div className="appt-stat-pill">
                <div className="appt-stat-icon appt-stat-icon--total">📋</div>
                <div><div className="appt-stat-num">{visits?.length ?? 0}</div><div className="appt-stat-lbl">Total</div></div>
              </div>
            </div>
            {todayAppts.filter((v:any) => ["pending","approved","accepted"].includes(v.status)).length} awaiting ·{" "}
            {todayAppts.filter((v:any) => ["checked_in","in_meeting"].includes(v.status)).length + todayWalkInsIn.length} on premises
            {liveCalendar && <span className="live-indicator"> ● live</span>}
          </p>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <div className="filter-tabs">
            <button className={`filter-tab${view==="list"?" filter-tab--active":""}`} onClick={() => setView("list")}>List</button>
            <button className={`filter-tab${view==="calendar"?" filter-tab--active":""}`} onClick={() => setView("calendar")}>Calendar</button>
          </div>
          <button className="btn-secondary btn-primary--sm"
            onClick={() => { setForm(f => ({ ...f, isWalkIn:true, scheduledDate:today, scheduledTime:new Date().toTimeString().slice(0,5) })); setShowModal(true); }}>
            + Walk-in
          </button>
          <button className="btn-primary btn-primary--sm"
            onClick={() => { setForm(f => ({ ...f, isWalkIn:false })); setShowModal(true); }}>
            + New Appointment
          </button>
        </div>
      </div>

      {/* ── today banner ── */}
      {(todayAppts.length > 0 || todayWalkInsIn.length > 0) && (
        <div style={{ marginBottom:20 }}>
          {todayAppts.filter((v:any) => ["pending","approved","accepted"].includes(v.status)).length > 0 && (
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"var(--muted)", marginBottom:8 }}>
                Awaiting arrival — {todayAppts.filter((v:any) => ["pending","approved","accepted"].includes(v.status)).length}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {todayAppts.filter((v:any) => ["pending","approved","accepted"].includes(v.status)).map((v:any) => (
                  <TodayRow key={v._id} v={v} isAppt={true} />
                ))}
              </div>
            </div>
          )}

          {(todayAppts.filter((v:any) => ["checked_in","in_meeting"].includes(v.status)).length > 0 || todayWalkInsIn.length > 0) && (
            <div>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"var(--muted)", marginBottom:8 }}>
                On premises — {todayAppts.filter((v:any) => ["checked_in","in_meeting"].includes(v.status)).length + todayWalkInsIn.length}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {todayAppts.filter((v:any) => ["checked_in","in_meeting"].includes(v.status)).map((v:any) => (
                  <TodayRow key={v._id} v={v} isAppt={true} />
                ))}
                {todayWalkInsIn.map((v:any) => (
                  <TodayRow key={v._id} v={v} isAppt={false} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── divider ── */}
      <div style={{ borderTop:"1px solid var(--border)", marginBottom:20 }} />

      {/* ── calendar or list ── */}
      {view === "calendar" ? (
        <LiveCalendar
          visits={liveCalendar?.visits ?? (visits ?? [])}
          blockedSlots={liveCalendar?.blockedSlots ?? []}
          onSelectVisit={setSelectedVisit}
        />
      ) : (
        <div style={{ display:"flex", gap:16 }}>
          <div style={{ flex:1, minWidth:0 }}>

            {/* tabs + search + filters */}
            <div className="visitors-toolbar" style={{ marginBottom:12 }}>
              <div className="filter-tabs" style={{ marginRight:8 }}>
                <button className={`filter-tab${tab==="appointments"?" filter-tab--active":""}`} onClick={() => setTab("appointments")}>
                  Appointments <span style={{ fontSize:11, marginLeft:4, opacity:0.7 }}>{visits?.length ?? 0}</span>
                </button>
                <button className={`filter-tab${tab==="walkins"?" filter-tab--active":""}`} onClick={() => setTab("walkins")}>
                  Walk-ins <span style={{ fontSize:11, marginLeft:4, opacity:0.7 }}>{visitors?.length ?? 0}</span>
                </button>
              </div>
              <div className="header-search" style={{ width:260 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input className="header-search-input" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>

            {/* appointments filter bar */}
            {tab === "appointments" && (
              <div className="filter-tabs" style={{ flexWrap:"wrap", marginBottom:12 }}>
                {FILTER_OPTIONS.map(f => (
                  <button key={f} className={`filter-tab${filter===f?" filter-tab--active":""}`} onClick={() => setFilter(f)}>
                    {f === "ALL" ? "All" : STATUS_LABEL[f] ?? f}
                  </button>
                ))}
              </div>
            )}

            {/* ── appointments table ── */}
            {tab === "appointments" && (
              <div className="table-card">
                {visits === undefined ? (
                  <div className="card-empty">Loading…</div>
                ) : filteredAppts.length === 0 ? (
                  <div className="card-empty">No appointments found.</div>
                ) : (
                  <table className="visitors-table">
                    <thead><tr>
                      <th>Visitor</th><th>Purpose</th><th>Scheduled</th><th>Host</th><th>Status</th><th>Actions</th>
                    </tr></thead>
                    <tbody>
                      {filteredAppts.map((v: any) => {
                        const actions = TRANSITIONS[v.status] ?? [];
                        return (
                          <tr key={v._id} onClick={() => setSelectedVisit(v)}
                            style={{ cursor:"pointer" }}
                            className={selectedVisit?._id === v._id ? "row--selected" : ""}>
                            <td>
                              <div className="table-name-cell">
                                <div className="visitor-avatar visitor-avatar--scheduled visitor-avatar--sm">
                                  {v.visitorName[0].toUpperCase()}
                                </div>
                                <div>
                                  <div className="table-name">{v.visitorName}</div>
                                  {v.visitorEmail && <div className="table-sub">{v.visitorEmail}</div>}
                                </div>
                              </div>
                            </td>
                            <td className="table-muted">{v.purpose ?? "—"}</td>
                            <td className="table-muted">
                              {new Date(v.scheduledDate).toLocaleDateString([], { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" })}
                            </td>
                            <td className="table-muted">{v.hostName ?? "—"}</td>
                            <td><span className={`badge ${STATUS_COLOR[v.status] ?? ""}`}>{STATUS_LABEL[v.status] ?? v.status}</span></td>
                            <td onClick={e => e.stopPropagation()}>
                              <div className="row-actions">
                                {actions.map(a => (
                                  <button key={a.action} className={`action-btn ${a.cls}`}
                                    onClick={() => handleAction(a.action, v)}>{a.label}</button>
                                ))}
                                {["pending","approved","accepted"].includes(v.status) && (
                                  <button className="action-btn action-btn--reschedule"
                                    onClick={() => { setSelectedVisit(v); setShowReschedule(true); }}>↻ Reschedule</button>
                                )}
                                {["pending","approved","accepted","checked_in","in_meeting"].includes(v.status) && (
                                  <button className="action-btn" style={{background:"rgba(37,211,102,0.1)",color:"#25d366",border:"1px solid rgba(37,211,102,0.3)"}}
                                    onClick={() => setNotifyModal({template:["approved","accepted"].includes(v.status)?"approved":v.status==="pending"?"custom":"visitor_arrived",target:"visitor",title:"Notify visitor",data:{visitorName:v.visitorName,visitorPhone:v.visitorPhone,visitorEmail:v.visitorEmail,hostName:v.hostName,scheduledDate:v.scheduledDate,purpose:v.purpose,orgName:orgName}})}>
                                    💬 Notify
                                  </button>
                                )}
                                <button className="action-btn action-btn--delete" onClick={() => deleteVisit({ visitId: v._id })}>Delete</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ── walk-ins table ── */}
            {tab === "walkins" && (
              <div className="table-card">
                {visitors === undefined ? (
                  <div className="card-empty">Loading…</div>
                ) : filteredWalkIns.length === 0 ? (
                  <div className="card-empty">No walk-ins found.</div>
                ) : (
                  <table className="visitors-table">
                    <thead><tr>
                      <th>Visitor</th><th>Company</th><th>Purpose</th><th>Time in</th><th>Status</th><th></th>
                    </tr></thead>
                    <tbody>
                      {filteredWalkIns.map((v: any) => (
                        <tr key={v._id} style={{ cursor:"default" }}>
                          <td>
                            <div className="table-name-cell">
                              <div className="visitor-avatar visitor-avatar--sm"
                                style={{ background: hashColor(v.fullName) }}>
                                {v.fullName[0].toUpperCase()}
                              </div>
                              <div>
                                <div className="table-name">{v.fullName}</div>
                                {v.email && <div className="table-sub">{v.email}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="table-muted">{v.company ?? "—"}</td>
                          <td className="table-muted">{v.purpose ?? "—"}</td>
                          <td className="table-muted">
                            {new Date(v.checkInTime).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
                          </td>
                          <td>
                            <span className={`vp-badge vp-badge--${v.status === "IN" ? "in" : "out"}`}>
                              {v.status}
                            </span>
                          </td>
                          <td>
                            <div className="row-actions">
                              {v.status === "IN" && (
                                <button className="action-btn action-btn--complete"
                                  disabled={checkingOut === v._id}
                                  onClick={() => handleWalkInCheckOut(v._id)}>
                                  {checkingOut === v._id ? "…" : "Check out"}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          {/* ── detail panel ── */}
          {selectedVisit && (
            <div className="visitor-detail-panel">
              <div className="panel-header">
                <h3 className="panel-title">Visit details</h3>
                <button className="modal-close" onClick={() => setSelectedVisit(null)}>✕</button>
              </div>
              <div className="panel-body">
                <div className="panel-avatar">{selectedVisit.visitorName[0].toUpperCase()}</div>
                <div className="panel-name">{selectedVisit.visitorName}</div>
                <span className={`badge ${STATUS_COLOR[selectedVisit.status] ?? ""}`}
                  style={{ margin:"6px auto 0", display:"block", width:"fit-content" }}>
                  {STATUS_LABEL[selectedVisit.status] ?? selectedVisit.status}
                </span>

                {(TRANSITIONS[selectedVisit.status] ?? []).length > 0 && (
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:12 }}>
                    {(TRANSITIONS[selectedVisit.status] ?? []).map(a => (
                      <button key={a.action} className={`action-btn ${a.cls}`} style={{ flex:1 }}
                        onClick={() => handleAction(a.action, selectedVisit)}>{a.label}</button>
                    ))}
                  </div>
                )}

                {["pending","approved","accepted"].includes(selectedVisit.status) && (
                  <button className="action-btn action-btn--reschedule"
                    style={{ width:"100%", marginTop:8, justifyContent:"center" }}
                    onClick={() => setShowReschedule(true)}>
                    ↻ Reschedule
                  </button>
                )}
                {selectedVisit.hostName && ["checked_in","in_meeting"].includes(selectedVisit.status) && (
                  <div style={{ display:"flex", gap:8, marginTop:8 }}>
                    <button className="action-btn" style={{flex:1,background:"rgba(37,211,102,0.1)",color:"#25d366",border:"1px solid rgba(37,211,102,0.3)"}}
                      onClick={() => setNotifyModal({template:"visitor_arrived",target:"host",title:"Notify host",data:{visitorName:selectedVisit.visitorName,visitorPhone:selectedVisit.visitorPhone,hostName:selectedVisit.hostName,hostPhone:selectedVisit.hostPhone,scheduledDate:selectedVisit.scheduledDate,purpose:selectedVisit.purpose,orgName:orgName}})}>
                      💬 WhatsApp host
                    </button>
                    <button className="action-btn" style={{flex:1,background:"rgba(88,166,255,0.1)",color:"var(--blue,#58a6ff)",border:"1px solid rgba(88,166,255,0.3)"}}
                      onClick={() => setNotifyModal({template:"visitor_arrived",target:"host",title:"Message host",data:{visitorName:selectedVisit.visitorName,visitorPhone:selectedVisit.visitorPhone,hostName:selectedVisit.hostName,hostPhone:selectedVisit.hostPhone,scheduledDate:selectedVisit.scheduledDate,purpose:selectedVisit.purpose,orgName:orgName}})}>
                      ✉ Message host
                    </button>
                  </div>
                )}

                <div className="panel-fields" style={{ marginTop:16 }}>
                  {[
                    { label:"Date & time", value: new Date(selectedVisit.scheduledDate).toLocaleString() },
                    { label:"Purpose",     value: selectedVisit.purpose },
                    { label:"Host",        value: selectedVisit.hostName },
                    { label:"Company",     value: selectedVisit.visitorCompany },
                    { label:"Email",       value: selectedVisit.visitorEmail },
                    { label:"Phone",       value: selectedVisit.visitorPhone },
                    { label:"Notes",       value: selectedVisit.notes },
                    { label:"Approved by", value: selectedVisit.approvedBy },
                  ].map(({ label, value }) => value ? (
                    <div key={label} className="panel-field">
                      <span className="panel-field-label">{label}</span>
                      <span className="panel-field-value">{value}</span>
                    </div>
                  ) : null)}
                </div>

                <div className="message-thread">
                  <div className="message-thread-title">Messages with staff</div>
                  <div className="message-list">
                    {messages === undefined ? (
                      <div className="card-empty" style={{ padding:"12px 0" }}>Loading…</div>
                    ) : messages.length === 0 ? (
                      <div className="card-empty" style={{ padding:"12px 0", fontSize:12 }}>No messages yet.</div>
                    ) : messages.map((m: any) => (
                      <div key={m._id} className={`message-bubble message-bubble--${m.senderRole === "receptionist" ? "self" : "other"}`}>
                        <span className="message-sender">{m.senderName}</span>
                        <span className="message-text">{m.message}</span>
                        <span className="message-time">{new Date(m.createdAt).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}</span>
                      </div>
                    ))}
                  </div>
                  <div className="message-input-row">
                    <input className="field-input" placeholder="Message staff…" value={message}
                      onChange={e => setMessage(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />
                    <button className="btn-primary btn-primary--sm" onClick={handleSend} disabled={!message.trim()}>Send</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── modals ── */}
      {notifyModal && (
        <NotifyModal
          isOpen={true}
          onClose={() => setNotifyModal(null)}
          template={notifyModal.template}
          data={notifyModal.data}
          target={notifyModal.target}
          title={notifyModal.title}
          onInApp={notifyModal.target==="host" && selectedVisit
            ? (msg) => { sendMessage({ visitId: selectedVisit._id, senderClerkId: user?.id ?? "", senderName: user?.fullName ?? "Receptionist", senderRole:"receptionist", message: msg }); setNotifyModal(null); }
            : undefined}
        />
      )}
      {showReschedule && selectedVisit && (
        <RescheduleModal visit={selectedVisit} onClose={() => setShowReschedule(false)} onDone={() => setShowReschedule(false)} />
      )}

      {/* ── new visit / walk-in modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{form.isWalkIn ? "Register walk-in visitor" : "Schedule a visit"}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-form">
              {form.isWalkIn && (
                <div className="walk-in-banner"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:"5px"}}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>Walk-in — visitor will be immediately approved &amp; checked in</div>
              )}
              {conflictData?.hasConflict && (
                <div className="conflict-banner">
                  ⚠️ Conflict detected for this host at this time.
                  {conflictData.blockedConflicts.length > 0 && <span> Host has a blocked slot ({conflictData.blockedConflicts[0].reason ?? "blocked"}).</span>}
                  {conflictData.visitConflicts.length > 0 && <span> Another visit is already scheduled ({conflictData.visitConflicts[0].visitorName}).</span>}
                </div>
              )}
              <div className="form-grid">
                {([
                  { key:"visitorName",    label:"Visitor name",  req:true },
                  { key:"visitorEmail",   label:"Email",         req:false },
                  { key:"visitorPhone",   label:"Phone",         req:false },
                  { key:"visitorCompany", label:"Company",       req:false },
                ] as { key: keyof typeof form; label: string; req: boolean }[]).map(({ key, label, req }) => (
                  <div key={key} className={`field-group${req ? " field-group--required" : ""}`}>
                    <label className="field-label">{label}</label>
                    <input className="field-input" value={form[key] as string}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                  </div>
                ))}
                <div className="field-group">
                  <label className="field-label">Purpose</label>
                  <select className="field-input field-select" value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}>
                    <option value="">Select purpose…</option>
                    {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="field-group">
                  <label className="field-label">Host</label>
                  <select className="field-input field-select" value={form.hostStaffId} onChange={e => setForm(f => ({ ...f, hostStaffId: e.target.value }))}>
                    <option value="">Select host…</option>
                    {staff?.map((s: any) => (
                      <option key={s._id} value={s._id}>
                        {s.name}{s.department ? ` — ${s.department}` : ""}{s.availability && s.availability !== "available" ? ` (${s.availability})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field-group field-group--required">
                  <label className="field-label">Date</label>
                  <input type="date" className="field-input" value={form.scheduledDate} min={today}
                    onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))} />
                </div>
                <div className="field-group field-group--required">
                  <label className="field-label">Time</label>
                  <input type="time" className="field-input" value={form.scheduledTime}
                    onChange={e => setForm(f => ({ ...f, scheduledTime: e.target.value }))} />
                </div>
                <div className="field-group field-group--full">
                  <label className="field-label">Notes</label>
                  <textarea className="field-input field-textarea" value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn-primary"
                  disabled={submitting || !form.visitorName || !form.scheduledDate || !form.scheduledTime}
                  onClick={handleSubmit}>
                  {submitting ? "Saving…" : form.isWalkIn ? "Check in visitor" : "Schedule visit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}