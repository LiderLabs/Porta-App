// @ts-nocheck
import { useQuery, useMutation } from "convex/react";
// @ts-ignore
import { api } from "../../../../convex/_generated/api";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { Users, Calendar, Clock, CheckCheck, ChevronRight, Bell } from "lucide-react";

const STATUS_COLORS: Record<string,string> = {
  pending:"#f59e0b", approved:"#3fb950", accepted:"#3fb950",
  rejected:"#f85149", declined:"#f85149", checked_in:"#38bdf8",
  in_meeting:"#a78bfa", completed:"#6b7280", cancelled:"#6b7280", no_show:"#ef4444",
};
const STATUS_LABEL: Record<string,string> = {
  pending:"Pending", approved:"Approved", accepted:"Approved",
  rejected:"Rejected", declined:"Rejected", checked_in:"Checked in",
  in_meeting:"In meeting", completed:"Completed", cancelled:"Cancelled", no_show:"No show",
};

export function PAHomePage() {
  const { user } = useUser();
  const navigate  = useNavigate();

  const myStaffRecord  = useQuery(api.staff.getByClerkId, user?.id ? { clerkUserId: user.id } : "skip");
  const assignedStaff  = useQuery(api.paAssignments.getStaffForPA, myStaffRecord?._id ? { paStaffId: myStaffRecord._id } : "skip");
  const allStaff       = useQuery(api.staff.list);
  const allVisits      = useQuery(api.scheduling.list);
  const notifications  = useQuery(api.notifications.listForUser, { clerkUserId: user?.id ?? "" });
  const markAllRead    = useMutation(api.notifications.markAllRead);

  const assignedIds = new Set((assignedStaff ?? []).map((s:any) => s._id));
  const relevantVisits = (allVisits ?? []).filter((v:any) => v.hostId && assignedIds.has(v.hostId));

  const today = new Date();
  const todayVisits = relevantVisits.filter((v:any) => {
    const d = new Date(v.scheduledDate);
    return d.getFullYear()===today.getFullYear() && d.getMonth()===today.getMonth() && d.getDate()===today.getDate();
  });
  const pendingVisits  = relevantVisits.filter((v:any) => v.status === "pending");
  const upcomingVisits = relevantVisits
    .filter((v:any) => new Date(v.scheduledDate) > today && v.status !== "cancelled" && v.status !== "rejected")
    .sort((a:any,b:any) => a.scheduledDate - b.scheduledDate)
    .slice(0, 5);
  const unreadNotifs = (notifications ?? []).filter((n:any) => !n.read);

  const getStaffName = (id:string) => allStaff?.find((s:any) => s._id === id)?.name ?? "Unknown";
  const greeting = () => { const h=today.getHours(); return h<12?"Good morning":h<17?"Good afternoon":"Good evening"; };

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",color:"var(--text)"}}>
      <div style={{marginBottom:28}}>
        <h1 style={{fontSize:"1.6rem",fontWeight:700,letterSpacing:"-0.02em",marginBottom:4}}>
          {greeting()}, {user?.firstName ?? "there"}
        </h1>
        <p style={{color:"var(--muted)",fontSize:"0.875rem"}}>
          {today.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
        </p>
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14,marginBottom:28}}>
        {[
          {label:"Assigned staff",   value:assignedStaff?.length??0, color:"#a78bfa", icon:<Users size={18}/>},
          {label:"Today's visits",   value:todayVisits.length,        color:"#3fb950", icon:<Calendar size={18}/>},
          {label:"Pending approval", value:pendingVisits.length,      color:"#f59e0b", icon:<Clock size={18}/>},
          {label:"Upcoming",         value:upcomingVisits.length,     color:"#38bdf8", icon:<CheckCheck size={18}/>},
        ].map(stat=>(
          <div key={stat.label} style={{background:"var(--sidebar)",border:"1px solid var(--border)",borderRadius:12,padding:"18px 20px",display:"flex",alignItems:"center",gap:14}}>
            <div style={{color:stat.color,opacity:.9}}>{stat.icon}</div>
            <div>
              <div style={{fontSize:"1.6rem",fontWeight:800,lineHeight:1}}>{stat.value}</div>
              <div style={{fontSize:"0.75rem",color:"var(--muted)",marginTop:3}}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
        {/* Assigned Staff */}
        <div style={{background:"var(--sidebar)",border:"1px solid var(--border)",borderRadius:12,overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",borderBottom:"1px solid var(--border)"}}>
            <div style={{fontWeight:700,fontSize:"0.95rem"}}>My staff</div>
            <span style={{fontSize:"0.75rem",color:"var(--muted)"}}>{assignedStaff?.length??0} assigned</span>
          </div>
          <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:10}}>
            {!assignedStaff||assignedStaff.length===0 ? (
              <div style={{color:"var(--muted)",fontSize:"0.85rem",textAlign:"center",padding:"16px 0"}}>No staff assigned yet.</div>
            ) : assignedStaff.map((s:any)=>{
              const hue=[...(s.name||"")].reduce((a:number,c:string)=>a+c.charCodeAt(0),0)%360;
              const pending=relevantVisits.filter((v:any)=>v.hostId===s._id&&v.status==="pending").length;
              return (
                <div key={s._id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:8,background:"var(--surface)",border:"1px solid var(--border)"}}>
                  <div style={{width:34,height:34,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff",background:`linear-gradient(135deg,hsl(${hue},55%,35%),hsl(${(hue+50)%360},65%,25%))`}}>
                    {s.name?.[0]?.toUpperCase()??"?"}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:"0.875rem"}}>{s.name}</div>
                    <div style={{fontSize:"0.72rem",color:"var(--muted)"}}>{s.department||s.title||"Staff"}</div>
                  </div>
                  {pending>0&&<span style={{background:"rgba(245,158,11,.15)",color:"#f59e0b",fontSize:"0.7rem",fontWeight:700,padding:"2px 8px",borderRadius:20}}>{pending} pending</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming visits */}
        <div style={{background:"var(--sidebar)",border:"1px solid var(--border)",borderRadius:12,overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",borderBottom:"1px solid var(--border)"}}>
            <div style={{fontWeight:700,fontSize:"0.95rem"}}>Upcoming visits</div>
            <button onClick={()=>navigate("/pa/appointments")} style={{background:"none",border:"none",cursor:"pointer",color:"var(--accent)",fontSize:"0.8rem",fontWeight:600,display:"flex",alignItems:"center",gap:3}}>
              View all <ChevronRight size={14}/>
            </button>
          </div>
          <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:10}}>
            {upcomingVisits.length===0 ? (
              <div style={{color:"var(--muted)",fontSize:"0.85rem",textAlign:"center",padding:"16px 0"}}>No upcoming visits.</div>
            ) : upcomingVisits.map((v:any)=>(
              <div key={v._id} style={{padding:"10px 12px",borderRadius:8,background:"var(--surface)",border:"1px solid var(--border)"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                  <div style={{fontWeight:600,fontSize:"0.875rem"}}>{v.visitorName}</div>
                  <span style={{fontSize:"0.7rem",fontWeight:700,padding:"2px 8px",borderRadius:20,background:`${STATUS_COLORS[v.status]}20`,color:STATUS_COLORS[v.status]}}>{STATUS_LABEL[v.status]??v.status}</span>
                </div>
                <div style={{fontSize:"0.75rem",color:"var(--muted)"}}>
                  For {getStaffName(v.hostId)} · {new Date(v.scheduledDate).toLocaleDateString("en-US",{month:"short",day:"numeric"})} {new Date(v.scheduledDate).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div style={{background:"var(--sidebar)",border:"1px solid var(--border)",borderRadius:12,overflow:"hidden",gridColumn:"1 / -1"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",borderBottom:"1px solid var(--border)"}}>
            <div style={{fontWeight:700,fontSize:"0.95rem",display:"flex",alignItems:"center",gap:8}}>
              <Bell size={16}/> Notifications
              {unreadNotifs.length>0&&<span style={{background:"var(--accent)",color:"#fff",fontSize:"0.65rem",fontWeight:700,padding:"1px 7px",borderRadius:20}}>{unreadNotifs.length}</span>}
            </div>
            {unreadNotifs.length>0&&<button onClick={()=>markAllRead({clerkUserId:user?.id??""})} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:"0.78rem",fontWeight:600}}>Mark all read</button>}
          </div>
          <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:8,maxHeight:200,overflowY:"auto"}}>
            {!notifications||notifications.length===0 ? (
              <div style={{color:"var(--muted)",fontSize:"0.85rem",textAlign:"center",padding:"16px 0"}}>No notifications yet.</div>
            ) : notifications.slice(0,6).map((n:any)=>(
              <div key={n._id} style={{padding:"10px 12px",borderRadius:8,background:n.read?"var(--surface)":"var(--accent-bg)",border:`1px solid ${n.read?"var(--border)":"rgba(167,139,250,0.25)"}`,fontSize:"0.82rem"}}>
                {n.message}
                <div style={{fontSize:"0.7rem",color:"var(--muted)",marginTop:3}}>{new Date(n.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
export default PAHomePage;
