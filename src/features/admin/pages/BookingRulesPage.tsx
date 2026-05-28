import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
// @ts-ignore
import { api } from "../../../../convex/_generated/api";
import { useTheme } from "../../../app/layouts/AdminLayout";
import { X, Check } from "lucide-react";

function Toggle({ checked, onChange, accent }: { checked: boolean; onChange: () => void; accent: string }) {
  return (
    <button onClick={onChange} style={{
      width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
      background: checked ? accent : "#4b5563", position: "relative",
      transition: "background 0.2s", flexShrink: 0,
    }}>
      <span style={{
        position: "absolute", top: 3,
        left: checked ? 23 : 3,
        width: 18, height: 18, borderRadius: "50%",
        background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
        transition: "left 0.2s", display: "block",
      }} />
    </button>
  );
}

const DEFAULT_PURPOSES = ["Meeting","Interview","Delivery","Consultation","Site visit","Other"];

export function BookingRulesPage() {
  const { dark } = useTheme();
  const rules = useQuery(api.bookingRules.get);
  const save  = useMutation(api.bookingRules.save);
  const [local, setLocal]     = useState<any>(null);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [newPurpose, setNewPurpose] = useState("");

  const t = dark ? {
    bg:"#0d1117", card:"#161b22", border:"#30363d",
    text:"#e6edf3", muted:"#8b949e", faint:"#21262d", hov:"#2d333b",
    input:"#21262d", inputBorder:"#30363d", accent:"#3fb950", danger:"#f85149",
  } : {
    bg:"#f8fafc", card:"#ffffff", border:"#e2e8f0",
    text:"#0f172a", muted:"#64748b", faint:"#f1f5f9", hov:"#f1f5f9",
    input:"#ffffff", inputBorder:"#d1d5db", accent:"#16a34a", danger:"#dc2626",
  };

  if (rules === undefined) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"60vh", fontFamily:"'DM Sans',sans-serif", color: t.muted }}>
      Loading...
    </div>
  );

  const cfg = local ?? rules;
  const isDirty = local !== null;
  const set = (k: string, v: any) => setLocal((p: any) => ({ ...(p ?? rules), [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await save({ ...cfg });
      setLocal(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  };

  const addPurpose = () => {
    if (!newPurpose.trim()) return;
    set("allowedPurposes", [...(cfg.allowedPurposes ?? DEFAULT_PURPOSES), newPurpose.trim()]);
    setNewPurpose("");
  };

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
    .br-root { font-family:'DM Sans',sans-serif; padding:24px 32px 40px; background:${t.bg}; min-height:calc(100vh - 52px); color:${t.text}; transition:background 0.2s,color 0.2s; }
    .br-hdr { display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-bottom:28px; }
    .br-title { font-size:1.6rem; font-weight:700; letter-spacing:-0.02em; margin-bottom:3px; color:${t.text}; }
    .br-sub { font-size:0.875rem; color:${t.muted}; }
    .br-btn { background:${t.accent}; color:#fff; border:none; border-radius:8px; padding:10px 20px; font-size:0.875rem; font-weight:600; cursor:pointer; font-family:inherit; transition:filter 0.15s; display:flex; align-items:center; gap:6px; }
    .br-btn:hover:not(:disabled) { filter:brightness(1.1); }
    .br-btn:disabled { opacity:0.5; cursor:not-allowed; }
    .br-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:16px; }
    .br-card { background:${t.card}; border:1px solid ${t.border}; border-radius:12px; padding:20px; }
    .br-card--full { grid-column:1/-1; }
    .br-card-title { font-size:0.875rem; font-weight:700; color:${t.text}; margin-bottom:16px; text-transform:uppercase; letter-spacing:0.04em; }
    .br-row { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:12px 0; border-bottom:1px solid ${t.border}; }
    .br-row:last-child { border-bottom:none; }
    .br-row-label { font-size:0.875rem; font-weight:600; color:${t.text}; }
    .br-row-sub { font-size:0.75rem; color:${t.muted}; margin-top:2px; }
    .br-num-input { padding:8px 12px; background:${t.input}; border:1px solid ${t.inputBorder}; border-radius:8px; font-size:0.875rem; font-family:inherit; color:${t.text}; outline:none; width:80px; text-align:center; }
    .br-num-input:focus { border-color:${t.accent}; }
    .br-purpose-chip { display:inline-flex; align-items:center; gap:6px; background:${t.faint}; border:1px solid ${t.border}; color:${t.text}; border-radius:20px; padding:4px 10px 4px 12px; font-size:0.78rem; font-weight:600; }
    .br-chip-remove { background:none; border:none; color:${t.muted}; cursor:pointer; display:flex; align-items:center; padding:1px; border-radius:3px; }
    .br-chip-remove:hover { color:${t.danger}; }
    .br-add-row { display:flex; gap:8px; }
    .br-text-input { flex:1; padding:9px 12px; background:${t.input}; border:1px solid ${t.inputBorder}; border-radius:8px; font-size:0.875rem; font-family:inherit; color:${t.text}; outline:none; }
    .br-text-input:focus { border-color:${t.accent}; }
    .br-text-input::placeholder { color:${t.muted}; }
    .br-sec-btn { background:${t.faint}; border:1px solid ${t.border}; border-radius:8px; padding:9px 18px; font-size:0.875rem; font-weight:600; color:${t.text}; cursor:pointer; font-family:inherit; }
    .br-sec-btn:hover { background:${t.hov}; }
  `;

  return (
    <>
      <style>{css}</style>
      <div className="br-root">
        <div className="br-hdr">
          <div>
            <h1 className="br-title">Appointment rules</h1>
            <p className="br-sub">Control how visitors book and check in to your organisation</p>
          </div>
          <button className="br-btn" disabled={saving || !isDirty} onClick={handleSave}>
            {saved ? <><Check size={15} />Saved</> : saving ? "Saving..." : "Save changes"}
          </button>
        </div>

        <div className="br-grid">
          {/* Access & approval */}
          <div className="br-card">
            <div className="br-card-title">Access & approval</div>
            {[
              { key:"approvalRequired", label:"Approval required",  sub:"All bookings must be approved before confirmation" },
              { key:"walkInEnabled",    label:"Walk-ins enabled",    sub:"Allow unscheduled visitors to check in" },
              { key:"blacklistEnabled", label:"Blacklist enabled",   sub:"Block visitors on the blacklist from checking in" },
            ].map(({ key, label, sub }) => (
              <div key={key} className="br-row">
                <div>
                  <div className="br-row-label">{label}</div>
                  <div className="br-row-sub">{sub}</div>
                </div>
                <Toggle checked={!!cfg[key]} onChange={() => set(key, !cfg[key])} accent={t.accent} />
              </div>
            ))}
          </div>

          {/* Check-in requirements */}
          <div className="br-card">
            <div className="br-card-title">Check-in requirements</div>
            {[
              { key:"idRequired",       label:"ID required",             sub:"Visitors must show ID to check in" },
              { key:"photoRequired",    label:"Photo required",          sub:"Capture visitor photo on check-in" },
              { key:"qrCheckInEnabled", label:"QR code check-in",        sub:"Enable QR code for fast check-in" },
              { key:"whatsappEnabled",  label:"WhatsApp notifications",  sub:"Send booking confirmations via WhatsApp" },
            ].map(({ key, label, sub }) => (
              <div key={key} className="br-row">
                <div>
                  <div className="br-row-label">{label}</div>
                  <div className="br-row-sub">{sub}</div>
                </div>
                <Toggle checked={!!cfg[key]} onChange={() => set(key, !cfg[key])} accent={t.accent} />
              </div>
            ))}
          </div>

          {/* Limits & timing */}
          <div className="br-card">
            <div className="br-card-title">Limits & timing</div>
            {[
              { key:"maxVisitorsPerDay", label:"Max visitors per day",        placeholder:"50" },
              { key:"minNoticeHours",    label:"Min notice (hours)",           placeholder:"1" },
              { key:"maxAdvanceDays",    label:"Max advance booking (days)",   placeholder:"30" },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="br-row">
                <div className="br-row-label">{label}</div>
                <input type="number" className="br-num-input" placeholder={placeholder}
                  value={cfg[key] ?? ""}
                  onChange={e => set(key, parseInt(e.target.value) || undefined)} />
              </div>
            ))}
          </div>

          {/* Allowed purposes */}
          <div className="br-card br-card--full">
            <div className="br-card-title">Allowed visit purposes</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:16 }}>
              {(cfg.allowedPurposes ?? DEFAULT_PURPOSES).map((p: string) => (
                <span key={p} className="br-purpose-chip">
                  {p}
                  <button className="br-chip-remove"
                    onClick={() => set("allowedPurposes", (cfg.allowedPurposes ?? DEFAULT_PURPOSES).filter((x: string) => x !== p))}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className="br-add-row">
              <input className="br-text-input" placeholder="Add purpose..." value={newPurpose}
                onChange={e => setNewPurpose(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addPurpose()} />
              <button className="br-sec-btn" onClick={addPurpose}>Add</button>
            </div>
          </div>
        </div>
      </div>
      <div style={{textAlign:"center",padding:"12px 24px",fontSize:"12px",fontWeight:600,color:"#3fb950",letterSpacing:"0.04em",opacity:0.85,marginTop:"auto"}}>© {new Date().getFullYear()} Porta · Powered by Lider Technologies LTD</div>
    </>
  );
}

export default BookingRulesPage;
