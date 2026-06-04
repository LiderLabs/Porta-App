// @ts-nocheck
import { useState } from "react";
import { parseError } from "../../../lib/parseError";
import { useQuery, useMutation, useAction } from "convex/react";
import { useUser } from "@clerk/clerk-react";
// @ts-ignore
import { api } from "../../../../convex/_generated/api";
import { useTheme } from "../../../app/layouts/AdminLayout";
import { Search, X, UserPlus, Users } from "lucide-react";

const ROLES = ["receptionist", "employee", "dept_head", "pa"] as const;
type StaffRole = typeof ROLES[number];

const ROLE_META: Record<string, { color: string; bg: string; darkBg: string; label: string }> = {
  receptionist: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", darkBg: "rgba(245,158,11,0.15)", label: "Receptionist" },
  employee:     { color: "#8b949e", bg: "rgba(139,148,158,0.12)", darkBg: "rgba(139,148,158,0.15)", label: "Employee" },
  dept_head:    { color: "#38bdf8", bg: "rgba(56,189,248,0.12)", darkBg: "rgba(56,189,248,0.15)", label: "Dept Head" },
  pa:           { color: "#a78bfa", bg: "rgba(167,139,250,0.12)", darkBg: "rgba(167,139,250,0.15)", label: "PA / Secretary" },
};

// Sub-component: PA Assignment Modal
function PAAssignModal({ pa, allStaff, assignments, onAssign, onUnassign, onClose, t, dark }: any) {
  const assignableStaff = allStaff.filter((s: any) => s._id !== pa._id && s.role !== "pa" && s.role !== "receptionist");
  const assignedIds = new Set(assignments.map((a: any) => a._id));

  return (
    <div className="sp-overlay" onClick={onClose}>
      <div className="sp-modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="sp-modal-hd">
          <div>
            <div className="sp-modal-title">Assign staff to PA</div>
            <div style={{ fontSize: "0.78rem", color: t.muted, marginTop: 2 }}>{pa.name}</div>
          </div>
          <button className="sp-modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="sp-modal-body" style={{ maxHeight: 400, overflowY: "auto" }}>
          {assignableStaff.length === 0 ? (
            <div style={{ color: t.muted, fontSize: "0.85rem", textAlign: "center", padding: "16px 0" }}>
              No assignable staff found.
            </div>
          ) : assignableStaff.map((s: any) => {
            const assigned = assignedIds.has(s._id);
            const assignment = assignments.find((a: any) => a._id === s._id);
            return (
              <div key={s._id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 12px", borderRadius: 8,
                background: assigned ? (dark ? "rgba(167,139,250,0.08)" : "rgba(167,139,250,0.06)") : t.faint,
                border: `1px solid ${assigned ? "rgba(167,139,250,0.3)" : t.border}`,
                marginBottom: 8,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", display: "flex",
                    alignItems: "center", justifyContent: "center", fontSize: 12,
                    fontWeight: 700, color: "#fff", flexShrink: 0,
                    background: `hsl(${[...(s.name||"")].reduce((a:number,c:string)=>a+c.charCodeAt(0),0)%360},55%,35%)`,
                  }}>
                    {s.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: t.text }}>{s.name}</div>
                    <div style={{ fontSize: "0.72rem", color: t.muted }}>{ROLE_META[s.role || "employee"]?.label} {s.department ? `· ${s.department}` : ""}</div>
                  </div>
                </div>
                <button
                  onClick={() => assigned
                    ? onUnassign(assignment?.assignmentId)
                    : onAssign(pa._id, s._id)
                  }
                  style={{
                    padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer",
                    fontSize: "0.78rem", fontWeight: 600, fontFamily: "inherit",
                    background: assigned ? "rgba(248,81,73,0.12)" : "rgba(167,139,250,0.15)",
                    color: assigned ? "#f85149" : "#a78bfa",
                    transition: "opacity .12s",
                  }}
                >
                  {assigned ? "Remove" : "Assign"}
                </button>
              </div>
            );
          })}
        </div>
        <div className="sp-modal-ft">
          <div style={{ fontSize: "0.78rem", color: t.muted }}>
            {assignments.length} staff assigned
          </div>
          <button className="sp-sec-btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

export function StaffPage() {
  const { user } = useUser();
  const { dark } = useTheme();
  const staff        = useQuery(api.staff.list);
  const depts        = useQuery(api.departments.list);
  const invites      = useQuery(api.invites.list);
  const allAssignments = useQuery(api.paAssignments.listAll);
  const sendInvite   = useAction(api.invites.sendInvite);
  const revokeInvite = useMutation(api.invites.revoke);
  const removeStaff  = useMutation(api.staff.remove);
  const updateRole   = useMutation(api.staff.updateRole);
  const resetPassword = useAction(api.staff.resetPassword);
  const assignPA     = useMutation(api.paAssignments.assign);
  const unassignPA   = useMutation(api.paAssignments.unassign);

  const [tab, setTab]             = useState<"staff" | "invites">("staff");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSub]      = useState(false);
  const [error, setError]         = useState("");
  const [search, setSearch]       = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [form, setForm] = useState({ name: "", email: "", role: "employee" as StaffRole, department: "" });

  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting]         = useState(false);

  const [resetTarget, setResetTarget]   = useState<any>(null);
  const [resetSending, setResetSending] = useState(false);
  const [resetDone, setResetDone]       = useState(false);
  const [resetError, setResetError]     = useState("");

  // PA assignment modal
  const [paTarget, setPaTarget] = useState<any>(null);

  const t = dark ? {
    bg: "#0d1117", card: "#161b22", border: "#30363d",
    text: "#e6edf3", muted: "#8b949e", faint: "#21262d",
    hov: "#2d333b", input: "#21262d", inputBorder: "#30363d",
    accent: "#3fb950", danger: "#f85149",
    overlay: "rgba(0,0,0,0.7)",
  } : {
    bg: "#f8fafc", card: "#ffffff", border: "#e2e8f0",
    text: "#0f172a", muted: "#64748b", faint: "#f1f5f9",
    hov: "#f1f5f9", input: "#ffffff", inputBorder: "#d1d5db",
    accent: "#16a34a", danger: "#dc2626",
    overlay: "rgba(0,0,0,0.4)",
  };

  const filteredStaff = (staff ?? []).filter((s: any) => {
    const q = search.toLowerCase();
    const okSearch = !q || s.name.toLowerCase().includes(q) || (s.email ?? "").toLowerCase().includes(q);
    const okRole = roleFilter === "ALL" || s.role === roleFilter || (!s.role && roleFilter === "employee");
    return okSearch && okRole;
  });

  // For a given PA, get their current assigned staff (enriched with assignmentId)
  const getAssignmentsForPA = (paId: string) => {
    if (!allAssignments || !staff) return [];
    return allAssignments
      .filter((a: any) => a.paStaffId === paId)
      .map((a: any) => {
        const s = staff.find((st: any) => st._id === a.targetStaffId);
        return s ? { ...s, assignmentId: a._id } : null;
      })
      .filter(Boolean);
  };

  const handleInvite = async () => {
    if (!form.name || !form.email) return;
    setSub(true); setError("");
    try {
      const orgId = (user?.publicMetadata as any)?.orgId;
      await sendInvite({ ...form, invitedByClerkId: user?.id ?? "", invitedByName: user?.fullName ?? "Admin", orgId });
      setShowModal(false);
      setForm({ name: "", email: "", role: "employee", department: "" });
    } catch (e: any) {
      setError(parseError(e));
    } finally { setSub(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await removeStaff({ staffId: deleteTarget._id }); setDeleteTarget(null); }
    finally { setDeleting(false); }
  };

  const handleResetPassword = async () => {
    if (!resetTarget?.email) return;
    setResetSending(true); setResetError(""); setResetDone(false);
    try {
      await resetPassword({ email: resetTarget.email });
      setResetDone(true);
    } catch (e: any) {
      setResetError(parseError(e));
    } finally { setResetSending(false); }
  };

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
    .sp-root { font-family:'DM Sans',sans-serif; padding:24px 32px 40px; background:${t.bg}; min-height:calc(100vh - 52px); color:${t.text}; transition:background 0.2s,color 0.2s; }
    .sp-hdr { display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-bottom:24px; }
    .sp-title { font-size:1.6rem; font-weight:700; letter-spacing:-0.02em; margin-bottom:3px; color:${t.text}; }
    .sp-sub { font-size:0.875rem; color:${t.muted}; }
    .sp-btn { background:${t.accent}; color:#fff; border:none; border-radius:8px; padding:10px 20px; font-size:0.875rem; font-weight:600; cursor:pointer; font-family:inherit; transition:filter 0.15s; white-space:nowrap; }
    .sp-btn:hover { filter:brightness(1.1); }
    .sp-btn:disabled { opacity:0.5; cursor:not-allowed; }
    .sp-tabs { display:flex; gap:4px; border-bottom:1px solid ${t.border}; margin-bottom:20px; }
    .sp-tab { padding:8px 16px; background:none; border:none; font-family:inherit; font-size:0.875rem; font-weight:500; color:${t.muted}; cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-1px; transition:color 0.12s,border-color 0.12s; }
    .sp-tab--on { color:${t.accent}; border-bottom-color:${t.accent}; font-weight:600; }
    .sp-toolbar { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; margin-bottom:16px; }
    .sp-search { display:flex; align-items:center; gap:8px; background:${t.input}; border:1px solid ${t.inputBorder}; border-radius:8px; padding:0 12px; flex:1; max-width:280px; }
    .sp-search-input { background:none; border:none; outline:none; font-family:inherit; font-size:0.875rem; color:${t.text}; padding:9px 0; width:100%; }
    .sp-search-input::placeholder { color:${t.muted}; }
    .sp-filters { display:flex; gap:6px; flex-wrap:wrap; }
    .sp-filter { background:${t.faint}; border:1px solid ${t.border}; color:${t.muted}; border-radius:6px; padding:5px 12px; font-size:0.78rem; font-weight:600; cursor:pointer; font-family:inherit; transition:background 0.12s,color 0.12s; }
    .sp-filter--on { background:${t.accent}; color:#fff; border-color:${t.accent}; }
    .sp-table-wrap { border:1px solid ${t.border}; border-radius:10px; overflow:hidden; }
    .sp-table { width:100%; border-collapse:collapse; font-size:0.875rem; }
    .sp-table thead th { background:${t.faint}; color:${t.muted}; font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; padding:10px 14px; text-align:left; border-bottom:1px solid ${t.border}; }
    .sp-table tbody tr { border-bottom:1px solid ${t.border}; transition:background 0.1s; }
    .sp-table tbody tr:last-child { border-bottom:none; }
    .sp-table tbody tr:hover { background:${t.hov}; }
    .sp-table tbody td { padding:12px 14px; color:${t.text}; vertical-align:middle; }
    .sp-table-empty { text-align:center; color:${t.muted}; padding:32px!important; font-size:0.875rem; }
    .sp-chip { display:inline-block; padding:3px 10px; border-radius:20px; font-size:0.72rem; font-weight:700; }
    .sp-role-select { padding:4px 8px; border-radius:6px; border:1px solid ${t.border}; background:${t.faint}; color:${t.text}; font-size:0.78rem; font-family:inherit; cursor:pointer; outline:none; }
    .sp-role-select:focus { border-color:${t.accent}; }
    .sp-actions { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
    .sp-ghost { background:none; border:1px solid ${t.border}; font-family:inherit; font-size:0.78rem; font-weight:600; cursor:pointer; color:${t.muted}; padding:4px 10px; border-radius:6px; transition:all 0.12s; }
    .sp-ghost:hover { background:${t.hov}; color:${t.text}; }
    .sp-ghost-pa { background:rgba(167,139,250,0.1); border:1px solid rgba(167,139,250,0.3); font-family:inherit; font-size:0.78rem; font-weight:600; cursor:pointer; color:#a78bfa; padding:4px 10px; border-radius:6px; display:inline-flex; align-items:center; gap:4px; transition:all 0.12s; }
    .sp-ghost-pa:hover { background:rgba(167,139,250,0.2); }
    .sp-ghost-danger { background:none; border:1px solid transparent; font-family:inherit; font-size:0.78rem; font-weight:600; cursor:pointer; color:${t.danger}; padding:4px 10px; border-radius:6px; transition:all 0.12s; }
    .sp-ghost-danger:hover { background:rgba(248,81,73,0.1); border-color:rgba(248,81,73,0.3); }
    .sp-overlay { position:fixed; inset:0; background:${t.overlay}; display:flex; align-items:center; justify-content:center; z-index:1000; padding:20px; }
    .sp-modal { background:${t.card}; border:1px solid ${t.border}; border-radius:14px; width:100%; max-width:440px; box-shadow:0 20px 60px rgba(0,0,0,${dark?"0.5":"0.15"}); }
    .sp-modal-hd { display:flex; align-items:center; justify-content:space-between; padding:18px 20px 14px; border-bottom:1px solid ${t.border}; }
    .sp-modal-title { font-size:1rem; font-weight:700; color:${t.text}; }
    .sp-modal-close { background:none; border:none; color:${t.muted}; cursor:pointer; display:flex; align-items:center; padding:4px; border-radius:6px; transition:background 0.12s; }
    .sp-modal-close:hover { background:${t.faint}; color:${t.text}; }
    .sp-modal-body { padding:18px 20px; display:flex; flex-direction:column; gap:14px; }
    .sp-modal-note { font-size:0.8rem; color:${t.muted}; background:${t.faint}; border:1px solid ${t.border}; border-radius:8px; padding:10px 12px; }
    .sp-modal-ft { display:flex; gap:8px; justify-content:space-between; align-items:center; padding:14px 20px; border-top:1px solid ${t.border}; }
    .sp-field { display:flex; flex-direction:column; gap:5px; }
    .sp-label { font-size:0.78rem; font-weight:600; color:${t.text}; }
    .sp-input { padding:9px 12px; background:${t.input}; border:1px solid ${t.inputBorder}; border-radius:8px; font-size:0.875rem; font-family:inherit; color:${t.text}; outline:none; transition:border-color 0.15s; }
    .sp-input:focus { border-color:${t.accent}; }
    .sp-sec-btn { background:${t.faint}; border:1px solid ${t.border}; border-radius:8px; padding:9px 18px; font-size:0.875rem; font-weight:600; color:${t.text}; cursor:pointer; font-family:inherit; transition:background 0.12s; }
    .sp-sec-btn:hover { background:${t.hov}; }
    .sp-danger-btn { background:${t.danger}; border:none; border-radius:8px; padding:9px 18px; font-size:0.875rem; font-weight:600; color:#fff; cursor:pointer; font-family:inherit; transition:filter 0.12s; }
    .sp-danger-btn:hover { filter:brightness(1.1); }
    .sp-danger-btn:disabled { opacity:0.5; cursor:not-allowed; }
    .sp-error { font-size:0.78rem; color:${t.danger}; background:rgba(248,81,73,0.08); border:1px solid rgba(248,81,73,0.25); border-radius:6px; padding:8px 12px; }
    .sp-success { font-size:0.78rem; color:${t.accent}; background:rgba(63,185,80,0.08); border:1px solid rgba(63,185,80,0.25); border-radius:6px; padding:8px 12px; }
    .pa-badge { display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:20px; font-size:0.7rem; font-weight:600; background:rgba(167,139,250,0.12); color:#a78bfa; margin-top:3px; }
  `;

  return (
    <>
      <style>{css}</style>
      <div className="sp-root">
        <div className="sp-hdr">
          <div>
            <h1 className="sp-title">Staff & Invites</h1>
            <p className="sp-sub">
              {staff?.length ?? 0} staff members &middot; {invites?.filter((i: any) => i.status === "pending").length ?? 0} pending invites
            </p>
          </div>
          <button className="sp-btn" onClick={() => setShowModal(true)}>+ Invite member</button>
        </div>

        <div className="sp-tabs">
          <button className={`sp-tab${tab === "staff" ? " sp-tab--on" : ""}`} onClick={() => setTab("staff")}>
            Staff ({staff?.length ?? 0})
          </button>
          <button className={`sp-tab${tab === "invites" ? " sp-tab--on" : ""}`} onClick={() => setTab("invites")}>
            Invites ({invites?.length ?? 0})
          </button>
        </div>

        {tab === "staff" && (
          <>
            <div className="sp-toolbar">
              <div className="sp-search">
                <Search size={14} color={t.muted} />
                <input className="sp-search-input" placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)} />
                {search && <button style={{ background:"none",border:"none",cursor:"pointer",color:t.muted,display:"flex" }} onClick={() => setSearch("")}><X size={13}/></button>}
              </div>
              <div className="sp-filters">
                {["ALL", ...ROLES].map(r => (
                  <button key={r} className={`sp-filter${roleFilter === r ? " sp-filter--on" : ""}`} onClick={() => setRoleFilter(r)}>
                    {r === "ALL" ? "All roles" : ROLE_META[r]?.label ?? r}
                  </button>
                ))}
              </div>
            </div>

            <div className="sp-table-wrap">
              <table className="sp-table">
                <thead>
                  <tr><th>Staff member</th><th>Role</th><th>Department</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filteredStaff.length === 0 ? (
                    <tr><td colSpan={5} className="sp-table-empty">No staff found.</td></tr>
                  ) : filteredStaff.map((s: any) => {
                    const rm = ROLE_META[s.role || "employee"];
                    const hue = [...(s.name || "")].reduce((a: number, c: string) => a + c.charCodeAt(0), 0) % 360;
                    const paAssignments = s.role === "pa" ? getAssignmentsForPA(s._id) : [];
                    // For non-PA staff, show which PA(s) are assigned to them
                    const assignedPAs = s.role !== "pa" && s.role !== "receptionist"
                      ? (allAssignments ?? [])
                          .filter((a: any) => a.targetStaffId === s._id)
                          .map((a: any) => staff?.find((st: any) => st._id === a.paStaffId))
                          .filter(Boolean)
                      : [];

                    return (
                      <tr key={s._id}>
                        <td>
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <div style={{ width:34, height:34, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"#fff", background:`linear-gradient(135deg,hsl(${hue},55%,35%),hsl(${(hue+50)%360},65%,25%))`, flexShrink:0 }}>
                              {s.name?.[0]?.toUpperCase() ?? "?"}
                            </div>
                            <div>
                              <div style={{ fontSize:"0.875rem", fontWeight:600, color:t.text }}>{s.name}</div>
                              <div style={{ fontSize:"0.75rem", color:t.muted }}>{s.email || "—"}</div>
                              {/* Show assigned staff count for PAs */}
                              {s.role === "pa" && paAssignments.length > 0 && (
                                <div className="pa-badge">
                                  <Users size={10} /> {paAssignments.length} staff assigned
                                </div>
                              )}
                              {/* Show PA name for employees/dept_heads */}
                              {assignedPAs.length > 0 && (
                                <div className="pa-badge">
                                  PA: {assignedPAs.map((p: any) => p.name).join(", ")}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <select
                            className="sp-role-select"
                            value={s.role || "employee"}
                            onChange={async e => { await updateRole({ staffId: s._id, role: e.target.value as StaffRole }); }}
                          >
                            {ROLES.map(r => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
                          </select>
                        </td>
                        <td style={{ color:t.muted, fontSize:"0.85rem" }}>{s.department || "—"}</td>
                        <td>
                          <span className="sp-chip" style={{
                            color: s.status === "inactive" ? "#f85149" : "#3fb950",
                            background: s.status === "inactive" ? "rgba(248,81,73,0.1)" : "rgba(63,185,80,0.1)",
                          }}>
                            {s.status || "active"}
                          </span>
                        </td>
                        <td>
                          <div className="sp-actions">
                            {/* PA assignment button — only for PA role */}
                            {s.role === "pa" && (
                              <button className="sp-ghost-pa" onClick={() => setPaTarget(s)}>
                                <UserPlus size={12} /> Assign staff
                              </button>
                            )}
                            <button className="sp-ghost" onClick={() => { setResetTarget(s); setResetDone(false); setResetError(""); }}>
                              Reset pwd
                            </button>
                            <button className="sp-ghost-danger" onClick={() => setDeleteTarget(s)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "invites" && (
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Expires</th><th>Actions</th></tr></thead>
              <tbody>
                {(!invites || invites.length === 0) ? (
                  <tr><td colSpan={6} className="sp-table-empty">No invites sent yet.</td></tr>
                ) : invites.map((i: any) => {
                  const rm = ROLE_META[i.role];
                  const expired = i.expiresAt < Date.now();
                  const statusColor = i.status === "accepted" ? "#3fb950" : (i.status === "pending" && !expired) ? "#f59e0b" : "#f85149";
                  const statusBg = i.status === "accepted" ? "rgba(63,185,80,0.1)" : (i.status === "pending" && !expired) ? "rgba(245,158,11,0.1)" : "rgba(248,81,73,0.1)";
                  return (
                    <tr key={i._id}>
                      <td style={{ fontWeight:600, fontSize:"0.875rem", color:t.text }}>{i.name}</td>
                      <td style={{ color:t.muted, fontSize:"0.85rem" }}>{i.email}</td>
                      <td><span className="sp-chip" style={{ color:rm?.color, background:dark?rm?.darkBg:rm?.bg }}>{rm?.label ?? i.role}</span></td>
                      <td><span className="sp-chip" style={{ color:statusColor, background:statusBg }}>{expired && i.status === "pending" ? "expired" : i.status}</span></td>
                      <td style={{ color:t.muted, fontSize:"0.8rem" }}>{new Date(i.expiresAt).toLocaleDateString()}</td>
                      <td>{i.status === "pending" && <button className="sp-ghost-danger" onClick={() => revokeInvite({ inviteId: i._id })}>Revoke</button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PA Assignment Modal */}
        {paTarget && (
          <PAAssignModal
            pa={paTarget}
            allStaff={staff ?? []}
            assignments={getAssignmentsForPA(paTarget._id)}
            onAssign={(paId: any, targetId: any) => assignPA({ paStaffId: paId, targetStaffId: targetId })}
            onUnassign={(assignmentId: any) => unassignPA({ assignmentId })}
            onClose={() => setPaTarget(null)}
            t={t}
            dark={dark}
          />
        )}

        {/* Invite modal */}
        {showModal && (
          <div className="sp-overlay" onClick={() => setShowModal(false)}>
            <div className="sp-modal" onClick={e => e.stopPropagation()}>
              <div className="sp-modal-hd">
                <div className="sp-modal-title">Invite staff</div>
                <button className="sp-modal-close" onClick={() => setShowModal(false)}><X size={16} /></button>
              </div>
              <div className="sp-modal-body">
                <div className="sp-modal-note">An invitation email will be sent with a link to set up their account.</div>
                {([
                  { key:"name",  label:"Full name",  placeholder:"Jane Smith",       type:"text"  },
                  { key:"email", label:"Work email", placeholder:"jane@company.com", type:"email" },
                ] as any[]).map(({ key, label, placeholder, type }) => (
                  <div key={key} className="sp-field">
                    <label className="sp-label">{label} <span style={{ color:t.danger }}>*</span></label>
                    <input className="sp-input" type={type} placeholder={placeholder} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                  </div>
                ))}
                <div className="sp-field">
                  <label className="sp-label">Role</label>
                  <select className="sp-input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as StaffRole }))}>
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
                  </select>
                </div>
                <div className="sp-field">
                  <label className="sp-label">Department</label>
                  <select className="sp-input" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                    <option value="">No department</option>
                    {(depts ?? []).map((d: any) => <option key={d._id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
                {error && <div className="sp-error">{error}</div>}
              </div>
              <div className="sp-modal-ft">
                <button className="sp-sec-btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="sp-btn" disabled={submitting || !form.name || !form.email} onClick={handleInvite}>
                  {submitting ? "Sending..." : "Send invite"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirm modal */}
        {deleteTarget && (
          <div className="sp-overlay" onClick={() => setDeleteTarget(null)}>
            <div className="sp-modal" onClick={e => e.stopPropagation()}>
              <div className="sp-modal-hd">
                <div className="sp-modal-title">Delete staff member</div>
                <button className="sp-modal-close" onClick={() => setDeleteTarget(null)}><X size={16}/></button>
              </div>
              <div className="sp-modal-body">
                <div style={{ fontSize:"0.9rem", fontWeight:600, color:t.text }}>{deleteTarget.name}</div>
                <div style={{ fontSize:"0.8rem", color:t.muted, background:"rgba(248,81,73,0.06)", border:"1px solid rgba(248,81,73,0.2)", borderRadius:8, padding:"10px 12px" }}>
                  This will permanently remove <strong>{deleteTarget.name}</strong> from the system. This cannot be undone.
                </div>
              </div>
              <div className="sp-modal-ft">
                <button className="sp-sec-btn" onClick={() => setDeleteTarget(null)}>Cancel</button>
                <button className="sp-danger-btn" disabled={deleting} onClick={handleDelete}>
                  {deleting ? "Deleting..." : "Delete permanently"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Password reset modal */}
        {resetTarget && (
          <div className="sp-overlay" onClick={() => { setResetTarget(null); setResetDone(false); setResetError(""); }}>
            <div className="sp-modal" onClick={e => e.stopPropagation()}>
              <div className="sp-modal-hd">
                <div className="sp-modal-title">Reset password</div>
                <button className="sp-modal-close" onClick={() => { setResetTarget(null); setResetDone(false); setResetError(""); }}><X size={16}/></button>
              </div>
              <div className="sp-modal-body">
                <div style={{ fontSize:"0.9rem", fontWeight:600, color:t.text }}>{resetTarget.name}</div>
                <div className="sp-modal-note">
                  A password reset link will be sent to <strong>{resetTarget.email}</strong>.
                </div>
                {resetDone && <div className="sp-success"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg> Reset link sent to {resetTarget.email}</div>}
                {resetError && <div className="sp-error">{resetError}</div>}
              </div>
              <div className="sp-modal-ft">
                <button className="sp-sec-btn" onClick={() => { setResetTarget(null); setResetDone(false); setResetError(""); }}>
                  {resetDone ? "Close" : "Cancel"}
                </button>
                {!resetDone && (
                  <button className="sp-btn" disabled={resetSending} onClick={handleResetPassword}>
                    {resetSending ? "Sending..." : "Send reset link"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
export default StaffPage;



