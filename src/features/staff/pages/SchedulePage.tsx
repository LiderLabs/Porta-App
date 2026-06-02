import { LiveCalendar } from "../../shared/LiveCalendar";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useUser } from "@clerk/clerk-react";
import { X, CalendarDays, List, CheckCheck, XCircle } from "lucide-react";

type Tab = "all" | "pending" | "upcoming" | "past";
type View = "calendar" | "list";

const MONTHS  = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS    = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const PURPOSES = ["Meeting","Interview","Delivery","Training","Consultation","Site visit","Other"];

const STATUS_COLORS: Record<string, string> = {
  pending:    "#f59e0b",
  approved:   "#3fb950",
  rejected:   "#f85149",
  checked_in: "#00b1d8",
  in_meeting: "#7c3aed",
  completed:  "#45ba50",
  cancelled:  "#6b7280",
  no_show:    "#ef4444",
};
const STATUS_LABELS: Record<string, string> = {
  pending:    "Pending",
  approved:   "Approved",
  rejected:   "Rejected",
  checked_in: "Checked In",
  in_meeting: "In Meeting",
  completed:  "Completed",
  cancelled:  "Cancelled",
  no_show:    "No Show",
};

export function SchedulePage() {
  const { user } = useUser();

  const [view, setView]                     = useState<View>("calendar");
  const [tab, setTab]                       = useState<Tab>("all");
  const [selectedVisit, setSelectedVisit]   = useState<any>(null);
  const [calDate, setCalDate]               = useState(new Date());
  const [showForm, setShowForm]             = useState(false);
  const [showBreakForm, setShowBreakForm]   = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleSaving, setRescheduleSaving] = useState(false);

  const [form, setForm] = useState({
    visitorName: "", visitorEmail: "", visitorPhone: "",
    visitorCompany: "", purpose: "", scheduledDate: "", scheduledTime: "", notes: "",
  });
  const [formSaving, setFormSaving] = useState(false);
  const [breakForm, setBreakForm]   = useState({ startTime: "", endTime: "", reason: "" });
  const [breakSaving, setBreakSaving] = useState(false);

  const visits       = useQuery(api.scheduling.listByStaff, { clerkUserId: user?.id ?? "" });
  const staffRecord  = useQuery(api.staff.getByClerkId,     { clerkUserId: user?.id ?? "" });
  const blockedSlots = useQuery(
    api.scheduling.getBlockedSlots,
    staffRecord?._id ? { staffId: staffRecord._id } : "skip"
  );

  const approveVisit   = useMutation(api.scheduling.approve);
  const rejectVisit    = useMutation(api.scheduling.reject);
  const markNoShow     = useMutation(api.scheduling.markNoShow);
  const rescheduleVisit = useMutation(api.scheduling.reschedule);
  const createVisit = useMutation(api.scheduling.createByStaff);
  const blockSlot      = useMutation(api.scheduling.blockSlot);
  const unblockSlot    = useMutation(api.scheduling.unblockSlot);

  const now   = Date.now();
  const year  = calDate.getFullYear();
  const month = calDate.getMonth();
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const visitsByDay: Record<number, any[]>  = {};
  const blockedByDay: Record<number, any[]> = {};
  (visits ?? []).forEach((v: any) => {
    const d = new Date(v.scheduledDate);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      visitsByDay[day] = [...(visitsByDay[day] ?? []), v];
    }
  });
  (blockedSlots ?? []).forEach((b: any) => {
    const d = new Date(b.startTime);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      blockedByDay[day] = [...(blockedByDay[day] ?? []), b];
    }
  });

  const pending  = (visits ?? []).filter((v: any) => v.status === "pending");
  const upcoming = (visits ?? []).filter((v: any) =>
    ["approved","checked_in","in_meeting"].includes(v.status) && v.scheduledDate >= now
  );
  const filtered = (visits ?? []).filter((v: any) => {
    if (tab === "pending")  return v.status === "pending";
    if (tab === "upcoming") return ["approved","checked_in","in_meeting"].includes(v.status) && v.scheduledDate >= now;
    if (tab === "past")     return v.scheduledDate < now || ["completed","no_show","cancelled"].includes(v.status);
    return true;
  });

  const handleCreate = async () => {
    if (!form.visitorName.trim() || !form.scheduledDate || !form.scheduledTime) return;
    setFormSaving(true);
    try {
      const dt = new Date(`${form.scheduledDate}T${form.scheduledTime}`).getTime();
      await createVisit({
        visitorName:    form.visitorName.trim(),
        visitorEmail:   form.visitorEmail   || undefined,
        visitorPhone:   form.visitorPhone   || undefined,
        visitorCompany: form.visitorCompany || undefined,
        purpose:        form.purpose        || undefined,
        notes:          form.notes          || undefined,
        scheduledDate:  dt,
        duration: (() => { if (!form.endTime) return undefined; const e = new Date(`${form.scheduledDate}T${form.endTime}`).getTime(); return e > dt ? Math.round((e-dt)/60000) : undefined; })(),
        hostStaffId:    staffRecord?._id,
      });
      setForm({ visitorName:"", visitorEmail:"", visitorPhone:"", visitorCompany:"", purpose:"", scheduledDate:"", scheduledTime:"", notes:"", endTime:"" });
      setShowForm(false);
    } finally { setFormSaving(false); }
  };

  const handleApprove = async (v: any) => {
    await approveVisit({ visitId: v._id });
    if (selectedVisit?._id === v._id) setSelectedVisit({ ...selectedVisit, status: "approved" });
  };
  const handleReject = async (v: any) => {
    await rejectVisit({ visitId: v._id });
    if (selectedVisit?._id === v._id) setSelectedVisit({ ...selectedVisit, status: "rejected" });
  };
  const handleNoShow = async (v: any) => {
    await markNoShow({ visitId: v._id });
    if (selectedVisit?._id === v._id) setSelectedVisit({ ...selectedVisit, status: "no_show" });
  };
  const handleReschedule = async () => {
    if (!rescheduleDate || !rescheduleTime || !selectedVisit) return;
    setRescheduleSaving(true);
    try {
      const dt = new Date(`${rescheduleDate}T${rescheduleTime}`).getTime();
      await rescheduleVisit({ visitId: selectedVisit._id, scheduledDate: dt });
      setSelectedVisit({ ...selectedVisit, scheduledDate: dt,
        duration: (() => { if (!form.endTime) return undefined; const e = new Date(`${form.scheduledDate}T${form.endTime}`).getTime(); return e > dt ? Math.round((e-dt)/60000) : undefined; })(), status: "pending" });
      setShowReschedule(false);
      setRescheduleDate(""); setRescheduleTime("");
    } finally { setRescheduleSaving(false); }
  };
  const handleBlockSlot = async () => {
    if (!breakForm.startTime || !breakForm.endTime || !staffRecord?._id) return;
    setBreakSaving(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const start = new Date(`${today}T${breakForm.startTime}`).getTime();
      const end   = new Date(`${today}T${breakForm.endTime}`).getTime();
      await blockSlot({ staffId: staffRecord._id, startTime: start, endTime: end, reason: breakForm.reason || undefined, createdByClerkId: user?.id ?? "" });
      setBreakForm({ startTime:"", endTime:"", reason:"" });
      setShowBreakForm(false);
    } finally { setBreakSaving(false); }
  };

  const closePanel = () => { setSelectedVisit(null); setShowReschedule(false); };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');

        .scp {
          font-family: 'DM Sans', sans-serif;
          padding: 24px 28px 48px;
          width: 100%;
          min-height: 0;
          box-sizing: border-box;
          color: var(--text);
        }

        /* -- Header -- */
        .scp-hdr {
          display: flex; align-items: flex-start;
          justify-content: space-between; flex-wrap: wrap;
          gap: 12px; margin-bottom: 22px;
        }
        .scp-title { font-size: 1.5rem; font-weight: 800; letter-spacing: -0.02em; color: var(--text); margin-bottom: 6px; }
        .scp-chips { display: flex; gap: 8px; }
        .scp-chip  { font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
        .scp-chip--orange { background: rgba(245,158,11,0.15); color: #f59e0b; }
        .scp-chip--green  { background: rgba(63,185,80,0.15);  color: #3fb950; }

        .scp-hdr-right { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

        /* View toggle */
        .scp-view-tabs { display: flex; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 3px; gap: 2px; }
        .scp-view-tab  { padding: 6px 12px; border-radius: 6px; border: none; background: none; font-size: 0.8rem; font-weight: 600; color: var(--muted); cursor: pointer; font-family: inherit; transition: all .12s; display: flex; align-items: center; gap: 5px; }
        .scp-view-tab:hover { color: var(--text); }
        .scp-view-tab--on { background: var(--bg); color: var(--text); box-shadow: 0 1px 4px rgba(0,0,0,0.15); }

        .scp-new-btn { background: var(--accent); color: #fff; border: none; border-radius: 8px; padding: 9px 18px; font-size: 0.875rem; font-weight: 700; cursor: pointer; font-family: inherit; transition: filter .15s; }
        .scp-new-btn:hover { filter: brightness(1.1); }

        /* -- Calendar -- */
        .cal-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; width: 100%; }
        .cal-nav  { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid var(--border); }
        .cal-month { font-size: 1rem; font-weight: 700; color: var(--text); }
        .cal-nav-btn { background: none; border: 1px solid var(--border); border-radius: 8px; padding: 5px 12px; color: var(--muted); cursor: pointer; font-size: 16px; transition: all .12s; }
        .cal-nav-btn:hover { background: var(--hov); color: var(--text); }
        .cal-nav-mid { display: flex; gap: 8px; align-items: center; }
        .cal-break-btn { background: none; border: 1px solid var(--border); border-radius: 8px; padding: 6px 12px; color: var(--muted); cursor: pointer; font-family: inherit; font-size: 0.78rem; font-weight: 600; transition: all .12s; display: flex; align-items: center; gap: 5px; }
        .cal-break-btn:hover { border-color: #f59e0b; color: #f59e0b; background: rgba(245,158,11,0.08); }

        .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); }
        .cal-day-hdr { padding: 8px 0; text-align: center; font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border); }
        .cal-cell { min-height: 100px; border-right: 1px solid var(--border); border-bottom: 1px solid var(--border); padding: 6px 7px; transition: background .1s; cursor: default; }
        .cal-cell:nth-child(7n) { border-right: none; }
        .cal-cell:hover { background: var(--hov); }
        .cal-cell--today .cal-day-num { background: var(--accent); color: #fff; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-weight: 700; }
        .cal-day-num { font-size: 11px; font-weight: 600; color: var(--muted); margin-bottom: 4px; display: inline-flex; }
        .cal-events { display: flex; flex-direction: column; gap: 2px; }
        .cal-event { font-size: 11px; font-weight: 600; padding: 2px 6px; border-radius: 4px; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #fff; transition: filter .1s; }
        .cal-event:hover { filter: brightness(1.15); }
        .cal-event--blocked { background: var(--hov); color: var(--muted); cursor: default; font-size: 10px; display: flex; align-items: center; gap: 3px; }
        .cal-more { font-size: 10px; color: var(--muted); padding: 1px 4px; }

        /* -- List -- */
        .scp-tabs { display: flex; gap: 4px; margin-bottom: 14px; padding: 3px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; width: fit-content; }
        .scp-tab  { padding: 7px 16px; border-radius: 7px; border: none; background: none; font-size: 0.82rem; font-weight: 600; color: var(--muted); cursor: pointer; font-family: inherit; display: flex; align-items: center; gap: 6px; transition: all .12s; }
        .scp-tab:hover { color: var(--text); }
        .scp-tab--on { background: var(--bg); color: var(--text); box-shadow: 0 1px 4px rgba(0,0,0,0.15); }
        .scp-tab-badge { background: #f59e0b; color: #fff; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 10px; }

        .scp-empty { padding: 48px 20px; text-align: center; color: var(--muted); font-size: 0.875rem; }
        .scp-visit-list { display: flex; flex-direction: column; gap: 8px; }
        .scp-vc { display: flex; align-items: center; gap: 14px; padding: 14px 16px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; cursor: pointer; transition: all .12s; }
        .scp-vc:hover { border-color: var(--accent); background: var(--hov); }
        .scp-vc--past { opacity: 0.6; }
        .scp-vc-av { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px; color: #fff; flex-shrink: 0; }
        .scp-vc-info { flex: 1; min-width: 0; }
        .scp-vc-name { font-size: 0.875rem; font-weight: 700; color: var(--text); }
        .scp-vc-meta { font-size: 0.75rem; color: var(--muted); margin-top: 2px; }
        .scp-vc-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }
        .scp-vc-status { font-size: 12px; font-weight: 700; }
        .scp-vc-btns { display: flex; gap: 5px; }
        .scp-vc-approve { padding: 4px 10px; background: var(--accent); color: #fff; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }
        .scp-vc-reject  { padding: 4px 10px; background: none; border: 1px solid #f85149; color: #f85149; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }

        /* -- Detail drawer (slide-in from right) -- */
        .scp-drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 200; }
        .scp-drawer { position: fixed; top: 0; right: 0; bottom: 0; width: 360px; max-width: 95vw; background: var(--surface); border-left: 1px solid var(--border); z-index: 201; display: flex; flex-direction: column; box-shadow: -8px 0 32px rgba(0,0,0,0.25); animation: drawer-in 0.22s ease; }
        @keyframes drawer-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .scp-drawer-hd { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
        .scp-drawer-title { font-size: 0.9rem; font-weight: 700; color: var(--text); }
        .scp-drawer-close { background: none; border: none; color: var(--muted); cursor: pointer; display: flex; align-items: center; padding: 4px; border-radius: 6px; transition: background .12s; }
        .scp-drawer-close:hover { background: var(--hov); color: var(--text); }
        .scp-drawer-body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
        .scp-drawer-av { width: 54px; height: 54px; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 22px; color: #fff; }
        .scp-drawer-name { text-align: center; font-size: 1rem; font-weight: 700; color: var(--text); }
        .scp-drawer-badge { text-align: center; }
        .scp-drawer-badge span { display: inline-block; padding: 3px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; color: #fff; }
        .scp-drawer-fields { background: var(--bg); border: 1px solid var(--border); border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 9px; }
        .scp-drawer-field { display: flex; justify-content: space-between; gap: 8px; font-size: 0.8rem; }
        .scp-drawer-field-lbl { color: var(--muted); font-weight: 500; flex-shrink: 0; }
        .scp-drawer-field-val { color: var(--text); font-weight: 600; text-align: right; }
        .scp-drawer-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .scp-d-approve { flex: 1; padding: 9px; background: var(--accent); color: #fff; border: none; border-radius: 8px; font-size: 0.82rem; font-weight: 700; cursor: pointer; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 5px; }
        .scp-d-reject  { flex: 1; padding: 9px; background: none; border: 1px solid #f85149; color: #f85149; border-radius: 8px; font-size: 0.82rem; font-weight: 700; cursor: pointer; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 5px; }
        .scp-d-noshow  { width: 100%; padding: 9px; background: none; border: 1px solid var(--border); color: var(--muted); border-radius: 8px; font-size: 0.82rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: all .12s; }
        .scp-d-noshow:hover { border-color: #f85149; color: #f85149; }
        .scp-d-reschedule { width: 100%; padding: 9px; background: none; border: 1px solid var(--border); color: var(--muted); border-radius: 8px; font-size: 0.82rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: all .12s; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .scp-d-reschedule:hover { border-color: var(--accent); color: var(--accent); }
        .scp-rs-form { background: var(--bg); border: 1px solid var(--border); border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
        .scp-rs-lbl { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
        .scp-rs-input { padding: 8px 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 7px; font-size: 0.82rem; font-family: inherit; color: var(--text); outline: none; width: 100%; }
        .scp-rs-input:focus { border-color: var(--accent); }
        .scp-rs-row { display: flex; gap: 6px; }
        .scp-rs-save { flex: 1; padding: 7px; background: var(--accent); color: #fff; border: none; border-radius: 7px; font-size: 0.8rem; font-weight: 700; cursor: pointer; font-family: inherit; }
        .scp-rs-save:disabled { opacity: 0.5; cursor: not-allowed; }
        .scp-rs-cancel { padding: 7px 12px; background: none; border: 1px solid var(--border); border-radius: 7px; font-size: 0.8rem; font-weight: 600; color: var(--muted); cursor: pointer; font-family: inherit; }

        /* -- Modals -- */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 300; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .scp-modal { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; width: 100%; max-width: 540px; max-height: 90vh; overflow-y: auto; }
        .scp-modal-hd { display: flex; align-items: flex-start; justify-content: space-between; padding: 20px 22px 16px; border-bottom: 1px solid var(--border); }
        .scp-modal-title { font-size: 1rem; font-weight: 800; color: var(--text); }
        .scp-modal-sub   { font-size: 0.78rem; color: var(--muted); margin-top: 3px; }
        .scp-modal-close { background: none; border: none; color: var(--muted); cursor: pointer; display: flex; align-items: center; padding: 4px; border-radius: 6px; }
        .scp-modal-close:hover { background: var(--hov); color: var(--text); }
        .scp-modal-body  { padding: 20px 22px; }
        .scp-form-grid   { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .scp-field       { display: flex; flex-direction: column; gap: 5px; }
        .scp-field--full { grid-column: 1 / -1; }
        .scp-field-lbl   { font-size: 12px; font-weight: 600; color: var(--muted); }
        .scp-req         { color: #f85149; }
        .scp-field-input { padding: 9px 11px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; font-size: 0.875rem; font-family: inherit; color: var(--text); outline: none; width: 100%; }
        .scp-field-input:focus { border-color: var(--accent); }
        .scp-field-textarea { resize: vertical; min-height: 70px; }
        .scp-modal-ft    { padding: 14px 22px 20px; border-top: 1px solid var(--border); display: flex; gap: 8px; justify-content: flex-end; }
        .scp-cancel-btn  { padding: 9px 18px; background: none; border: 1px solid var(--border); border-radius: 8px; font-size: 0.875rem; font-weight: 600; color: var(--muted); cursor: pointer; font-family: inherit; }
        .scp-submit-btn  { padding: 9px 20px; background: var(--accent); color: #fff; border: none; border-radius: 8px; font-size: 0.875rem; font-weight: 700; cursor: pointer; font-family: inherit; }
        .scp-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        @media (max-width: 600px) {
          .scp { padding: 16px 14px 40px; }
          .scp-form-grid { grid-template-columns: 1fr; }
          .scp-drawer { width: 100vw; }
        }
      `}</style>

      <div className="scp">
        {/* -- Header -- */}
        <div className="scp-hdr">
          <div>
            <div className="scp-title">My Schedule</div>
            <div className="scp-chips">
              <span className="scp-chip scp-chip--orange">{pending.length} pending</span>
              <span className="scp-chip scp-chip--green">{upcoming.length} upcoming</span>
            </div>
          </div>
          <div className="scp-hdr-right">
            {/* Single view toggle — only one */}
            <div className="scp-view-tabs">
              <button
                className={`scp-view-tab${view === "calendar" ? " scp-view-tab--on" : ""}`}
                onClick={() => setView("calendar")}
              >
                <CalendarDays size={14} /> Calendar
              </button>
              <button
                className={`scp-view-tab${view === "list" ? " scp-view-tab--on" : ""}`}
                onClick={() => setView("list")}
              >
                <List size={14} /> List
              </button>
            </div>
            <button className="scp-new-btn" onClick={() => setShowForm(true)}>+ Schedule visit</button>
          </div>
        </div>

        {/* -- Calendar view -- */}
        {view === "calendar" && (
          <div className="cal-card">
            <div className="cal-nav">
              <button className="cal-nav-btn" onClick={() => setCalDate(new Date(year, month - 1, 1))}>‹</button>
              <div className="cal-nav-mid">
                <button className="cal-break-btn" onClick={() => setShowBreakForm(true)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg> Set a break
                </button>
                <span className="cal-month">{MONTHS[month]} {year}</span>
              </div>
              <button className="cal-nav-btn" onClick={() => setCalDate(new Date(year, month + 1, 1))}>›</button>
            </div>

            <div className="cal-grid">
              {DAYS.map(d => <div key={d} className="cal-day-hdr">{d}</div>)}
              {cells.map((day, i) => {
                const today   = new Date();
                const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                const dayVisits  = day ? (visitsByDay[day]  ?? []) : [];
                const dayBlocked = day ? (blockedByDay[day] ?? []) : [];
                const visible    = dayVisits.slice(0, 3);
                const extra      = dayVisits.length - 3;
                return (
                  <div key={i} className={`cal-cell${isToday ? " cal-cell--today" : ""}`}>
                    {day && (
                      <>
                        <span className="cal-day-num">{day}</span>
                        <div className="cal-events">
                          {dayBlocked.map((b: any) => (
                            <div key={b._id} className="cal-event cal-event--blocked" title={b.reason || "Break"}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg> {b.reason || "Break"}
                            </div>
                          ))}
                          {visible.map((v: any) => (
                            <div key={v._id} className="cal-event"
                              style={{ background: STATUS_COLORS[v.status] ?? "#6b7280" }}
                              onClick={() => setSelectedVisit(v)}
                              title={`${v.visitorName} — ${STATUS_LABELS[v.status]}`}>
                              {v.visitorName.split(" ")[0]}
                            </div>
                          ))}
                          {extra > 0 && <div className="cal-more">+{extra} more</div>}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* -- List view -- */}
        {view === "list" && (
          <div>
            <div className="scp-tabs">
              {(["all","pending","upcoming","past"] as Tab[]).map(t => (
                <button key={t} className={`scp-tab${tab === t ? " scp-tab--on" : ""}`} onClick={() => setTab(t)}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                  {t === "pending" && pending.length > 0 && (
                    <span className="scp-tab-badge">{pending.length}</span>
                  )}
                </button>
              ))}
            </div>

            {visits === undefined ? (
              <div className="scp-empty">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="scp-empty">
                {tab === "all" ? 'No visits yet. Click "+ Schedule visit" to add one.' : `No ${tab} visits.`}
              </div>
            ) : (
              <div className="scp-visit-list">
                {filtered.map((v: any) => {
                  const isPast = v.scheduledDate < Date.now();
                  const hue = [...v.visitorName].reduce((a: number, c: string) => a + c.charCodeAt(0), 0) % 360;
                  return (
                    <div key={v._id}
                      className={`scp-vc${isPast ? " scp-vc--past" : ""}`}
                      onClick={() => setSelectedVisit(v)}>
                      <div className="scp-vc-av" style={{ background: `hsl(${hue},50%,28%)` }}>
                        {v.visitorName[0].toUpperCase()}
                      </div>
                      <div className="scp-vc-info">
                        <div className="scp-vc-name">{v.visitorName}</div>
                        <div className="scp-vc-meta">
                          {new Date(v.scheduledDate).toLocaleDateString([], { weekday:"short", month:"short", day:"numeric" })}
                          {" · "}{new Date(v.scheduledDate).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
                          {v.purpose && ` · ${v.purpose}`}
                        </div>
                      </div>
                      <div className="scp-vc-right">
                        <span className="scp-vc-status" style={{ color: STATUS_COLORS[v.status] ?? "" }}>
                          {STATUS_LABELS[v.status] ?? v.status}
                        </span>
                        {v.status === "pending" && (
                          <div className="scp-vc-btns" onClick={e => e.stopPropagation()}>
                            <button className="scp-vc-approve" onClick={() => handleApprove(v)}>Approve</button>
                            <button className="scp-vc-reject"  onClick={() => handleReject(v)}>Reject</button>
                          </div>
                        )}
                        {["approved","checked_in"].includes(v.status) && (
                          <div className="scp-vc-btns" onClick={e => e.stopPropagation()}>
                            <button className="scp-vc-reject" onClick={() => handleNoShow(v)}>No-show</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* -- Detail drawer (slide in from right, full height) -- */}
      {selectedVisit && (
        <>
          <div className="scp-drawer-overlay" onClick={closePanel} />
          <div className="scp-drawer">
            <div className="scp-drawer-hd">
              <div className="scp-drawer-title">Visit details</div>
              <button className="scp-drawer-close" onClick={closePanel}><X size={16} /></button>
            </div>
            <div className="scp-drawer-body">
              {(() => {
                const hue = [...selectedVisit.visitorName].reduce((a: number, c: string) => a + c.charCodeAt(0), 0) % 360;
                return (
                  <>
                    <div className="scp-drawer-av" style={{ background: `hsl(${hue},50%,28%)` }}>
                      {selectedVisit.visitorName[0].toUpperCase()}
                    </div>
                    <div className="scp-drawer-name">{selectedVisit.visitorName}</div>
                    <div className="scp-drawer-badge">
                      <span style={{ background: STATUS_COLORS[selectedVisit.status] ?? "#6b7280" }}>
                        {STATUS_LABELS[selectedVisit.status] ?? selectedVisit.status}
                      </span>
                    </div>

                    <div className="scp-drawer-fields">
                      {[
                        { label:"Date & time", value: new Date(selectedVisit.scheduledDate).toLocaleString([], { weekday:"short", month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" }) },
                        { label:"Purpose",     value: selectedVisit.purpose },
                        { label:"Company",     value: selectedVisit.visitorCompany },
                        { label:"Email",       value: selectedVisit.visitorEmail },
                        { label:"Phone",       value: selectedVisit.visitorPhone },
                        { label:"Notes",       value: selectedVisit.notes },
                      ].filter(f => f.value).map(({ label, value }) => (
                        <div key={label} className="scp-drawer-field">
                          <span className="scp-drawer-field-lbl">{label}</span>
                          <span className="scp-drawer-field-val">{value}</span>
                        </div>
                      ))}
                    </div>

                    {selectedVisit.status === "pending" && (
                      <div className="scp-drawer-actions">
                        <button className="scp-d-approve" onClick={() => handleApprove(selectedVisit)}>
                          <CheckCheck size={14} /> Approve
                        </button>
                        <button className="scp-d-reject" onClick={() => handleReject(selectedVisit)}>
                          <XCircle size={14} /> Reject
                        </button>
                      </div>
                    )}
                    {["approved","checked_in"].includes(selectedVisit.status) && (
                      <button className="scp-d-noshow" onClick={() => handleNoShow(selectedVisit)}>
                        Mark no-show
                      </button>
                    )}
                    {!["completed","cancelled","rejected","no_show"].includes(selectedVisit.status) && (
                      !showReschedule ? (
                        <button className="scp-d-reschedule" onClick={() => setShowReschedule(true)}>
                          <CalendarDays size={14} /> Reschedule
                        </button>
                      ) : (
                        <div className="scp-rs-form">
                          <label className="scp-rs-lbl">New date</label>
                          <input className="scp-rs-input" type="date" min={new Date().toISOString().split("T")[0]}
                            value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} />
                          <label className="scp-rs-lbl">New time</label>
                          <input className="scp-rs-input" type="time"
                            value={rescheduleTime} onChange={e => setRescheduleTime(e.target.value)} />
                          <div className="scp-rs-row">
                            <button className="scp-rs-cancel" onClick={() => { setShowReschedule(false); setRescheduleDate(""); setRescheduleTime(""); }}>Cancel</button>
                            <button className="scp-rs-save" onClick={handleReschedule}
                              disabled={rescheduleSaving || !rescheduleDate || !rescheduleTime}>
                              {rescheduleSaving ? "Saving..." : "Confirm"}
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </>
      )}

      {/* -- Schedule visit modal -- */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="scp-modal" onClick={e => e.stopPropagation()}>
            <div className="scp-modal-hd">
              <div>
                <div className="scp-modal-title">Schedule a visit</div>
                <div className="scp-modal-sub">Visitor details — receptionist will see this immediately</div>
              </div>
              <button className="scp-modal-close" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <div className="scp-modal-body">
              <div className="scp-form-grid">
                {([
                  { key:"visitorName",    label:"Visitor name",  placeholder:"Jane Doe",          type:"text",  req:true },
                  { key:"visitorCompany", label:"Company",       placeholder:"Acme Inc.",          type:"text" },
                  { key:"visitorEmail",   label:"Email",         placeholder:"jane@acme.com",      type:"email" },
                  { key:"visitorPhone",   label:"Phone",         placeholder:"+233 00 000 0000",   type:"tel" },
                  { key:"scheduledDate",  label:"Date",          placeholder:"",                   type:"date",  req:true },
                  { key:"scheduledTime",  label:"Time",          placeholder:"",                   type:"time",  req:true },
                  { key:"endTime", label:"End time", placeholder:"", type:"time" },
                ] as any[]).map(({ key, label, placeholder, type, req }) => (
                  <div key={key} className="scp-field">
                    <label className="scp-field-lbl">{label}{req && <span className="scp-req"> *</span>}</label>
                    <input className="scp-field-input" type={type} placeholder={placeholder}
                      value={(form as any)[key]}
                      min={type === "date" ? new Date().toISOString().split("T")[0] : undefined}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                  </div>
                ))}
                <div className="scp-field">
                  <label className="scp-field-lbl">Purpose</label>
                  <select className="scp-field-input" value={form.purpose}
                    onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}>
                    <option value="">Select purpose</option>
                    {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="scp-field scp-field--full">
                  <label className="scp-field-lbl">Notes</label>
                  <textarea className="scp-field-input scp-field-textarea" rows={2}
                    placeholder="Any additional details..."
                    value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="scp-modal-ft">
              <button className="scp-cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="scp-submit-btn" onClick={handleCreate}
                disabled={formSaving || !form.visitorName.trim() || !form.scheduledDate || !form.scheduledTime}>
                {formSaving ? "Scheduling..." : "Schedule visit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -- Set break modal -- */}
      {showBreakForm && (
        <div className="modal-overlay" onClick={() => setShowBreakForm(false)}>
          <div className="scp-modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="scp-modal-hd">
              <div>
                <div className="scp-modal-title">Set a break</div>
                <div className="scp-modal-sub">Blocks this time on the booking page for today</div>
              </div>
              <button className="scp-modal-close" onClick={() => setShowBreakForm(false)}><X size={18} /></button>
            </div>
            <div className="scp-modal-body">
              <div className="scp-form-grid">
                <div className="scp-field">
                  <label className="scp-field-lbl">Start time <span className="scp-req">*</span></label>
                  <input className="scp-field-input" type="time" value={breakForm.startTime}
                    onChange={e => setBreakForm(f => ({ ...f, startTime: e.target.value }))} />
                </div>
                <div className="scp-field">
                  <label className="scp-field-lbl">End time <span className="scp-req">*</span></label>
                  <input className="scp-field-input" type="time" value={breakForm.endTime}
                    onChange={e => setBreakForm(f => ({ ...f, endTime: e.target.value }))} />
                </div>
                <div className="scp-field scp-field--full">
                  <label className="scp-field-lbl">Reason (optional)</label>
                  <input className="scp-field-input" placeholder="e.g. Lunch, Prayer, Out of office..."
                    value={breakForm.reason} onChange={e => setBreakForm(f => ({ ...f, reason: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="scp-modal-ft">
              <button className="scp-cancel-btn" onClick={() => setShowBreakForm(false)}>Cancel</button>
              <button className="scp-submit-btn" onClick={handleBlockSlot}
                disabled={breakSaving || !breakForm.startTime || !breakForm.endTime}>
                {breakSaving ? "Saving..." : "Set break"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}




