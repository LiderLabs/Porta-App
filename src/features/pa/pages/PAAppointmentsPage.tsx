// @ts-nocheck
import { useQuery, useMutation } from "convex/react";
// @ts-ignore
import { api } from "../../../../convex/_generated/api";
import { useUser } from "@clerk/clerk-react";
import { useState } from "react";
import { CheckCheck, X, Clock } from "lucide-react";

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

export function PAAppointmentsPage() {
  const { user } = useUser();
  const [filter, setFilter] = useState<string>("pending");

  const myStaffRecord  = useQuery(api.staff.getByClerkId, user?.id ? { clerkUserId: user.id } : "skip");
  const assignedStaff  = useQuery(api.paAssignments.getStaffForPA, myStaffRecord?._id ? { paStaffId: myStaffRecord._id } : "skip");
  const allVisits      = useQuery(api.scheduling.list);
  const allStaff       = useQuery(api.staff.list);
  const approveVisit   = useMutation(api.scheduling.approve);
  const rejectVisit    = useMutation(api.scheduling.reject);

  const assignedIds = new Set((assignedStaff ?? []).map((s:any) => s._id));

  const visits = (allVisits ?? [])
    .filter((v:any) => v.hostId && assignedIds.has(v.hostId))
    .filter((v:any) => filter === "all" || v.status === filter)
    .sort((a:any,b:any) => b._creationTime - a._creationTime);

  const getStaffName = (id:string) => allStaff?.find((s:any)=>s._id===id)?.name ?? "Unknown";

  const tabs = [
    { key:"pending",   label:"Pending",   count:(allVisits??[]).filter((v:any)=>v.hostId&&assignedIds.has(v.hostId)&&v.status==="pending").length },
    { key:"approved",  label:"Approved",  count:0 },
    { key:"all",       label:"All",       count:0 },
  ];

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", color:"var(--text)" }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:"1.4rem", fontWeight:700, letterSpacing:"-0.02em" }}>Appointments</h1>
        <p style={{ color:"var(--muted)", fontSize:"0.85rem", marginTop:3 }}>
          Managing appointments for {assignedStaff?.length ?? 0} staff member{assignedStaff?.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:6, marginBottom:20 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={()=>setFilter(t.key)} style={{
            padding:"7px 16px", borderRadius:8, border:"1px solid",
            borderColor: filter===t.key ? "var(--accent)" : "var(--border)",
            background: filter===t.key ? "var(--accent-bg)" : "transparent",
            color: filter===t.key ? "var(--accent)" : "var(--muted)",
            fontWeight:600, fontSize:"0.82rem", cursor:"pointer", fontFamily:"inherit",
            display:"flex", alignItems:"center", gap:6,
          }}>
            {t.label}
            {t.count > 0 && <span style={{ background:"var(--accent)", color:"#fff", fontSize:"0.65rem", fontWeight:700, padding:"1px 6px", borderRadius:20 }}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {visits.length === 0 ? (
          <div style={{ textAlign:"center", padding:"40px 0", color:"var(--muted)", fontSize:"0.9rem" }}>
            No {filter === "all" ? "" : filter} appointments found.
          </div>
        ) : visits.map((v:any) => (
          <div key={v._id} style={{
            background:"var(--sidebar)", border:"1px solid var(--border)",
            borderRadius:12, padding:"16px 20px",
            display:"flex", alignItems:"center", justifyContent:"space-between", gap:16,
          }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:5 }}>
                <span style={{ fontWeight:700, fontSize:"0.95rem" }}>{v.visitorName}</span>
                <span style={{ fontSize:"0.7rem", fontWeight:700, padding:"2px 8px", borderRadius:20,
                  background:`${STATUS_COLORS[v.status]}20`, color:STATUS_COLORS[v.status] }}>
                  {STATUS_LABEL[v.status] ?? v.status}
                </span>
              </div>
              <div style={{ fontSize:"0.78rem", color:"var(--muted)", display:"flex", flexWrap:"wrap", gap:"4px 14px" }}>
                <span>For <strong style={{color:"var(--text)"}}>{getStaffName(v.hostId)}</strong></span>
                <span>{v.purpose}</span>
                <span>{new Date(v.scheduledDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})} · {new Date(v.scheduledDate).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}</span>
              </div>
              {v.note && <div style={{ fontSize:"0.75rem", color:"var(--muted)", marginTop:5, fontStyle:"italic" }}>"{v.note}"</div>}
            </div>

            {v.status === "pending" && (
              <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                <button onClick={()=>approveVisit({ visitId:v._id })} style={{
                  display:"flex", alignItems:"center", gap:5, padding:"7px 14px",
                  borderRadius:8, border:"1px solid rgba(63,185,80,0.4)",
                  background:"rgba(63,185,80,0.1)", color:"#3fb950",
                  fontWeight:600, fontSize:"0.8rem", cursor:"pointer", fontFamily:"inherit",
                }}>
                  <CheckCheck size={14}/> Approve
                </button>
                <button onClick={()=>rejectVisit({ visitId:v._id })} style={{
                  display:"flex", alignItems:"center", gap:5, padding:"7px 14px",
                  borderRadius:8, border:"1px solid rgba(248,81,73,0.4)",
                  background:"rgba(248,81,73,0.1)", color:"#f85149",
                  fontWeight:600, fontSize:"0.8rem", cursor:"pointer", fontFamily:"inherit",
                }}>
                  <X size={14}/> Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
export default PAAppointmentsPage;
