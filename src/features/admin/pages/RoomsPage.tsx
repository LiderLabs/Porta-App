import { useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
// @ts-ignore
import { api } from "../../../../convex/_generated/api";
import { useTheme } from "../../../app/layouts/AdminLayout";
import { X, Plus, DoorOpen } from "lucide-react";

const AMENITIES = ["Projector","Whiteboard","TV Screen","Video Conferencing","AC","Phone","Whiteboard Markers","Coffee Machine"];

export function RoomsPage() {
  const { user } = useUser();
  const orgId = (user?.publicMetadata as any)?.orgId as string | undefined;
  const { dark } = useTheme();
  const rooms   = useQuery(api.rooms.list);
  const create  = useMutation(api.rooms.create);
  const update  = useMutation(api.rooms.update);
  const remove  = useMutation(api.rooms.remove);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<any>(null);
  const [saving, setSaving]     = useState(false);
  const [viewMode, setViewMode]   = useState<"list"|"card">("list");
  const [form, setForm]         = useState({ name:"", floor:"", capacity:"", amenities:[] as string[], status:"active" as "active"|"inactive" });

  const t = dark ? {
    bg:"#0d1117", card:"#161b22", border:"#30363d", text:"#e6edf3",
    muted:"#8b949e", faint:"#21262d", hov:"#2d333b", accent:"#3fb950", danger:"#f85149",
  } : {
    bg:"#f8fafc", card:"#ffffff", border:"#e2e8f0", text:"#0f172a",
    muted:"#64748b", faint:"#f1f5f9", hov:"#f1f5f9", accent:"#16a34a", danger:"#dc2626",
  };

  const resetForm = () => setForm({ name:"", floor:"", capacity:"", amenities:[], status:"active" });

  const openCreate = () => { resetForm(); setEditing(null); setShowForm(true); };
  const openEdit   = (r: any) => {
    setForm({ name:r.name, floor:r.floor??"", capacity:r.capacity?""+r.capacity:"", amenities:r.amenities??[], status:r.status });
    setEditing(r);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await update({ roomId:editing._id, name:form.name.trim(), floor:form.floor||undefined, capacity:form.capacity?parseInt(form.capacity):undefined, amenities:form.amenities.length?form.amenities:undefined, status:form.status });
      } else {
        await create({ name:form.name.trim(), floor:form.floor||undefined, capacity:form.capacity?parseInt(form.capacity):undefined, amenities:form.amenities.length?form.amenities:undefined, orgId });
      }
      setShowForm(false); resetForm(); setEditing(null);
    } finally { setSaving(false); }
  };

  const toggleAmenity = (a: string) => setForm(f => ({ ...f, amenities: f.amenities.includes(a) ? f.amenities.filter(x=>x!==a) : [...f.amenities,a] }));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        .rm-root { font-family:'DM Sans',sans-serif; padding:24px 32px 40px; background:${t.bg}; min-height:calc(100vh - 52px); color:${t.text}; }
        .rm-hdr { display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-bottom:28px; }
        .rm-title { font-size:1.6rem; font-weight:700; letter-spacing:-0.02em; margin-bottom:3px; }
        .rm-sub { font-size:0.875rem; color:${t.muted}; }
        .rm-btn { background:${t.accent}; color:#fff; border:none; border-radius:8px; padding:10px 20px; font-size:0.875rem; font-weight:600; cursor:pointer; font-family:inherit; display:flex; align-items:center; gap:6px; }
        .rm-btn:hover { filter:brightness(1.1); }
        .rm-list { display:flex; flex-direction:column; gap:0; border:1px solid ${t.border}; border-radius:12px; overflow:hidden; }
        .rm-list-row { display:flex; align-items:center; gap:12px; padding:14px 18px; background:${t.card}; border-bottom:1px solid ${t.border}; transition:background .12s; }
        .rm-list-row:last-child { border-bottom:none; }
        .rm-list-row:hover { background:${t.hov}; }
        .rm-list-name { font-size:.9rem; font-weight:700; color:${t.text}; flex:1; min-width:0; }
        .rm-list-meta { font-size:.78rem; color:${t.muted}; display:flex; gap:12px; }
        .rm-view-btn { padding:7px 10px; border-radius:7px; border:1px solid var(--border,#30363d); background:none; cursor:pointer; display:flex; align-items:center; color:var(--muted); transition:all .12s; }
        .rm-view-btn--on { border-color:#3fb950; background:rgba(63,185,80,.12); color:#3fb950; }
        .rm-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:16px; }
        .rm-card { background:${t.card}; border:1px solid ${t.border}; border-radius:12px; padding:20px; display:flex; flex-direction:column; gap:12px; }
        .rm-card-name { font-size:1rem; font-weight:700; color:${t.text}; display:flex; align-items:center; gap:8px; }
        .rm-card-meta { font-size:0.8rem; color:${t.muted}; display:flex; flex-direction:column; gap:4px; }
        .rm-badge { display:inline-block; padding:2px 8px; border-radius:20px; font-size:11px; font-weight:700; }
        .rm-badge--active { background:rgba(63,185,80,0.15); color:${t.accent}; }
        .rm-badge--inactive { background:rgba(107,114,128,0.15); color:#6b7280; }
        .rm-amenity { display:inline-block; background:${t.faint}; border:1px solid ${t.border}; color:${t.muted}; border-radius:20px; padding:2px 8px; font-size:11px; font-weight:600; margin:2px; }
        .rm-card-actions { display:flex; gap:8px; margin-top:auto; }
        .rm-edit-btn { flex:1; padding:7px; background:none; border:1px solid ${t.border}; border-radius:7px; font-size:0.8rem; font-weight:600; color:${t.muted}; cursor:pointer; font-family:inherit; }
        .rm-edit-btn:hover { border-color:${t.accent}; color:${t.accent}; }
        .rm-del-btn { padding:7px 12px; background:none; border:1px solid ${t.border}; border-radius:7px; font-size:0.8rem; font-weight:600; color:${t.muted}; cursor:pointer; font-family:inherit; }
        .rm-del-btn:hover { border-color:${t.danger}; color:${t.danger}; }
        .rm-empty { text-align:center; padding:60px 20px; color:${t.muted}; }
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.55); z-index:300; display:flex; align-items:center; justify-content:center; padding:20px; }
        .rm-modal { background:${t.card}; border:1px solid ${t.border}; border-radius:16px; width:100%; max-width:480px; max-height:90vh; overflow-y:auto; }
        .rm-modal-hd { display:flex; align-items:center; justify-content:space-between; padding:20px 22px 16px; border-bottom:1px solid ${t.border}; }
        .rm-modal-title { font-size:1rem; font-weight:800; color:${t.text}; }
        .rm-modal-body { padding:20px 22px; display:flex; flex-direction:column; gap:14px; }
        .rm-field { display:flex; flex-direction:column; gap:5px; }
        .rm-label { font-size:12px; font-weight:600; color:${t.muted}; }
        .rm-input { padding:9px 12px; background:${t.bg}; border:1px solid ${t.border}; border-radius:8px; font-size:0.875rem; font-family:inherit; color:${t.text}; outline:none; width:100%; box-sizing:border-box; }
        .rm-input:focus { border-color:${t.accent}; }
        .rm-amenity-grid { display:flex; flex-wrap:wrap; gap:6px; }
        .rm-amenity-btn { padding:5px 12px; border-radius:20px; border:1px solid ${t.border}; font-size:.78rem; font-weight:600; cursor:pointer; font-family:inherit; background:${t.faint}; color:${t.muted}; }
        .rm-amenity-btn--on { background:${t.accent}; color:#fff; border-color:${t.accent}; }
        .rm-modal-ft { padding:14px 22px 20px; border-top:1px solid ${t.border}; display:flex; gap:8px; justify-content:flex-end; }
        .rm-cancel-btn { padding:9px 18px; background:none; border:1px solid ${t.border}; border-radius:8px; font-size:0.875rem; font-weight:600; color:${t.muted}; cursor:pointer; font-family:inherit; }
        .rm-save-btn { padding:9px 20px; background:${t.accent}; color:#fff; border:none; border-radius:8px; font-size:0.875rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .rm-save-btn:disabled { opacity:0.5; cursor:not-allowed; }
        @media(max-width:768px){
          .rm-root { padding:16px 12px; }
          .rm-hdr { flex-direction:column; align-items:flex-start; gap:10px; }
          .rm-hdr > div:last-child { width:100%; display:flex; gap:8px; justify-content:flex-end; }
          .rm-grid { grid-template-columns:1fr; }
          .rm-modal { max-width:100%; margin:0; border-radius:14px 14px 0 0; position:fixed; bottom:0; left:0; right:0; max-height:85vh; }
          .modal-overlay { align-items:flex-end; padding:0; }
          .rm-list-meta { flex-wrap:wrap; gap:6px; }
        }
        @media(max-width:480px){
          .rm-grid { grid-template-columns:1fr; }
          .rm-card { padding:14px; }
        }
      `}</style>

      <div className="rm-root">
        <div className="rm-hdr">
          <div>
            <h1 className="rm-title">Rooms</h1>
            <p className="rm-sub">Manage meeting rooms and spaces in your building</p>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button className={`rm-view-btn${viewMode==="list"?" rm-view-btn--on":""}`} onClick={()=>setViewMode("list")} title="List view"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></button>
            <button className={`rm-view-btn${viewMode==="card"?" rm-view-btn--on":""}`} onClick={()=>setViewMode("card")} title="Card view"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></button>
            <button className="rm-btn" onClick={openCreate}><Plus size={16}/>Add room</button>
          </div>
        </div>

        {rooms === undefined ? (
          <div className="rm-empty">Loading...</div>
        ) : rooms.length === 0 ? (
          <div className="rm-empty">
            <DoorOpen size={40} style={{margin:"0 auto 12px",opacity:.3,display:"block"}}/>
            <div style={{fontWeight:600,marginBottom:6}}>No rooms yet</div>
            <div style={{fontSize:".85rem"}}>Add your first room to start managing space bookings</div>
          </div>
        ) : viewMode==="card" ? (
          <div className="rm-grid">
            {rooms.map((r: any) => (
              <div key={r._id} className="rm-card">
                <div className="rm-card-name">
                  <DoorOpen size={18} style={{color:t.accent}}/>
                  {r.name}
                  <span className={`rm-badge rm-badge--${r.status}`}>{r.status}</span>
                </div>
                <div className="rm-card-meta">
                  {r.floor && <span>📍 {r.floor}</span>}
                  {r.capacity && <span>👥 Capacity: {r.capacity}</span>}
                </div>
                {r.amenities?.length > 0 && (
                  <div>{r.amenities.map((a: string) => <span key={a} className="rm-amenity">{a}</span>)}</div>
                )}
                <div className="rm-card-actions">
                  <button className="rm-edit-btn" onClick={() => openEdit(r)}>Edit</button>
                  <button className="rm-del-btn" onClick={() => remove({ roomId: r._id })}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rm-list">
            {rooms.map((r: any) => (
              <div key={r._id} className="rm-list-row">
                <DoorOpen size={16} style={{color:t.accent,flexShrink:0}}/>
                <div className="rm-list-name">{r.name}</div>
                <div className="rm-list-meta">
                  {r.floor&&<span>📍 {r.floor}</span>}
                  {r.capacity&&<span>👥 {r.capacity}</span>}
                  <span className={`rm-badge rm-badge--${r.status}`}>{r.status}</span>
                  {r.amenities?.length>0&&<span>{r.amenities.slice(0,2).join(", ")}{r.amenities.length>2?` +${r.amenities.length-2}`:""}</span>}
                </div>
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  <button className="rm-edit-btn" style={{flex:"none",padding:"5px 12px"}} onClick={()=>openEdit(r)}>Edit</button>
                  <button className="rm-del-btn" style={{padding:"5px 10px"}} onClick={()=>remove({roomId:r._id})}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="rm-modal" onClick={e => e.stopPropagation()}>
            <div className="rm-modal-hd">
              <div className="rm-modal-title">{editing ? "Edit room" : "Add room"}</div>
              <button onClick={() => setShowForm(false)} style={{background:"none",border:"none",cursor:"pointer",color:t.muted,display:"flex"}}><X size={18}/></button>
            </div>
            <div className="rm-modal-body">
              <div className="rm-field">
                <label className="rm-label">Room name *</label>
                <input className="rm-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Boardroom A" />
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div className="rm-field">
                  <label className="rm-label">Floor / Location</label>
                  <input className="rm-input" value={form.floor} onChange={e=>setForm(f=>({...f,floor:e.target.value}))} placeholder="e.g. 2nd Floor" />
                </div>
                <div className="rm-field">
                  <label className="rm-label">Capacity</label>
                  <input className="rm-input" type="number" value={form.capacity} onChange={e=>setForm(f=>({...f,capacity:e.target.value}))} placeholder="e.g. 10" />
                </div>
              </div>
              <div className="rm-field">
                <label className="rm-label">Amenities</label>
                <div className="rm-amenity-grid">
                  {AMENITIES.map(a => (
                    <button key={a} className={`rm-amenity-btn${form.amenities.includes(a)?" rm-amenity-btn--on":""}`} onClick={()=>toggleAmenity(a)}>{a}</button>
                  ))}
                </div>
              </div>
              {editing && (
                <div className="rm-field">
                  <label className="rm-label">Status</label>
                  <select className="rm-input" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value as any}))}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}
            </div>
            <div className="rm-modal-ft">
              <button className="rm-cancel-btn" onClick={()=>setShowForm(false)}>Cancel</button>
              <button className="rm-save-btn" onClick={handleSave} disabled={saving||!form.name.trim()}>{saving?"Saving...":editing?"Save changes":"Add room"}</button>
            </div>
          </div>
        </div>
      )}
      <div style={{textAlign:"center",padding:"12px 24px",fontSize:"12px",fontWeight:600,color:"#3fb950",letterSpacing:"0.04em",opacity:0.85}}>© {new Date().getFullYear()} Porta · Powered by Lider Technologies LTD</div>
    </>
  );
}
export default RoomsPage;



