import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
// @ts-ignore
import { api } from "../../../../convex/_generated/api";
// @ts-ignore
import type { Id } from "../../../../convex/_generated/dataModel";
import { useTheme } from "../../../app/layouts/AdminLayout";
import { Users, UserCircle, X, Clock } from "lucide-react";

const DEPT_COLORS = ["#3fb950","#38bdf8","#fb923c","#a78bfa","#f472b6","#f59e0b","#f85149","#3b82f6"];
const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"] as const;
const DAY_LABELS: Record<string,string> = { monday:"Mon",tuesday:"Tue",wednesday:"Wed",thursday:"Thu",friday:"Fri",saturday:"Sat",sunday:"Sun" };
const DEFAULT_HOURS = { open:"08:00", close:"17:00", enabled:true };

export function DepartmentsPage() {
  const { dark } = useTheme();
  const depts     = useQuery(api.departments.list);
  const staff     = useQuery(api.staff.list);
  const create    = useMutation(api.departments.create);
  const update    = useMutation(api.departments.update);
  const remove    = useMutation(api.departments.remove);
  const saveHours = useMutation(api.departments.updateHours);

  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState<any>(null);
  const [hoursModal, setHoursModal] = useState<any>(null);
  const [submitting, setSub]        = useState(false);
  const [viewMode, setViewMode]     = useState<"list"|"card">("list");
  const [form, setForm] = useState({ name:"", description:"", headStaffId:"", color:DEPT_COLORS[0] });
  const [hours, setHours] = useState<any>({});

  const t = dark ? {
    bg:"#0d1117", card:"#161b22", border:"#30363d",
    text:"#e6edf3", muted:"#8b949e", faint:"#21262d", hov:"#2d333b",
    input:"#21262d", inputBorder:"#30363d", accent:"#3fb950", danger:"#f85149",
    overlay:"rgba(0,0,0,0.7)", colorBorder:"#0d1117",
  } : {
    bg:"#f8fafc", card:"#ffffff", border:"#e2e8f0",
    text:"#0f172a", muted:"#64748b", faint:"#f1f5f9", hov:"#f1f5f9",
    input:"#ffffff", inputBorder:"#d1d5db", accent:"#16a34a", danger:"#dc2626",
    overlay:"rgba(0,0,0,0.4)", colorBorder:"#e2e8f0",
  };

  const openAdd  = () => { setEditing(null); setForm({name:"",description:"",headStaffId:"",color:DEPT_COLORS[0]}); setShowModal(true); };
  const openEdit = (d:any) => { setEditing(d); setForm({name:d.name,description:d.description||"",headStaffId:d.headStaffId||"",color:d.color||DEPT_COLORS[0]}); setShowModal(true); };
  const openHours = (d:any) => {
    const h: any = {};
    DAYS.forEach(day => { h[day] = d.officeHours?.[day] ?? { ...DEFAULT_HOURS }; });
    setHours(h); setHoursModal(d);
  };

  const handleSave = async () => {
    if (!form.name) return;
    setSub(true);
    try {
      const args = { name:form.name, description:form.description||undefined, headStaffId:(form.headStaffId||undefined) as Id<"staff">|undefined, color:form.color };
      if (editing) await update({ deptId:editing._id, ...args });
      else await create(args);
      setShowModal(false);
    } finally { setSub(false); }
  };

  const handleSaveHours = async () => {
    if (!hoursModal) return;
    setSub(true);
    try { await saveHours({ deptId:hoursModal._id, officeHours:hours }); setHoursModal(null); }
    finally { setSub(false); }
  };

  const css = `
    
    .dp-root { font-family:'Plus Jakarta Sans',sans-serif; padding:24px 32px 40px; background:${t.bg}; min-height:calc(100vh - 52px); color:${t.text}; transition:background 0.2s,color 0.2s; }
    .dp-hdr { display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-bottom:28px; }
    .dp-title { font-size:1.6rem; font-weight:700; letter-spacing:-0.02em; margin-bottom:3px; color:${t.text}; }
    .dp-sub { font-size:0.875rem; color:${t.muted}; }
    .dp-btn { background:${t.accent}; color:#fff; border:none; border-radius:8px; padding:10px 20px; font-size:0.875rem; font-weight:600; cursor:pointer; font-family:inherit; transition:filter 0.15s; }
    .dp-btn:hover { filter:brightness(1.1); }
    .dp-btn:disabled { opacity:0.5; cursor:not-allowed; }
    .dp-grid { display:flex; flex-direction:column; gap:0; border:1px solid ${t.border}; border-radius:12px; overflow:hidden; }
    .dp-card { background:${t.card}; border-bottom:1px solid ${t.border}; transition:background 0.12s; }
    .dp-card:last-child { border-bottom:none; } .dp-card:hover { background:${t.hov}; }
    .dp-band { width:4px; border-radius:0; align-self:stretch; flex-shrink:0; }
    .dp-body { padding:14px 16px; flex:1; min-width:0; }
    .dp-name { font-size:1rem; font-weight:700; color:${t.text}; margin-bottom:4px; }
    .dp-desc { font-size:0.8rem; color:${t.muted}; margin-bottom:10px; }
    .dp-meta { display:flex; gap:14px; flex-wrap:wrap; }
    .dp-meta-item { display:flex; align-items:center; gap:5px; font-size:0.78rem; color:${t.muted}; font-weight:500; }
    .dp-actions { display:flex; gap:6px; padding:10px 16px; flex-shrink:0; align-items:center; }
    .dp-ghost { background:none; border:1px solid ${t.border}; border-radius:6px; padding:5px 12px; font-size:0.78rem; font-weight:600; color:${t.text}; cursor:pointer; font-family:inherit; transition:background 0.12s; }
    .dp-ghost:hover { background:${t.hov}; }
    .dp-ghost-danger { color:${t.danger}; border-color:rgba(248,81,73,0.3); }
    .dp-ghost-danger:hover { background:rgba(248,81,73,0.08); }
    .dp-grid-cards { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:16px; }
    .dp-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:60px 20px; text-align:center; gap:12px; border:1px dashed ${t.border}; border-radius:12px; }
    .dp-empty-icon { font-size:2.5rem; }
    .dp-empty-title { font-size:1.1rem; font-weight:700; color:${t.text}; }
    .dp-empty-sub { font-size:0.875rem; color:${t.muted}; max-width:320px; }
    .dp-overlay { position:fixed; inset:0; background:${t.overlay}; display:flex; align-items:center; justify-content:center; z-index:1000; padding:20px; }
    .dp-modal { background:${t.card}; border:1px solid ${t.border}; border-radius:14px; width:100%; max-width:440px; box-shadow:0 20px 60px rgba(0,0,0,${dark?"0.5":"0.15"}); max-height:90vh; overflow-y:auto; }
    .dp-modal--wide { max-width:520px; }
    .dp-modal-hd { display:flex; align-items:center; justify-content:space-between; padding:18px 20px 14px; border-bottom:1px solid ${t.border}; position:sticky; top:0; background:${t.card}; }
    .dp-modal-title { font-size:1rem; font-weight:700; color:${t.text}; }
    .dp-modal-close { background:none; border:none; color:${t.muted}; cursor:pointer; display:flex; align-items:center; padding:4px; border-radius:6px; }
    .dp-modal-close:hover { background:${t.faint}; color:${t.text}; }
    .dp-modal-body { padding:18px 20px; display:flex; flex-direction:column; gap:14px; }
    .dp-modal-ft { display:flex; gap:8px; justify-content:flex-end; padding:14px 20px; border-top:1px solid ${t.border}; }
    .dp-field { display:flex; flex-direction:column; gap:5px; }
    .dp-label { font-size:0.78rem; font-weight:600; color:${t.text}; }
    .dp-input { padding:9px 12px; background:${t.input}; border:1px solid ${t.inputBorder}; border-radius:8px; font-size:0.875rem; font-family:inherit; color:${t.text}; outline:none; }
    .dp-input:focus { border-color:${t.accent}; }
    .dp-sec-btn { background:${t.faint}; border:1px solid ${t.border}; border-radius:8px; padding:9px 18px; font-size:0.875rem; font-weight:600; color:${t.text}; cursor:pointer; font-family:inherit; }
    .dp-sec-btn:hover { background:${t.hov}; }
    .dp-hours-row { display:flex; align-items:center; gap:16px; padding:10px 0; border-bottom:1px solid ${t.border}; }
    .dp-hours-row:last-child { border-bottom:none; }
    @media(max-width:768px){
      .dp-root { padding:16px 12px; }
      .dp-hdr { flex-direction:column; align-items:flex-start; gap:10px; }
      .dp-hdr > div:last-child { width:100%; display:flex; gap:8px; justify-content:flex-end; }
      .dp-card { flex-direction:column; }
      .dp-actions { padding:8px 12px 12px; justify-content:flex-end; }
      .dp-modal { max-width:100%; margin:0; border-radius:14px 14px 0 0; position:fixed; bottom:0; left:0; right:0; max-height:85vh; }
      .dp-overlay { align-items:flex-end; padding:0; }
    }
    @media(max-width:480px){
      .dp-meta { flex-direction:column; gap:4px; }
    }
  `;

  return (
    <>
      <style>{css}</style>
      <div className="dp-root">
        <div className="dp-hdr">
          <div>
            <h1 className="dp-title">Departments</h1>
            <p className="dp-sub">{depts?.length ?? 0} departments configured</p>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button onClick={()=>setViewMode("list")} title="List view" style={{padding:"8px 10px",borderRadius:7,border:"1px solid "+(viewMode==="list"?"#3fb950":"var(--border,#30363d)"),background:viewMode==="list"?"rgba(63,185,80,.12)":"none",color:viewMode==="list"?"#3fb950":"var(--muted)",cursor:"pointer",display:"flex",alignItems:"center"}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></button>
            <button onClick={()=>setViewMode("card")} title="Card view" style={{padding:"8px 10px",borderRadius:7,border:"1px solid "+(viewMode==="card"?"#3fb950":"var(--border,#30363d)"),background:viewMode==="card"?"rgba(63,185,80,.12)":"none",color:viewMode==="card"?"#3fb950":"var(--muted)",cursor:"pointer",display:"flex",alignItems:"center"}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></button>
            <button className="dp-btn" onClick={openAdd}>+ Add department</button>
          </div>
        </div>

        {(!depts || depts.length === 0) ? (
          <div className="dp-empty">
            <div className="dp-empty-icon">🏢</div>
            <div className="dp-empty-title">No departments yet</div>
            <div className="dp-empty-sub">Add your first department to start organising your team.</div>
            <button className="dp-btn" onClick={openAdd}>Add department</button>
          </div>
        ) : (
          <div className={viewMode==="card"?"dp-grid-cards":"dp-grid"}>
            {depts.map((d: any) => (
              <div key={d._id} className="dp-card" style={{display:"flex",alignItems:"stretch"}}>
                <div className="dp-band" style={{background:d.color||"#3fb950",width:4,flexShrink:0}} />
                <div className="dp-body">
                  <div className="dp-name">{d.name}</div>
                  {d.description && <div className="dp-desc">{d.description}</div>}
                  <div className="dp-meta">
                    <span className="dp-meta-item">
                      <Users size={13} color={t.muted} />
                      {d.staffCount ?? 0} staff
                    </span>
                    {d.headName && (
                      <span className="dp-meta-item">
                        <UserCircle size={13} color={t.muted} />
                        {d.headName}
                      </span>
                    )}
                  </div>
                </div>
                <div className="dp-actions">
                  <button className="dp-ghost" onClick={() => openHours(d)}>
                    <Clock size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />Hours
                  </button>
                  <button className="dp-ghost" onClick={() => openEdit(d)}>Edit</button>
                  <button className="dp-ghost dp-ghost-danger" onClick={() => remove({ deptId: d._id })}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit modal */}
        {showModal && (
          <div className="dp-overlay" onClick={() => setShowModal(false)}>
            <div className="dp-modal" onClick={e => e.stopPropagation()}>
              <div className="dp-modal-hd">
                <div className="dp-modal-title">{editing ? "Edit department" : "New department"}</div>
                <button className="dp-modal-close" onClick={() => setShowModal(false)}><X size={16} /></button>
              </div>
              <div className="dp-modal-body">
                <div className="dp-field">
                  <label className="dp-label">Name <span style={{ color: t.danger }}>*</span></label>
                  <input className="dp-input" placeholder="e.g. Human Resources" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="dp-field">
                  <label className="dp-label">Description</label>
                  <input className="dp-input" placeholder="What this department handles..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="dp-field">
                  <label className="dp-label">Department head</label>
                  <select className="dp-input" value={form.headStaffId} onChange={e => setForm(f => ({ ...f, headStaffId: e.target.value }))}>
                    <option value="">No head assigned</option>
                    {(staff ?? []).map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="dp-field">
                  <label className="dp-label">Colour</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {DEPT_COLORS.map(c => (
                      <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                        style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: form.color === c ? `3px solid ${t.text}` : `2px solid ${t.colorBorder}`, cursor: "pointer" }} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="dp-modal-ft">
                <button className="dp-sec-btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="dp-btn" disabled={submitting || !form.name} onClick={handleSave}>
                  {submitting ? "Saving..." : editing ? "Save changes" : "Create department"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Office hours modal */}
        {hoursModal && (
          <div className="dp-overlay" onClick={() => setHoursModal(null)}>
            <div className="dp-modal dp-modal--wide" onClick={e => e.stopPropagation()}>
              <div className="dp-modal-hd">
                <div className="dp-modal-title">Office hours &mdash; {hoursModal.name}</div>
                <button className="dp-modal-close" onClick={() => setHoursModal(null)}><X size={16} /></button>
              </div>
              <div className="dp-modal-body">
                {DAYS.map(day => (
                  <div key={day} className="dp-hours-row">
                    <div style={{ display: "flex", alignItems: "center", gap: 10, width: 100 }}>
                      <input type="checkbox" checked={hours[day]?.enabled ?? true}
                        onChange={e => setHours((h: any) => ({ ...h, [day]: { ...h[day], enabled: e.target.checked } }))}
                        style={{ width: 16, height: 16, accentColor: t.accent }} />
                      <span style={{ fontSize: "0.85rem", fontWeight: 600, color: t.text }}>{DAY_LABELS[day]}</span>
                    </div>
                    {hours[day]?.enabled ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input type="time" className="dp-input" style={{ width: 110 }} value={hours[day]?.open || "08:00"}
                          onChange={e => setHours((h: any) => ({ ...h, [day]: { ...h[day], open: e.target.value } }))} />
                        <span style={{ color: t.muted, fontSize: "0.875rem" }}>to</span>
                        <input type="time" className="dp-input" style={{ width: 110 }} value={hours[day]?.close || "17:00"}
                          onChange={e => setHours((h: any) => ({ ...h, [day]: { ...h[day], close: e.target.value } }))} />
                      </div>
                    ) : <span style={{ fontSize: "0.85rem", color: t.muted }}>Closed</span>}
                  </div>
                ))}
              </div>
              <div className="dp-modal-ft">
                <button className="dp-sec-btn" onClick={() => setHoursModal(null)}>Cancel</button>
                <button className="dp-btn" disabled={submitting} onClick={handleSaveHours}>
                  {submitting ? "Saving..." : "Save hours"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default DepartmentsPage;






