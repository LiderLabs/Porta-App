import { useState, useMemo } from "react";
import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useUser } from "@clerk/clerk-react";
import { useSearchParams } from "react-router-dom";
import { LiveCalendar } from "../../shared/LiveCalendar";

type PageTab = "checkin" | "new" | "schedule";
type StatusFilter = "ALL" | "pending" | "approved" | "checked_in" | "in_meeting" | "completed" | "rejected" | "cancelled" | "no_show";
type ListTab = "appointments" | "walkins";

const PURPOSES = ["Meeting","Interview","Delivery","Consultation","Maintenance","Training","Site visit","Other"];

const STATUS_LABEL: Record<string,string> = {
  pending:"Pending", approved:"Approved", accepted:"Approved",
  rejected:"Rejected", declined:"Rejected",
  checked_in:"Checked in", in_meeting:"In meeting",
  completed:"Completed", cancelled:"Cancelled",
  no_show:"No show", rescheduled:"Rescheduled",
};
const STATUS_COLOR: Record<string,string> = {
  pending:"badge--pending", approved:"badge--accepted", accepted:"badge--accepted",
  rejected:"badge--declined", declined:"badge--declined",
  checked_in:"badge--checked-in", in_meeting:"badge--in-meeting",
  completed:"badge--completed", cancelled:"badge--cancelled",
  no_show:"badge--no-show", rescheduled:"badge--rescheduled",
};
const TRANSITIONS: Record<string,{label:string;action:string;cls:string}[]> = {
  pending:    [{label:"Approve",   action:"approve",    cls:"action-btn--accept"},
               {label:"Reject",    action:"reject",     cls:"action-btn--decline"}],
  approved:   [{label:"Check in",  action:"check_in",   cls:"action-btn--accept"},
               {label:"No show",   action:"no_show",    cls:"action-btn--decline"},
               {label:"Cancel",    action:"cancel",     cls:"action-btn--delete"}],
  accepted:   [{label:"Check in",  action:"check_in",   cls:"action-btn--accept"},
               {label:"No show",   action:"no_show",    cls:"action-btn--decline"}],
  checked_in: [{label:"In meeting",action:"in_meeting", cls:"action-btn--accept"},
               {label:"Check out", action:"complete",   cls:"action-btn--complete"}],
  in_meeting: [{label:"Check out", action:"complete",   cls:"action-btn--complete"}],
};



function hashColor(name: string) {
  const colors = ["#3aaa45","#0087a8","#dd6b20","#7c3aed","#db2777","#059669","#d97706","#2563eb"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}


function RescheduleModal({visit,onClose,onDone}:{visit:any;onClose:()=>void;onDone:()=>void}) {
  const reschedule = useMutation(api.scheduling.reschedule);
  const [date, setDate] = useState(new Date(visit.scheduledDate).toISOString().slice(0,10));
  const [time, setTime] = useState(new Date(visit.scheduledDate).toTimeString().slice(0,5));
  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    setSaving(true);
    try { await reschedule({visitId:visit._id, scheduledDate:new Date(`${date}T${time}`).getTime()}); onDone(); }
    finally { setSaving(false); }
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{maxWidth:400}} onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Reschedule visit</span>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-form">
          <div className="form-grid">
            <div className="field-group field-group--required">
              <label className="field-label">New date</label>
              <input type="date" className="field-input" value={date} onChange={e=>setDate(e.target.value)} />
            </div>
            <div className="field-group field-group--required">
              <label className="field-label">New time</label>
              <input type="time" className="field-input" value={time} onChange={e=>setTime(e.target.value)} />
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn-primary" disabled={saving||!date||!time} onClick={handleSave}>
              {saving?"Saving...":"Reschedule"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppointmentsPage() {
  const {user} = useUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const pageTab = (searchParams.get("tab") as PageTab) ?? "checkin";
  const setPageTab = (t: PageTab) => setSearchParams({tab:t}, {replace:true});

  const [filter, setFilter]               = useState<StatusFilter>("ALL");
  const [search, setSearch]               = useState("");
  const [listTab, setListTab]             = useState<ListTab>("appointments");
  const [calView, setCalView]             = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [showReschedule, setShowReschedule] = useState(false);
  const [actioningId, setActioningId]     = useState<string|null>(null);
  const [checkingOut, setCheckingOut]     = useState<string|null>(null);
  const [message, setMessage]             = useState("");
  const [submitting, setSubmitting]       = useState(false);
  const [submitDone, setSubmitDone]       = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    visitorName:"", visitorEmail:"", visitorPhone:"", visitorCompany:"",
    purpose:"", scheduledDate:today, scheduledTime:"", hostStaffId:"", notes:"",
  });

  const visits       = useQuery(api.scheduling.list);
  const visitors     = useQuery(api.visitors.list);
  const staff        = useQuery(api.staff.list);
  const messages     = useQuery(api.messages.listByVisit,
    selectedVisit?._id && !selectedVisit?.fullName ? {visitId:selectedVisit._id} : "skip");

  const calMonth   = useMemo(()=>new Date(),[]);
  const rangeStart = useMemo(()=>new Date(calMonth.getFullYear(),calMonth.getMonth(),1).getTime(),[calMonth]);
  const rangeEnd   = useMemo(()=>new Date(calMonth.getFullYear(),calMonth.getMonth()+1,0,23,59,59,999).getTime(),[calMonth]);
  const liveCalendar = useQuery(api.scheduling.getLiveCalendar,{rangeStart,rangeEnd});

  const proposedStart = useMemo(()=>{
    if (!form.scheduledDate||!form.scheduledTime||!form.hostStaffId) return 0;
    return new Date(`${form.scheduledDate}T${form.scheduledTime}`).getTime();
  },[form.scheduledDate,form.scheduledTime,form.hostStaffId]);

  const conflictData = useQuery(api.scheduling.checkConflicts,
    proposedStart&&form.hostStaffId
      ? {hostId:form.hostStaffId as Id<"staff">, proposedStart, proposedEnd:proposedStart+60*60*1000}
      : "skip");

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

  const now = new Date();
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const todayEnd   = new Date(); todayEnd.setHours(23,59,59,999);

  const todayAppts = useMemo(()=>(visits??[])
    .filter((v:any)=>
      v.scheduledDate>=todayStart.getTime() &&
      v.scheduledDate<=todayEnd.getTime() &&
      ["pending","approved","accepted","checked_in","in_meeting"].includes(v.status))
    .sort((a:any,b:any)=>a.scheduledDate-b.scheduledDate),
  [visits]);

  const todayWalkInsIn = useMemo(()=>
    (visitors??[]).filter((v:any)=>v.status==="IN"),
  [visitors]);

  const FILTER_OPTIONS: StatusFilter[] = ["ALL","pending","approved","checked_in","in_meeting","completed","rejected","cancelled","no_show"];

  const filteredAppts = (visits??[]).filter((v:any)=>{
    const norm = v.status==="accepted"?"approved":v.status==="declined"?"rejected":v.status;
    const matchStatus = filter==="ALL"||norm===filter;
    const matchSearch = !search||
      v.visitorName.toLowerCase().includes(search.toLowerCase())||
      (v.purpose??"").toLowerCase().includes(search.toLowerCase())||
      (v.visitorEmail??"").toLowerCase().includes(search.toLowerCase());
    return matchStatus&&matchSearch;
  });

  const filteredWalkIns = (visitors??[]).filter((v:any)=>
    !search||
    v.fullName.toLowerCase().includes(search.toLowerCase())||
    (v.company??"").toLowerCase().includes(search.toLowerCase())||
    (v.purpose??"").toLowerCase().includes(search.toLowerCase())
  );

  const handleAction = async (action:string, visit:any) => {
    setActioningId(visit._id);
    try {
      switch(action) {
        case "approve":    await approve({visitId:visit._id, actorName:user?.fullName??"Receptionist"}); break;
        case "reject":     await reject({visitId:visit._id}); break;
        case "check_in":   await markCheckedIn({visitId:visit._id}); break;
        case "in_meeting": await markInMeeting({visitId:visit._id}); break;
        case "complete":   await markCompleted({visitId:visit._id}); break;
        case "no_show":    await markNoShow({visitId:visit._id}); break;
        case "cancel":     await cancel({visitId:visit._id}); break;
      }
      if (selectedVisit?._id===visit._id) {
        const next: Record<string,string> = {approve:"approved",reject:"rejected",check_in:"checked_in",in_meeting:"in_meeting",complete:"completed",no_show:"no_show",cancel:"cancelled"};
        setSelectedVisit((sv:any)=>({...sv,status:next[action]??sv.status}));
      }
    } finally { setActioningId(null); }
  };

  const handleWalkInCheckOut = async (id:string) => {
    setCheckingOut(id);
    try { await checkOutWalkIn({visitorId:id as Id<"visitors">}); }
    finally { setCheckingOut(null); }
  };

  const handleSubmit = async () => {
    if (!form.visitorName||!form.scheduledDate||!form.scheduledTime) return;
    setSubmitting(true);
    try {
      await scheduleVisit({
        visitorName:    form.visitorName,
        visitorEmail:   form.visitorEmail   ||undefined,
        visitorPhone:   form.visitorPhone   ||undefined,
        visitorCompany: form.visitorCompany ||undefined,
        purpose:        form.purpose        ||undefined,
        scheduledDate:  new Date(`${form.scheduledDate}T${form.scheduledTime}`).getTime(),
        hostStaffId:    (form.hostStaffId||undefined) as Id<"staff">|undefined,
        notes:          form.notes          ||undefined,
        source:         "admin",
      });
      setSubmitDone(true);
      setForm({visitorName:"",visitorEmail:"",visitorPhone:"",visitorCompany:"",purpose:"",scheduledDate:today,scheduledTime:"",hostStaffId:"",notes:""});
      setTimeout(()=>setSubmitDone(false), 3000);
    } finally { setSubmitting(false); }
  };

  const handleSend = async () => {
    if (!message.trim()||!selectedVisit) return;
    await sendMessage({visitId:selectedVisit._id, senderClerkId:user?.id??"", senderName:user?.fullName??"Receptionist", senderRole:"receptionist", message:message.trim()});
    setMessage("");
  };

  const TAB_NAV: {id:PageTab;label:string;desc:string;badge?:number}[] = [
    {id:"checkin",  label:"Check In",  desc:"Today's arrivals"},
    {id:"new",      label:"New Appointment", desc:"Book an appointment"},
    {id:"schedule", label:"Schedule",  desc:"All appointments", badge:(visits??[]).filter((v:any)=>v.status==="pending").length},
  ];

  const CheckInRow = ({v, isAppt}:{v:any;isAppt:boolean}) => {
    const isAwaiting = isAppt&&["pending","approved","accepted"].includes(v.status);
    const isOnsite   = isAppt?["checked_in","in_meeting"].includes(v.status):v.status==="IN";
    const apptTime   = isAppt?new Date(v.scheduledDate):new Date(v.checkInTime);
    const diffMins   = Math.round((now.getTime()-apptTime.getTime())/60000);
    const isLate     = isAwaiting&&diffMins>5;
    const name       = v.visitorName??v.fullName;
    const acting     = actioningId===v._id||checkingOut===v._id;
    return (
      <div style={{display:"flex",alignItems:"center",gap:16,background:"var(--card)",
        border:`1px solid ${isOnsite?"rgba(58,170,69,0.35)":"var(--border)"}`,
        borderRadius:12,padding:"14px 18px"}}>
        <div style={{minWidth:44,height:44,borderRadius:"50%",
          background:isOnsite?"rgba(58,170,69,0.15)":"var(--brand)",
          color:isOnsite?"var(--brand)":"#fff",
          border:isOnsite?"2px solid var(--brand)":"none",
          fontWeight:700,fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          {name[0].toUpperCase()}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:600,fontSize:14,color:"var(--ink)"}}>{name}</div>
          <div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>
            {isAppt
              ? `${v.purpose??"Visit"}${v.hostName?` \u00b7 ${v.hostName}`:""}`
              : `${v.purpose??"Walk-in"}${v.company?` \u00b7 ${v.company}`:""}`}
          </div>
        </div>
        <div style={{textAlign:"center",minWidth:64,flexShrink:0}}>
          <div style={{fontSize:16,fontWeight:700,color:isLate?"var(--red)":isOnsite?"var(--brand)":"var(--ink)"}}>
            {apptTime.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
          </div>
          <div style={{fontSize:11,color:isLate?"var(--red)":"var(--muted)",marginTop:2}}>
            {isOnsite?"checked in":isLate?`${diffMins}m late`:"appt time"}
          </div>
        </div>
        {isAwaiting&&(
          <div style={{display:"flex",gap:8,flexShrink:0}}>
            {v.status==="pending"&&(
              <button className="action-btn action-btn--accept" disabled={acting}
                onClick={()=>handleAction("approve",v)}>Approve</button>
            )}
            {["approved","accepted"].includes(v.status)&&(
              <button className="btn-primary" style={{fontSize:13,padding:"7px 18px",fontWeight:700}}
                disabled={acting} onClick={()=>handleAction("check_in",v)}>
                {acting?"...":"\u2713 Check In"}
              </button>
            )}
            <button className="action-btn action-btn--decline" disabled={acting}
              onClick={()=>handleAction("no_show",v)}>No show</button>
          </div>
        )}
        {isOnsite&&(
          <div style={{display:"flex",gap:8,flexShrink:0}}>
            {isAppt&&v.status==="checked_in"&&(
              <button className="action-btn action-btn--accept" disabled={acting}
                onClick={()=>handleAction("in_meeting",v)}>In meeting</button>
            )}
            <button className="btn-secondary" style={{fontSize:13,fontWeight:700}} disabled={acting}
              onClick={()=>isAppt?handleAction("complete",v):handleWalkInCheckOut(v._id)}>
              {acting?"...":"\u2192 Check Out"}
            </button>
            {/* <button className="action-btn action-btn--badge" onClick={()=>printBadge(v)}>\U0001f5a8<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:"4px"}}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>Badge</button> */}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="scheduling-page">
      <style>{`
        .scheduling-page { padding: 0; }
        .page-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:0; gap:16px; flex-wrap:wrap; }
        .page-title { font-size:1.4rem; font-weight:700; color:var(--text,#e6edf3); margin-bottom:4px; }
        .page-subtitle { font-size:0.85rem; color:var(--muted,#8b949e); }
        .table-card { background:var(--surface,#161b22); border:1px solid var(--border,#30363d); border-radius:12px; overflow:hidden; }
        .card-empty { padding:32px; text-align:center; color:var(--muted,#8b949e); font-size:0.875rem; }
        .visitors-table { width:100%; border-collapse:collapse; font-size:0.85rem; }
        .visitors-table th { text-align:left; padding:10px 16px; color:var(--muted,#8b949e); font-weight:600; font-size:0.75rem; text-transform:uppercase; letter-spacing:.04em; border-bottom:1px solid var(--border,#30363d); }
        .visitors-table td { padding:12px 16px; border-bottom:1px solid var(--border,#30363d); color:var(--text,#e6edf3); vertical-align:middle; }
        .visitors-table tr:last-child td { border-bottom:none; }
        .visitors-table tbody tr { cursor:pointer; transition:background .1s; }
        .visitors-table tbody tr:hover td { background:var(--hov,#2d333b); }
        .row--selected td { background:rgba(63,185,80,0.06) !important; }
        .table-name-cell { display:flex; align-items:center; gap:10px; }
        .table-name { font-weight:600; font-size:0.875rem; color:var(--text,#e6edf3); }
        .table-sub { font-size:0.75rem; color:var(--muted,#8b949e); margin-top:1px; }
        .table-muted { color:var(--muted,#8b949e); }
        .visitor-avatar { display:flex; align-items:center; justify-content:center; border-radius:50%; color:#fff; font-weight:700; }
        .visitor-avatar--sm { width:32px; height:32px; font-size:13px; }
        .visitor-avatar--scheduled { background:var(--accent,#3fb950); }
        .badge { display:inline-flex; align-items:center; padding:3px 10px; border-radius:999px; font-size:0.72rem; font-weight:700; }
        .badge--pending     { background:rgba(227,179,65,0.12);  color:#e3b341; }
        .badge--accepted    { background:rgba(88,166,255,0.12);  color:#58a6ff; }
        .badge--declined    { background:rgba(248,81,73,0.12);   color:#f85149; }
        .badge--checked-in  { background:rgba(63,185,80,0.12);   color:#3fb950; }
        .badge--in-meeting  { background:rgba(63,185,80,0.18);   color:#3fb950; }
        .badge--completed   { background:rgba(139,148,158,0.12); color:#8b949e; }
        .badge--cancelled   { background:rgba(139,148,158,0.12); color:#8b949e; }
        .badge--no-show     { background:rgba(248,81,73,0.12);   color:#f85149; }
        .badge--rescheduled { background:rgba(88,166,255,0.12);  color:#58a6ff; }
        .vp-badge { display:inline-flex; align-items:center; padding:3px 10px; border-radius:999px; font-size:0.72rem; font-weight:700; }
        .vp-badge--in  { background:rgba(63,185,80,0.12);   color:#3fb950; }
        .vp-badge--out { background:rgba(139,148,158,0.12); color:#8b949e; }
        .row-actions { display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
        .action-btn { padding:5px 11px; border-radius:6px; border:1px solid var(--border,#30363d); font-size:0.78rem; font-weight:600; cursor:pointer; font-family:inherit; background:transparent; color:var(--muted,#8b949e); transition:all .12s; white-space:nowrap; }
        .action-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .action-btn--accept   { background:rgba(63,185,80,0.12);  color:#3fb950; border-color:rgba(63,185,80,0.3); }
        .action-btn--accept:hover:not(:disabled)   { background:rgba(63,185,80,0.22); }
        .action-btn--decline  { background:rgba(248,81,73,0.1);   color:#f85149; border-color:rgba(248,81,73,0.3); }
        .action-btn--decline:hover:not(:disabled)  { background:rgba(248,81,73,0.2); }
        .action-btn--complete { background:rgba(88,166,255,0.1);  color:#58a6ff; border-color:rgba(88,166,255,0.3); }
        .action-btn--complete:hover:not(:disabled) { background:rgba(88,166,255,0.2); }
        .action-btn--delete   { background:rgba(248,81,73,0.08);  color:#f85149; border-color:rgba(248,81,73,0.2); }
        .action-btn--delete:hover:not(:disabled)   { background:rgba(248,81,73,0.18); }
        .action-btn--badge    { background:var(--hov,#2d333b); color:var(--text,#e6edf3); }
        .action-btn--badge:hover:not(:disabled)    { background:var(--surface,#21262d); }
        .action-btn--reschedule { color:var(--muted,#8b949e); }
        .action-btn--reschedule:hover { background:var(--hov,#2d333b); color:var(--text,#e6edf3); }
        .filter-tabs { display:flex; gap:4px; flex-wrap:wrap; }
        .filter-tab { padding:6px 13px; border:1px solid var(--border,#30363d); border-radius:8px; background:transparent; font-size:0.8rem; font-weight:600; color:var(--muted,#8b949e); cursor:pointer; font-family:inherit; white-space:nowrap; }
        .filter-tab:hover { background:var(--hov,#2d333b); color:var(--text,#e6edf3); }
        .filter-tab--active { background:rgba(63,185,80,0.12); color:var(--accent,#3fb950); border-color:transparent; }
        .header-search { display:flex; align-items:center; gap:8px; background:var(--surface,#161b22); border:1px solid var(--border,#30363d); border-radius:8px; padding:7px 12px; }
        .header-search-input { background:none; border:none; outline:none; font-size:0.85rem; color:var(--text,#e6edf3); font-family:inherit; width:100%; }
        .header-search-input::placeholder { color:var(--muted,#8b949e); }
        .field-group { display:flex; flex-direction:column; gap:6px; }
        .field-group--required .field-label::after { content:" *"; color:var(--accent,#3fb950); }
        .field-group--full { grid-column:1/-1; }
        .field-label { font-size:0.78rem; font-weight:600; color:var(--muted,#8b949e); }
        .field-input { background:var(--bg,#0d1117); border:1px solid var(--border,#30363d); border-radius:8px; padding:9px 12px; font-size:0.875rem; color:var(--text,#e6edf3); font-family:inherit; outline:none; width:100%; }
        .field-input:focus { border-color:var(--accent,#3fb950); }
        .field-select { appearance:none; }
        .field-textarea { min-height:80px; resize:vertical; }
        .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:16px; }
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.55); display:flex; align-items:center; justify-content:center; z-index:100; padding:24px; }
        .modal { background:var(--sidebar,#161b22); border:1px solid var(--border,#30363d); border-radius:14px; width:100%; max-width:520px; display:flex; flex-direction:column; max-height:90vh; }
        .modal-header { display:flex; align-items:center; justify-content:space-between; padding:18px 22px 14px; border-bottom:1px solid var(--border,#30363d); }
        .modal-title { font-size:0.95rem; font-weight:700; color:var(--text,#e6edf3); }
        .modal-close { background:none; border:1px solid var(--border,#30363d); cursor:pointer; color:var(--muted,#8b949e); font-size:14px; padding:3px 8px; border-radius:6px; font-family:inherit; }
        .modal-close:hover { background:var(--hov,#2d333b); color:var(--text,#e6edf3); }
        .modal-form { padding:18px 22px 22px; overflow-y:auto; }
        .modal-actions { display:flex; gap:8px; justify-content:flex-end; margin-top:16px; }
        .btn-primary { padding:9px 20px; background:var(--accent,#3fb950); color:#fff; border:none; border-radius:8px; font-size:0.875rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .btn-primary:hover:not(:disabled) { opacity:0.88; }
        .btn-primary:disabled { opacity:0.5; cursor:not-allowed; }
        .btn-secondary { padding:9px 18px; background:transparent; border:1px solid var(--border,#30363d); border-radius:8px; font-size:0.875rem; font-weight:600; color:var(--muted,#8b949e); cursor:pointer; font-family:inherit; }
        .btn-secondary:hover { background:var(--hov,#2d333b); color:var(--text,#e6edf3); }
        .btn-ghost { background:none; border:1px solid var(--border,#30363d); border-radius:6px; padding:5px 10px; font-size:14px; color:var(--muted,#8b949e); cursor:pointer; font-family:inherit; }
        .btn-ghost:hover { background:var(--hov,#2d333b); color:var(--text,#e6edf3); }
        .conflict-banner { background:rgba(227,179,65,0.1); border:1px solid rgba(227,179,65,0.3); border-radius:8px; padding:10px 14px; font-size:0.82rem; color:#e3b341; }
        /* Detail panel */
        .visitor-detail-panel { width:280px; flex-shrink:0; background:var(--surface,#161b22); border:1px solid var(--border,#30363d); border-radius:12px; display:flex; flex-direction:column; max-height:calc(100vh - 180px); overflow-y:auto; }
        .panel-header { display:flex; align-items:center; justify-content:space-between; padding:16px 18px 12px; border-bottom:1px solid var(--border,#30363d); }
        .panel-title { font-size:0.9rem; font-weight:700; color:var(--text,#e6edf3); }
        .panel-body { padding:16px 18px; display:flex; flex-direction:column; gap:10px; }
        .panel-avatar { width:52px; height:52px; border-radius:50%; background:var(--accent,#3fb950); color:#fff; font-weight:700; font-size:20px; display:flex; align-items:center; justify-content:center; margin:0 auto 6px; }
        .panel-name { font-weight:700; font-size:1rem; color:var(--text,#e6edf3); text-align:center; }
        .panel-fields { display:flex; flex-direction:column; gap:8px; }
        .panel-field { display:flex; flex-direction:column; gap:2px; }
        .panel-field-label { font-size:0.7rem; font-weight:600; text-transform:uppercase; letter-spacing:.05em; color:var(--muted,#8b949e); }
        .panel-field-value { font-size:0.82rem; color:var(--text,#e6edf3); word-break:break-word; }
        /* Messages */
        .message-thread { border-top:1px solid var(--border,#30363d); padding-top:12px; margin-top:4px; }
        .message-thread-title { font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--muted,#8b949e); margin-bottom:8px; }
        .message-list { display:flex; flex-direction:column; gap:6px; max-height:150px; overflow-y:auto; margin-bottom:8px; }
        .message-bubble { display:flex; flex-direction:column; padding:7px 10px; border-radius:10px; font-size:0.8rem; max-width:85%; }
        .message-bubble--self  { background:var(--accent,#3fb950); color:#fff; border-bottom-right-radius:3px; align-self:flex-end; }
        .message-bubble--other { background:var(--hov,#2d333b); color:var(--text,#e6edf3); border-bottom-left-radius:3px; align-self:flex-start; }
        .message-sender { font-size:0.68rem; font-weight:700; opacity:0.75; margin-bottom:2px; }
        .message-text { line-height:1.4; }
        .message-time { font-size:0.65rem; opacity:0.6; margin-top:3px; align-self:flex-end; }
        .message-input-row { display:flex; gap:6px; }
        .btn-primary--sm { padding:6px 12px; font-size:0.8rem; }
        /* Calendar */
        .calendar-card { background:var(--surface,#161b22); border:1px solid var(--border,#30363d); border-radius:12px; padding:20px; position:relative; }
        .calendar-nav { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
        .calendar-month { font-weight:700; font-size:0.95rem; color:var(--text,#e6edf3); }
        .calendar-live-badge { position:absolute; top:20px; right:20px; font-size:0.7rem; font-weight:700; color:var(--accent,#3fb950); }
        .calendar-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:1px; }
        .calendar-day-header { text-align:center; font-size:0.7rem; font-weight:600; color:var(--muted,#8b949e); padding:4px 0 8px; text-transform:uppercase; }
        .calendar-cell { min-height:72px; border:1px solid var(--border,#30363d); border-radius:6px; padding:4px 6px; background:var(--bg,#0d1117); }
        .calendar-cell--today { border-color:var(--accent,#3fb950); background:rgba(63,185,80,0.04); }
        .calendar-day-num { font-size:0.75rem; font-weight:600; color:var(--muted,#8b949e); display:block; margin-bottom:3px; }
        .calendar-cell--today .calendar-day-num { color:var(--accent,#3fb950); }
        .calendar-events { display:flex; flex-direction:column; gap:2px; }
        .calendar-event { font-size:0.65rem; font-weight:600; padding:1px 5px; border-radius:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .calendar-event--blocked    { background:rgba(248,81,73,0.15); color:#f85149; }
        .calendar-event--pending    { background:rgba(227,179,65,0.15); color:#e3b341; }
        .calendar-event--approved   { background:rgba(88,166,255,0.15); color:#58a6ff; }
        .calendar-event--accepted   { background:rgba(88,166,255,0.15); color:#58a6ff; }
        .calendar-event--checked_in { background:rgba(63,185,80,0.15); color:#3fb950; }
        .calendar-event--in_meeting { background:rgba(63,185,80,0.2); color:#3fb950; }
        .calendar-event--completed  { background:rgba(139,148,158,0.12); color:#8b949e; }
        .calendar-more { font-size:0.62rem; color:var(--muted,#8b949e); padding:0 4px; }
        /* card used in check-in tab */
        .card { background:var(--surface,#161b22); }
      `}</style>

      <div className="page-header" style={{marginBottom:0}}>
        <div>
          <h1 className="page-title">Appointments</h1>
          <p className="page-subtitle">
            {todayAppts.filter((v:any)=>["pending","approved","accepted"].includes(v.status)).length} awaiting &middot;{" "}
            {todayAppts.filter((v:any)=>["checked_in","in_meeting"].includes(v.status)).length+todayWalkInsIn.length} on premises
          </p>
        </div>
      </div>

      <div style={{display:"flex",gap:2,borderBottom:"1px solid var(--border,#30363d)",marginBottom:24,marginTop:16}}>
        {TAB_NAV.map(t=>(
          <button key={t.id} onClick={()=>setPageTab(t.id)}
            style={{
              padding:"10px 20px", border:"none", cursor:"pointer",
              background:"transparent", fontWeight:600, fontSize:14,
              color:pageTab===t.id?"var(--accent,#3fb950)":"var(--muted,#8b949e)",
              borderBottom:pageTab===t.id?"2px solid var(--accent,#3fb950)":"2px solid transparent",
              marginBottom:-1, transition:"color .15s", fontFamily:"inherit",
            }}>
            {t.label}
            {(t.badge??0)>0?<span style={{marginLeft:5,background:"#e3b341",color:"#000",fontSize:10,fontWeight:700,padding:"1px 5px",borderRadius:20,minWidth:16,textAlign:"center",display:"inline-block",lineHeight:"16px"}}>{t.badge}</span>:null}
          </button>
        ))}
      </div>

      {pageTab==="checkin"&&(
        <div style={{display:"flex",flexDirection:"column",gap:36}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"var(--muted,#8b949e)",marginBottom:12}}>Today &mdash; Check In</div>
            {todayAppts.length===0&&todayWalkInsIn.length===0?(
              <div className="card-empty" style={{padding:32,textAlign:"center",background:"var(--surface,#161b22)",border:"1px solid var(--border,#30363d)",borderRadius:12}}>
                <div style={{fontSize:28,marginBottom:8}}>&#x1F44B;</div>
                <div style={{fontWeight:600,color:"var(--text,#e6edf3)"}}>No visitors today yet</div>
                <div style={{color:"var(--muted,#8b949e)",fontSize:13,marginTop:4}}>Scheduled appointments will appear here when they arrive.</div>
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:20}}>
                {todayAppts.filter((v:any)=>["pending","approved","accepted"].includes(v.status)).length>0&&(
                  <div>
                    <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"var(--muted,#8b949e)",marginBottom:8}}>Awaiting arrival &mdash; {todayAppts.filter((v:any)=>["pending","approved","accepted"].includes(v.status)).length}</div>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {todayAppts.filter((v:any)=>["pending","approved","accepted"].includes(v.status)).map((v:any)=>(
                        <CheckInRow key={v._id} v={v} isAppt={true}/>
                      ))}
                    </div>
                  </div>
                )}
                {(todayAppts.filter((v:any)=>["checked_in","in_meeting"].includes(v.status)).length>0||todayWalkInsIn.length>0)&&(
                  <div>
                    <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"var(--muted,#8b949e)",marginBottom:8}}>On premises &mdash; {todayAppts.filter((v:any)=>["checked_in","in_meeting"].includes(v.status)).length+todayWalkInsIn.length}</div>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {todayAppts.filter((v:any)=>["checked_in","in_meeting"].includes(v.status)).map((v:any)=>(
                        <CheckInRow key={v._id} v={v} isAppt={true}/>
                      ))}
                      {todayWalkInsIn.map((v:any)=>(
                        <CheckInRow key={v._id} v={v} isAppt={false}/>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"var(--muted,#8b949e)",marginBottom:12}}>All Appointments</div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,flexWrap:"wrap"}}>
              <div className="filter-tabs">
                {FILTER_OPTIONS.map(f=>{
                  const cnt = f==="ALL"?(visits?.length??0):(visits??[]).filter((v:any)=>v.status===f||(f==="approved"&&v.status==="accepted")).length;
                  const urgent = f==="pending"&&cnt>0;
                  return (
                    <button key={f} className={`filter-tab${filter===f?" filter-tab--active":""}`} onClick={()=>setFilter(f)} style={{display:"flex",alignItems:"center",gap:5}}>
                      {f==="ALL"?"All":STATUS_LABEL[f]??f}
                      {cnt>0?<span style={{fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:20,minWidth:16,textAlign:"center",display:"inline-block",background:urgent?"#e3b341":filter===f?"rgba(63,185,80,0.2)":"var(--hov,#2d333b)",color:urgent?"#000":filter===f?"var(--accent,#3fb950)":"var(--muted,#8b949e)"}}>{cnt}</span>:null}
                    </button>
                  );
                })}
              </div>
              <div className="header-search" style={{width:220,marginLeft:"auto"}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input className="header-search-input" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} />
              </div>
            </div>
            <div className="table-card">
              {visits===undefined?(<div className="card-empty">Loading...</div>)
              :filteredAppts.length===0?(<div className="card-empty">No appointments found.</div>):(
                <table className="visitors-table">
                  <thead><tr><th>Visitor</th><th>Purpose</th><th>Scheduled</th><th>Host</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {filteredAppts.map((v:any)=>{
                      const actions = TRANSITIONS[v.status]??[];
                      return (
                        <tr key={v._id} onClick={()=>setSelectedVisit(v)} style={{cursor:"pointer"}} className={selectedVisit?._id===v._id?"row--selected":""}>
                          <td>
                            <div className="table-name-cell">
                              <div className="visitor-avatar visitor-avatar--scheduled visitor-avatar--sm">{v.visitorName[0].toUpperCase()}</div>
                              <div>
                                <div className="table-name">{v.visitorName}</div>
                                {v.visitorEmail&&<div className="table-sub">{v.visitorEmail}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="table-muted">{v.purpose??"\u2014"}</td>
                          <td className="table-muted">{new Date(v.scheduledDate).toLocaleDateString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</td>
                          <td className="table-muted">{v.hostName??"\u2014"}</td>
                          <td><span className={`badge ${STATUS_COLOR[v.status]??""}`}>{STATUS_LABEL[v.status]??v.status}</span></td>
                          <td onClick={e=>e.stopPropagation()}>
                            <div className="row-actions">
                              {actions.map(a=>(<button key={a.action} className={`action-btn ${a.cls}`} onClick={()=>handleAction(a.action,v)}>{a.label}</button>))}
                              {["pending","approved","accepted"].includes(v.status)?<button className="action-btn action-btn--reschedule" onClick={()=>{setSelectedVisit(v);setShowReschedule(true);}}>&#x21BB; Reschedule</button>:null}
                              <button className="action-btn action-btn--delete" onClick={()=>deleteVisit({visitId:v._id})}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"var(--muted,#8b949e)",marginBottom:12}}>Schedule Calendar</div>
            <LiveCalendar
              visits={liveCalendar?.visits??(visits??[])}
              blockedSlots={liveCalendar?.blockedSlots??[]}
              onSelectVisit={setSelectedVisit}
            />
          </div>
        </div>
      )}
      {pageTab==="new"&&(
        <div style={{maxWidth:640}}>
          <div className="table-card" style={{padding:28}}>
            <div style={{marginBottom:20}}>
              <div style={{fontWeight:700,fontSize:16,color:"var(--text,#e6edf3)"}}>Book a visit</div>
              <div style={{fontSize:13,color:"var(--muted,#8b949e)",marginTop:2}}>Schedule a new appointment or register a walk-in visitor.</div>
            </div>
            {conflictData?.hasConflict&&(
              <div className="conflict-banner" style={{marginBottom:16}}>
                &#x26A0;&#xFE0F; Conflict detected for this host at this time.
                {conflictData.blockedConflicts.length>0&&<span> Host is blocked ({conflictData.blockedConflicts[0].reason??"blocked"}).</span>}
                {conflictData.visitConflicts.length>0&&<span> Another visit exists ({conflictData.visitConflicts[0].visitorName}).</span>}
              </div>
            )}
            {submitDone&&(
              <div style={{background:"rgba(63,185,80,0.12)",border:"1px solid rgba(63,185,80,0.3)",borderRadius:8,padding:"10px 14px",marginBottom:16,color:"var(--accent,#3fb950)",fontWeight:600,fontSize:13}}>
                &#x2713; Visit booked successfully!
              </div>
            )}
            <div className="form-grid">
              {([
                {key:"visitorName",    label:"Visitor name", req:true},
                {key:"visitorEmail",   label:"Email",        req:false},
                {key:"visitorPhone",   label:"Phone",        req:false},
                {key:"visitorCompany", label:"Company",      req:false},
              ] as {key:keyof typeof form;label:string;req:boolean}[]).map(({key,label,req})=>(
                <div key={key} className={`field-group${req?" field-group--required":""}`}>
                  <label className="field-label">{label}</label>
                  <input className="field-input" value={form[key] as string}
                    onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} />
                </div>
              ))}
              <div className="field-group">
                <label className="field-label">Purpose</label>
                <select className="field-input field-select" value={form.purpose}
                  onChange={e=>setForm(f=>({...f,purpose:e.target.value}))}>
                  <option value="">Select purpose...</option>
                  {PURPOSES.map(p=><option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="field-group">
                <label className="field-label">Host</label>
                <select className="field-input field-select" value={form.hostStaffId}
                  onChange={e=>setForm(f=>({...f,hostStaffId:e.target.value}))}>
                  <option value="">Select host...</option>
                  {staff?.map((s:any)=>(
                    <option key={s._id} value={s._id}>
                      {s.name}{s.department?` \u2014 ${s.department}`:""}{s.availability&&s.availability!=="available"?` (${s.availability})`:""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-group field-group--required">
                <label className="field-label">Date</label>
                <input type="date" className="field-input" value={form.scheduledDate} min={today}
                  onChange={e=>setForm(f=>({...f,scheduledDate:e.target.value}))} />
              </div>
              <div className="field-group field-group--required">
                <label className="field-label">Time</label>
                <input type="time" className="field-input" value={form.scheduledTime}
                  onChange={e=>setForm(f=>({...f,scheduledTime:e.target.value}))} />
              </div>
              <div className="field-group field-group--full">
                <label className="field-label">Notes</label>
                <textarea className="field-input field-textarea" value={form.notes}
                  onChange={e=>setForm(f=>({...f,notes:e.target.value}))} />
              </div>
            </div>
            <div style={{display:"flex",gap:8,marginTop:8}}>
              <button className="btn-primary" style={{flex:1}}
                disabled={submitting||!form.visitorName||!form.scheduledDate||!form.scheduledTime}
                onClick={handleSubmit}>
                {submitting?"Saving...":"Schedule visit"}
              </button>
            </div>
          </div>
        </div>
      )}

      
      {pageTab==="schedule"&&(
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,flexWrap:"wrap"}}>
            <div className="filter-tabs">
              <button className={`filter-tab${listTab==="appointments"?" filter-tab--active":""}`} onClick={()=>setListTab("appointments")}>
                Appointments <span style={{fontSize:11,marginLeft:4,opacity:.7}}>{visits?.length??0}</span>
              </button>
              <button className={`filter-tab${listTab==="walkins"?" filter-tab--active":""}`} onClick={()=>setListTab("walkins")}>
                Walk-ins <span style={{fontSize:11,marginLeft:4,opacity:.7}}>{visitors?.length??0}</span>
              </button>
            </div>
            <div className="filter-tabs" style={{marginLeft:"auto"}}>
              <button className={`filter-tab${!calView?" filter-tab--active":""}`} onClick={()=>setCalView(false)}>List</button>
              <button className={`filter-tab${calView?" filter-tab--active":""}`} onClick={()=>setCalView(true)}>Calendar</button>
            </div>
            <div className="header-search" style={{width:220}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input className="header-search-input" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} />
            </div>
          </div>

          {calView?(
            <LiveCalendar
              visits={liveCalendar?.visits??(visits??[])}
              blockedSlots={liveCalendar?.blockedSlots??[]}
              onSelectVisit={setSelectedVisit}
            />
          ):(
            <div style={{display:"flex",gap:16}}>
              <div style={{flex:1,minWidth:0}}>
                {listTab==="appointments"&&(
                  <div className="filter-tabs" style={{flexWrap:"wrap",marginBottom:12}}>
                    {FILTER_OPTIONS.map(f=>(
                      <button key={f} className={`filter-tab${filter===f?" filter-tab--active":""}`} onClick={()=>setFilter(f)}>
                        {f==="ALL"?"All":STATUS_LABEL[f]??f}
                      </button>
                    ))}
                  </div>
                )}
                {listTab==="appointments"&&(
                  <div className="table-card">
                    {visits===undefined?(<div className="card-empty">Loading...</div>)
                    :filteredAppts.length===0?(<div className="card-empty">No appointments found.</div>):(
                      <table className="visitors-table">
                        <thead><tr>
                          <th>Visitor</th><th>Purpose</th><th>Scheduled</th><th>Host</th><th>Status</th><th>Actions</th>
                        </tr></thead>
                        <tbody>
                          {filteredAppts.map((v:any)=>{
                            const actions = TRANSITIONS[v.status]??[];
                            return (
                              <tr key={v._id} onClick={()=>setSelectedVisit(v)} style={{cursor:"pointer"}}
                                className={selectedVisit?._id===v._id?"row--selected":""}>
                                <td>
                                  <div className="table-name-cell">
                                    <div className="visitor-avatar visitor-avatar--scheduled visitor-avatar--sm">
                                      {v.visitorName[0].toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="table-name">{v.visitorName}</div>
                                      {v.visitorEmail&&<div className="table-sub">{v.visitorEmail}</div>}
                                    </div>
                                  </div>
                                </td>
                                <td className="table-muted">{v.purpose??"\u2014"}</td>
                                <td className="table-muted">
                                  {new Date(v.scheduledDate).toLocaleDateString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}
                                </td>
                                <td className="table-muted">{v.hostName??"\u2014"}</td>
                                <td><span className={`badge ${STATUS_COLOR[v.status]??""}`}>{STATUS_LABEL[v.status]??v.status}</span></td>
                                <td onClick={e=>e.stopPropagation()}>
                                  <div className="row-actions">
                                    {actions.map(a=>(
                                      <button key={a.action} className={`action-btn ${a.cls}`}
                                        onClick={()=>handleAction(a.action,v)}>{a.label}</button>
                                    ))}
                                    
                                    {["pending","approved","accepted"].includes(v.status)&&(
                                      <button className="action-btn action-btn--reschedule"
                                        onClick={()=>{setSelectedVisit(v);setShowReschedule(true);}}>↻ Reschedule</button>
                                    )}
                                    <button className="action-btn action-btn--delete" onClick={()=>deleteVisit({visitId:v._id})}>Delete</button>
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
                {listTab==="walkins"&&(
                  <div className="table-card">
                    {visitors===undefined?(<div className="card-empty">Loading...</div>)
                    :filteredWalkIns.length===0?(<div className="card-empty">No walk-ins found.</div>):(
                      <table className="visitors-table">
                        <thead><tr>
                          <th>Visitor</th><th>Company</th><th>Purpose</th><th>Time in</th><th>Status</th><th></th>
                        </tr></thead>
                        <tbody>
                          {filteredWalkIns.map((v:any)=>(
                            <tr key={v._id}>
                              <td>
                                <div className="table-name-cell">
                                  <div className="visitor-avatar visitor-avatar--sm" style={{background:hashColor(v.fullName)}}>
                                    {v.fullName[0].toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="table-name">{v.fullName}</div>
                                    {v.email&&<div className="table-sub">{v.email}</div>}
                                  </div>
                                </div>
                              </td>
                              <td className="table-muted">{v.company??"\u2014"}</td>
                              <td className="table-muted">{v.purpose??"\u2014"}</td>
                              <td className="table-muted">
                                {new Date(v.checkInTime).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
                              </td>
                              <td><span className={`vp-badge vp-badge--${v.status==="IN"?"in":"out"}`}>{v.status}</span></td>
                              <td>
                                <div className="row-actions">
                                  {v.status==="IN"&&(
                                    <button className="action-btn action-btn--complete"
                                      disabled={checkingOut===v._id}
                                      onClick={()=>handleWalkInCheckOut(v._id)}>
                                      {checkingOut===v._id?"...":"Check out"}
                                    </button>
                                  )}
                                  {/* <button className="action-btn action-btn--badge" onClick={()=>printBadge(v)}>🖨 Badge</button> */}
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
            </div>
          )}
        </div>
      )}

      {selectedVisit&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setSelectedVisit(null)}>
          <div style={{background:"var(--surface,#161b22)",border:"1px solid var(--border,#30363d)",borderRadius:14,width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto",padding:28}} onClick={e=>e.stopPropagation()}>
            <div className="panel-header">
              <h3 className="panel-title">Visit details</h3>
              <button className="modal-close" onClick={()=>setSelectedVisit(null)}>&times;</button>
            </div>
            <div className="panel-body">
              <div className="panel-avatar">{(selectedVisit.visitorName??selectedVisit.fullName??"V")[0].toUpperCase()}</div>
              <div className="panel-name">{selectedVisit.visitorName??selectedVisit.fullName??"Visitor"}</div>
              <span className={`badge ${STATUS_COLOR[selectedVisit.status]??""}`}
                style={{margin:"6px auto 0",display:"block",width:"fit-content"}}>
                {STATUS_LABEL[selectedVisit.status]??selectedVisit.status}
              </span>
              {(TRANSITIONS[selectedVisit.status]??[]).length>0&&(
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}>
                  {(TRANSITIONS[selectedVisit.status]??[]).map(a=>(
                    <button key={a.action} className={`action-btn ${a.cls}`} style={{flex:1}}
                      onClick={()=>handleAction(a.action,selectedVisit)}>{a.label}</button>
                  ))}
                </div>
              )}
              
              {["pending","approved","accepted"].includes(selectedVisit.status)&&(
                <button className="action-btn action-btn--reschedule"
                  style={{width:"100%",marginTop:8,justifyContent:"center"}}
                  onClick={()=>setShowReschedule(true)}>
                  ↻ Reschedule
                </button>
              )}
              <div className="panel-fields" style={{marginTop:16}}>
                {[
                  {label:"Date & time", value:new Date(selectedVisit.scheduledDate).toLocaleString()},
                  {label:"Purpose",     value:selectedVisit.purpose},
                  {label:"Host",        value:selectedVisit.hostName},
                  {label:"Company",     value:selectedVisit.visitorCompany},
                  {label:"Email",       value:selectedVisit.visitorEmail},
                  {label:"Phone",       value:selectedVisit.visitorPhone},
                  {label:"Notes",       value:selectedVisit.notes},
                  {label:"Approved by", value:selectedVisit.approvedBy},
                ].map(({label,value})=>value?(
                  <div key={label} className="panel-field">
                    <span className="panel-field-label">{label}</span>
                    <span className="panel-field-value">{value}</span>
                  </div>
                ):null)}
              </div>
              <div className="message-thread">
                <div className="message-thread-title">Messages with staff</div>
                <div className="message-list">
                  {messages===undefined?(<div className="card-empty" style={{padding:"12px 0"}}>Loading...</div>)
                  :messages.length===0?(<div className="card-empty" style={{padding:"12px 0",fontSize:12}}>No messages yet.</div>)
                  :messages.map((m:any)=>(
                    <div key={m._id} className={`message-bubble message-bubble--${m.senderRole==="receptionist"?"self":"other"}`}>
                      <span className="message-sender">{m.senderName}</span>
                      <span className="message-text">{m.message}</span>
                      <span className="message-time">{new Date(m.createdAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
                    </div>
                  ))}
                </div>
                <div className="message-input-row">
                  <input className="field-input" placeholder="Message staff..." value={message}
                    onChange={e=>setMessage(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSend();}}} />
                  <button className="btn-primary btn-primary--sm" onClick={handleSend} disabled={!message.trim()}>Send</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReschedule&&selectedVisit&&(
        <RescheduleModal visit={selectedVisit} onClose={()=>setShowReschedule(false)} onDone={()=>setShowReschedule(false)} />
      )}
    </div>
  );
}





