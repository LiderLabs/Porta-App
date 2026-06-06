// @ts-nocheck
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useUser } from "@clerk/clerk-react";
import { useState, useMemo } from "react";
import { CheckCheck, X, CalendarDays, List } from "lucide-react";
import { LiveCalendar } from "../../shared/LiveCalendar";
import { NotifyModal, NotifyTemplate, NotifyData } from "../../shared/NotifyModal";

const STATUS_COLORS: Record<string,string> = {
  pending:"#e3b341", approved:"#58a6ff", accepted:"#58a6ff",
  checked_in:"#3fb950", in_meeting:"#a78bfa",
  completed:"#6b7280", cancelled:"#6b7280",
  rejected:"#f85149", declined:"#f85149", no_show:"#f85149",
};
const STATUS_LABEL: Record<string,string> = {
  pending:"Pending", approved:"Approved", accepted:"Approved",
  checked_in:"Checked in", in_meeting:"In meeting",
  completed:"Completed", cancelled:"Cancelled",
  rejected:"Rejected", declined:"Rejected", no_show:"No show",
};

export function PAAppointmentsPage() {
  const { user } = useUser();
  const myOrg = useQuery(api.orgSettings.getMyOrg);
  const orgName = myOrg?.name ?? "our office";
  const [filter, setFilter]       = useState<string>("pending");
  const [calView, setCalView]     = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [formSaving, setFormSaving] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const today = new Date().toISOString().split("T")[0];
const [form, setForm] = useState({ visitorName:"", visitorEmail:"", visitorPhone:"", visitorCompany:"", purpose:"", scheduledDate:today, scheduledTime:"09:00", endTime:"", notes:"", hostStaffId:"", roomId:"" });
  const setF = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const [notifyModal, setNotifyModal] = useState<{ template: NotifyTemplate; data: NotifyData; target: "visitor"|"host"; title: string } | null>(null);
  const [notifyHostId, setNotifyHostId] = useState<string>("");

  const handleCreate = async () => {
    if (!form.visitorName || !form.scheduledDate || !form.scheduledTime) return;
    setFormSaving(true);
    try {
      const dt = new Date(`${form.scheduledDate}T${form.scheduledTime}`).getTime();
      const dur = form.endTime ? (() => { const e = new Date(`${form.scheduledDate}T${form.endTime}`).getTime(); return e > dt ? Math.round((e-dt)/60000) : undefined; })() : undefined;
await createVisit({ visitorName:form.visitorName, visitorEmail:form.visitorEmail||undefined, visitorPhone:form.visitorPhone||undefined, visitorCompany:form.visitorCompany||undefined, purpose:form.purpose||undefined, scheduledDate:dt, duration:dur, notes:form.notes||undefined, hostStaffId:(form.hostStaffId||undefined) as any, roomId:(form.roomId||undefined) as any });
      setShowForm(false);
      setForm({ visitorName:"", visitorEmail:"", visitorPhone:"", visitorCompany:"", purpose:"", scheduledDate:today, scheduledTime:"09:00", endTime:"", notes:"", hostStaffId:"", roomId:"" });
    } finally { setFormSaving(false); }
  };

  const myStaffRecord = useQuery(api.staff.getByClerkId, user?.id ? { clerkUserId: user.id } : "skip");
  const assignedStaff = useQuery(api.paAssignments.getStaffForPA, myStaffRecord?._id ? { paStaffId: myStaffRecord._id } : "skip");
  const allVisits     = useQuery(api.scheduling.list);
  const allStaff      = useQuery(api.staff.list);
  const createVisit   = useMutation(api.scheduling.createByPA);
  const approveVisit  = useMutation(api.scheduling.approve);
const rooms         = useQuery(api.rooms.listActive);
  const rejectVisit   = useMutation(api.scheduling.reject);

  const assignedIds = new Set((assignedStaff ?? []).map((s:any) => s._id));

  const allAssignedVisits = useMemo(()=>
    (allVisits??[]).filter((v:any)=>v.hostId&&assignedIds.has(v.hostId)),
  [allVisits, assignedIds]);

  const visits = allAssignedVisits
    .filter((v:any)=>filter==="all"||v.status===filter)
    .sort((a:any,b:any)=>b._creationTime-a._creationTime);

  const getStaffName = (id:string) => allStaff?.find((s:any)=>s._id===id)?.name??"Unknown";

  const tabs = [
    { key:"pending",  label:"Pending",  count:allAssignedVisits.filter((v:any)=>v.status==="pending").length },
    { key:"approved", label:"Approved", count:allAssignedVisits.filter((v:any)=>["approved","accepted"].includes(v.status)).length },
    { key:"all",      label:"All",      count:allAssignedVisits.length },
  ];

  return (<>
    <style>{`
      .pa-page{font-family:'DM Sans',sans-serif;color:var(--text)}
      .pa-hdr{margin-bottom:20px;display:flex;align-items:flex-start;justify-content:space-between;gap:12;flex-wrap:wrap}
      .pa-new-btn{padding:9px 18px;background:var(--accent,#3fb950);color:#fff;border:none;border-radius:9px;font-weight:700;font-size:0.85rem;cursor:pointer;font-family:inherit;flex-shrink:0}
      .pa-tabs{display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;align-items:center}
      .pa-tab{padding:7px 16px;border-radius:8px;border:1px solid;font-weight:600;font-size:0.82rem;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px}
      .pa-view-tabs{display:flex;gap:4px;margin-left:auto}
      .pa-view-tab{display:flex;align-items:center;gap:5px;padding:6px 12px;border:1px solid var(--border,#30363d);border-radius:8px;background:none;color:var(--muted,#8b949e);font-size:0.78rem;font-weight:600;cursor:pointer;font-family:inherit}
      .pa-view-tab--on{background:rgba(63,185,80,0.1);color:var(--accent,#3fb950);border-color:rgba(63,185,80,0.3)}
      .pa-card{background:var(--sidebar,#161b22);border:1px solid var(--border,#30363d);border-radius:12px;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;gap:16px}
      .pa-empty{text-align:center;padding:40px 0;color:var(--muted,#8b949e);font-size:0.9rem}
      /* detail modal */
      .pa-modal-bg{position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px}
      .pa-modal{background:var(--surface,#161b22);border:1px solid var(--border,#30363d);border-radius:14px;width:100%;max-width:420px;max-height:90vh;overflow-y:auto;padding:24px}
      .pa-modal-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
      .pa-avatar{width:52px;height:52px;border-radius:50%;background:var(--accent,#3fb950);color:#fff;font-weight:700;font-size:20px;display:flex;align-items:center;justify-content:center;margin:0 auto 8px}
      .pa-vname{font-weight:700;font-size:1rem;text-align:center;color:var(--text)}
      .pa-fields{display:flex;flex-direction:column;gap:8px;margin-top:14px}
      .pa-field-lbl{font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}
      .pa-field-val{font-size:0.82rem;color:var(--text)}
      .pa-action-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
      .pa-approve-btn{flex:1;display:flex;align-items:center;justify-content:center;gap:5px;padding:8px 14px;border-radius:8px;border:1px solid rgba(63,185,80,0.4);background:rgba(63,185,80,0.1);color:#3fb950;font-weight:600;font-size:0.82rem;cursor:pointer;font-family:inherit}
      .pa-reject-btn{flex:1;display:flex;align-items:center;justify-content:center;gap:5px;padding:8px 14px;border-radius:8px;border:1px solid rgba(248,81,73,0.4);background:rgba(248,81,73,0.1);color:#f85149;font-weight:600;font-size:0.82rem;cursor:pointer;font-family:inherit}
      @media(max-width:600px){.pa-card{flex-direction:column;align-items:flex-start}}
    `}</style>
    <div className="pa-page">
      <div className="pa-hdr">
        <div>
          <h1 style={{fontSize:"1.4rem",fontWeight:700,letterSpacing:"-0.02em",margin:0}}>Appointments</h1>
          <p style={{color:"var(--muted)",fontSize:"0.85rem",marginTop:3,margin:0}}>
            Managing {assignedStaff?.length??0} staff member{assignedStaff?.length!==1?"s":""}
          </p>
          <div style={{marginTop:16,borderTop:"1px solid var(--border,#30363d)",paddingTop:14}}>
            <div style={{fontSize:"0.72rem",fontWeight:600,textTransform:"uppercase",letterSpacing:".05em",color:"var(--muted)",marginBottom:8}}>Notify a host</div>
            <select value={notifyHostId} onChange={e=>setNotifyHostId(e.target.value)}
              style={{width:"100%",padding:"8px 12px",background:"var(--bg,#0d1117)",border:"1px solid var(--border,#30363d)",borderRadius:8,fontSize:"0.85rem",fontFamily:"inherit",color:"var(--text)",marginBottom:8}}>
              <option value="">Select host to notify...</option>
              {(assignedStaff??[]).map((s:any)=><option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
            {notifyHostId&&(
              <button onClick={()=>{const h=(assignedStaff??[]).find((s:any)=>s._id===notifyHostId);if(!h)return;setNotifyModal({template:"visitor_arrived",target:"host",title:`Notify ${h.name}`,data:{visitorName:selectedVisit.visitorName,visitorPhone:selectedVisit.visitorPhone,hostName:h.name,hostPhone:h.phone,scheduledDate:selectedVisit.scheduledDate,purpose:selectedVisit.purpose,orgName:orgName}});}}
                style={{width:"100%",padding:"8px",borderRadius:8,border:"1px solid rgba(37,211,102,0.3)",background:"rgba(37,211,102,0.1)",color:"#25d366",fontWeight:600,fontSize:"0.82rem",cursor:"pointer",fontFamily:"inherit"}}>
                💬 Notify {(assignedStaff??[]).find((s:any)=>s._id===notifyHostId)?.name??""} (WhatsApp / Email / In-app)
              </button>
            )}
          </div>
        </div>
        <button className="pa-new-btn" onClick={()=>setShowForm(true)}>+ New Appointment</button>
      </div>

      <div className="pa-tabs">
        {tabs.map(t=>(
          <button key={t.key} className="pa-tab" onClick={()=>setFilter(t.key)} style={{
            borderColor:filter===t.key?"var(--accent)":"var(--border)",
            background:filter===t.key?"rgba(63,185,80,0.1)":"transparent",
            color:filter===t.key?"var(--accent)":"var(--muted)",
          }}>
            {t.label}
            {t.count>0&&<span style={{background:"var(--accent)",color:"#fff",fontSize:"0.65rem",fontWeight:700,padding:"1px 6px",borderRadius:20}}>{t.count}</span>}
          </button>
        ))}
        <div className="pa-view-tabs">
          <button className={`pa-view-tab${!calView?" pa-view-tab--on":""}`} onClick={()=>setCalView(false)}>
            <List size={13}/> List
          </button>
          <button className={`pa-view-tab${calView?" pa-view-tab--on":""}`} onClick={()=>setCalView(true)}>
            <CalendarDays size={13}/> Calendar
          </button>
        </div>
      </div>

      {calView ? (
        <LiveCalendar
          visits={allAssignedVisits}
          onSelectVisit={setSelectedVisit}
        />
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {visits.length===0?(
            <div className="pa-empty">No {filter==="all"?"":filter} appointments found.</div>
          ):visits.map((v:any)=>(
            <div key={v._id} className="pa-card" onClick={()=>setSelectedVisit(v)} style={{cursor:"pointer"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:5,flexWrap:"wrap"}}>
                  <span style={{fontWeight:700,fontSize:"0.95rem"}}>{v.visitorName}</span>
                  <span style={{fontSize:"0.7rem",fontWeight:700,padding:"2px 8px",borderRadius:20,
                    background:`${STATUS_COLORS[v.status]??"#6b7280"}20`,color:STATUS_COLORS[v.status]??"#6b7280"}}>
                    {STATUS_LABEL[v.status]??v.status}
                  </span>
                </div>
                <div style={{fontSize:"0.78rem",color:"var(--muted)",display:"flex",flexWrap:"wrap",gap:"4px 14px"}}>
                  <span>For <strong style={{color:"var(--text)"}}>{getStaffName(v.hostId)}</strong></span>
                  {v.purpose&&<span>{v.purpose}</span>}
                  <span>{new Date(v.scheduledDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})} · {new Date(v.scheduledDate).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}</span>
                </div>
              </div>
              {v.status==="pending"&&(
                <div style={{display:"flex",gap:8,flexShrink:0}} onClick={e=>e.stopPropagation()}>
                  <button onClick={()=>{approveVisit({visitId:v._id});setNotifyModal({template:"approved",target:"visitor",title:"Notify visitor — Approved",data:{visitorName:v.visitorName,visitorPhone:v.visitorPhone,visitorEmail:v.visitorEmail,hostName:getStaffName(v.hostId),scheduledDate:v.scheduledDate,purpose:v.purpose,orgName:orgName}})}} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:8,border:"1px solid rgba(63,185,80,0.4)",background:"rgba(63,185,80,0.1)",color:"#3fb950",fontWeight:600,fontSize:"0.8rem",cursor:"pointer",fontFamily:"inherit"}}>
                    <CheckCheck size={14}/> Approve
                  </button>
                  <button onClick={()=>{rejectVisit({visitId:v._id});setNotifyModal({template:"rejected",target:"visitor",title:"Notify visitor — Rejected",data:{visitorName:v.visitorName,visitorPhone:v.visitorPhone,visitorEmail:v.visitorEmail,hostName:getStaffName(v.hostId),scheduledDate:v.scheduledDate,purpose:v.purpose,orgName:orgName}})}} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:8,border:"1px solid rgba(248,81,73,0.4)",background:"rgba(248,81,73,0.1)",color:"#f85149",fontWeight:600,fontSize:"0.8rem",cursor:"pointer",fontFamily:"inherit"}}>
                    <X size={14}/> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Detail modal */}
    {selectedVisit&&(
      <div className="pa-modal-bg" onClick={()=>setSelectedVisit(null)}>
        <div className="pa-modal" onClick={e=>e.stopPropagation()}>
          <div className="pa-modal-hd">
            <span style={{fontWeight:700,fontSize:"1rem",color:"var(--text)"}}>Visit details</span>
            <button onClick={()=>setSelectedVisit(null)} style={{background:"none",border:"1px solid var(--border)",borderRadius:6,padding:"3px 8px",cursor:"pointer",color:"var(--muted)",fontFamily:"inherit"}}>&#x2715;</button>
          </div>
          <div className="pa-avatar">{(selectedVisit.visitorName??"V")[0].toUpperCase()}</div>
          <div className="pa-vname">{selectedVisit.visitorName}</div>
          <div style={{textAlign:"center",marginTop:6}}>
            <span style={{fontSize:"0.72rem",fontWeight:700,padding:"3px 10px",borderRadius:999,
              background:`${STATUS_COLORS[selectedVisit.status]??"#6b7280"}20`,
              color:STATUS_COLORS[selectedVisit.status]??"#6b7280"}}>
              {STATUS_LABEL[selectedVisit.status]??selectedVisit.status}
            </span>
          </div>
          {selectedVisit.status==="pending"&&(
            <div className="pa-action-row">
              <button className="pa-approve-btn" onClick={()=>{approveVisit({visitId:selectedVisit._id});setNotifyModal({template:"approved",target:"visitor",title:"Notify visitor — Approved",data:{visitorName:selectedVisit.visitorName,visitorPhone:selectedVisit.visitorPhone,visitorEmail:selectedVisit.visitorEmail,hostName:getStaffName(selectedVisit.hostId),scheduledDate:selectedVisit.scheduledDate,purpose:selectedVisit.purpose,orgName:orgName}});setSelectedVisit(null)}}>
                <CheckCheck size={14}/> Approve
              </button>
              <button className="pa-reject-btn" onClick={()=>{rejectVisit({visitId:selectedVisit._id});setNotifyModal({template:"rejected",target:"visitor",title:"Notify visitor — Rejected",data:{visitorName:selectedVisit.visitorName,visitorPhone:selectedVisit.visitorPhone,visitorEmail:selectedVisit.visitorEmail,hostName:getStaffName(selectedVisit.hostId),scheduledDate:selectedVisit.scheduledDate,purpose:selectedVisit.purpose,orgName:orgName}});setSelectedVisit(null)}}>
                <X size={14}/> Reject
              </button>
            </div>
          )}
          <div className="pa-fields">
            {[
              {label:"Date & time", value:new Date(selectedVisit.scheduledDate).toLocaleString()},
              {label:"Host",        value:getStaffName(selectedVisit.hostId)},
              {label:"Purpose",     value:selectedVisit.purpose},
              {label:"Company",     value:selectedVisit.visitorCompany},
              {label:"Email",       value:selectedVisit.visitorEmail},
              {label:"Phone",       value:selectedVisit.visitorPhone},
              {label:"Duration",    value:selectedVisit.duration?`${selectedVisit.duration} min`:undefined},
              {label:"Notes",       value:selectedVisit.notes},
            ].map(({label,value})=>value?(
              <div key={label} className="pa-field">
                <span className="pa-field-lbl">{label}</span>
                <span className="pa-field-val">{value}</span>
              </div>
            ):null)}
          </div>
        </div>
      </div>
    )}

    {notifyModal&&(<NotifyModal isOpen={true} onClose={()=>{setNotifyModal(null);setNotifyHostId("");}} template={notifyModal.template} data={notifyModal.data} target={notifyModal.target} title={notifyModal.title} />)}
    {/* New Appointment Modal */}
    {showForm&&(
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setShowForm(false)}>
        <div style={{background:"var(--surface,#161b22)",border:"1px solid var(--border,#30363d)",borderRadius:14,padding:28,width:"100%",maxWidth:500,maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
            <h2 style={{fontSize:"1.1rem",fontWeight:700,margin:0}}>New Appointment</h2>
            <button onClick={()=>setShowForm(false)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:18,lineHeight:1}}>&#x2715;</button>
          </div>
          {[
            {key:"visitorName",label:"Visitor name *",type:"text",placeholder:"Full name"},
            {key:"visitorEmail",label:"Email",type:"email",placeholder:"visitor@email.com"},
            {key:"visitorPhone",label:"Phone",type:"tel",placeholder:"+1 234 567 8900"},
            {key:"visitorCompany",label:"Company",type:"text",placeholder:"Company name"},
            {key:"scheduledDate",label:"Date *",type:"date",placeholder:""},
            {key:"scheduledTime",label:"Start time *",type:"time",placeholder:""},
            {key:"endTime",label:"End time",type:"time",placeholder:""},
            {key:"notes",label:"Notes",type:"text",placeholder:"Any additional info"},
          ].map(f=>(
            <div key={f.key} style={{marginBottom:12}}>
              <label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--muted)",marginBottom:4}}>{f.label}</label>
              <input type={f.type} value={(form as any)[f.key]} onChange={e=>setF(f.key,e.target.value)} placeholder={f.placeholder}
                style={{width:"100%",padding:"9px 12px",background:"var(--bg,#0d1117)",border:"1px solid var(--border,#30363d)",borderRadius:8,fontSize:"0.875rem",fontFamily:"inherit",color:"var(--text)",outline:"none",boxSizing:"border-box"}} />
            </div>
          ))}
          <div style={{marginBottom:16}}>
            <label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--muted)",marginBottom:4}}>Host staff *</label>
            <select value={form.hostStaffId} onChange={e=>setF("hostStaffId",e.target.value)}
              style={{width:"100%",padding:"9px 12px",background:"var(--bg,#0d1117)",border:"1px solid var(--border,#30363d)",borderRadius:8,fontSize:"0.875rem",fontFamily:"inherit",color:"var(--text)",outline:"none"}}>
              <option value="">Select staff member</option>
              {(assignedStaff??[]).map((s:any)=><option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          <div style={{marginBottom:16}}>
            <label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--muted)",marginBottom:4}}>Room (optional)</label>
            <select value={form.roomId} onChange={e=>setF("roomId",e.target.value)}
              style={{width:"100%",padding:"9px 12px",background:"var(--bg,#0d1117)",border:"1px solid var(--border,#30363d)",borderRadius:8,fontSize:"0.875rem",fontFamily:"inherit",color:"var(--text)",outline:"none"}}>
              <option value="">No room selected</option>
              {(rooms??[]).filter((r:any)=>r.status==="active").map((r:any)=>(
                <option key={r._id} value={r._id}>{r.name}{r.floor?` · ${r.floor}`:""}{r.capacity?` · ${r.capacity} pax`:""}</option>
              ))}
            </select>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:20}}>
            <button onClick={()=>setShowForm(false)} style={{padding:"9px 18px",background:"none",border:"1px solid var(--border)",borderRadius:8,fontWeight:600,fontSize:"0.85rem",color:"var(--muted)",cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
            <button onClick={handleCreate} disabled={formSaving||!form.visitorName||!form.scheduledDate||!form.scheduledTime}
              style={{padding:"9px 18px",background:"var(--accent,#3fb950)",color:"#fff",border:"none",borderRadius:8,fontWeight:700,fontSize:"0.85rem",cursor:"pointer",fontFamily:"inherit",opacity:formSaving?0.7:1}}>
              {formSaving?"Saving...":"Create Appointment"}
            </button>
          </div>
        </div>
      </div>
    )}
  </>);
}
export default PAAppointmentsPage;


