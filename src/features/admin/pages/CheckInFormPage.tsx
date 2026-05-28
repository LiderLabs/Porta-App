import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
// @ts-ignore
import { api } from "../../../../convex/_generated/api";
import { useTheme } from "../../../app/layouts/AdminLayout";
import {
  Check, GripVertical, Plus, Trash2, Eye, EyeOff,
  User, Phone, Mail, Building2, Target, CreditCard,
  Luggage, Car, FileText, Hash, ToggleLeft, ChevronDown,
} from "lucide-react";

const SYSTEM_FIELDS = [
  { key: "fullName",     label: "Full name",            type: "text",     icon: "User",       system: true  },
  { key: "phone",        label: "Phone number",         type: "tel",      icon: "Phone",      system: true  },
  { key: "email",        label: "Email address",        type: "email",    icon: "Mail",       system: false },
  { key: "company",      label: "Company / org",        type: "text",     icon: "Building2",  system: false },
  { key: "hostId",       label: "Who are you visiting?",type: "select",   icon: "User",       system: true  },
  { key: "purpose",      label: "Purpose of visit",     type: "select",   icon: "Target",     system: false },
  { key: "idType",       label: "ID type",              type: "select",   icon: "CreditCard", system: false },
  { key: "idNumber",     label: "ID number",            type: "text",     icon: "Hash",       system: false },
  { key: "luggage",      label: "Luggage / items",      type: "text",     icon: "Luggage",    system: false },
  { key: "vehiclePlate", label: "Vehicle plate",        type: "text",     icon: "Car",        system: false },
  { key: "notes",        label: "Additional notes",     type: "textarea", icon: "FileText",   system: false },
];

const FIELD_ICONS: Record<string, React.ElementType> = {
  User, Phone, Mail, Building2, Target, CreditCard,
  Luggage, Car, FileText, Hash, ToggleLeft,
};

type FieldCfg = {
  key: string; label: string; type: string;
  enabled: boolean; required: boolean;
  custom?: boolean; icon?: string; options?: string[];
};

function buildDefaults(): FieldCfg[] {
  return SYSTEM_FIELDS.map((f) => ({
    key: f.key, label: f.label, type: f.type,
    enabled: ["fullName", "phone", "hostId", "purpose"].includes(f.key),
    required: ["fullName", "hostId"].includes(f.key),
    custom: false, icon: f.icon,
  }));
}

function Toggle({ on, onChange, accent }: { on: boolean; onChange: () => void; accent: string }) {
  return (
    <button onClick={onChange} role="switch" aria-checked={on} style={{
      width: 40, height: 22, borderRadius: 11, border: "none",
      background: on ? accent : "#4b5563", position: "relative",
      cursor: "pointer", transition: "background .18s", flexShrink: 0,
    }}>
      <span style={{
        position: "absolute", top: 3, left: on ? 21 : 3,
        width: 16, height: 16, borderRadius: "50%", background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,.3)", transition: "left .16s", display: "block",
      }}/>
    </button>
  );
}

function FieldTypeTag({ type, t }: { type: string; t: any }) {
  const labels: Record<string, string> = {
    text: "Text", tel: "Phone", email: "Email",
    select: "Dropdown", textarea: "Long text", checkbox: "Checkbox",
  };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20,
      border: `1px solid ${t.border}`, color: t.muted, background: t.faint,
      textTransform: "uppercase" as const, letterSpacing: "0.06em",
    }}>
      {labels[type] ?? type}
    </span>
  );
}

export function CheckInFormPage() {
  const { dark } = useTheme();
  const rawSettings = useQuery(api.checkInSettings.get);
  const saveSettings = useMutation(api.checkInSettings.save);

  const t = dark ? {
    bg: "#0d1117", card: "#161b22", border: "#30363d", text: "#e6edf3",
    muted: "#8b949e", faint: "#21262d", hov: "#2d333b", input: "#21262d",
    inputBorder: "#30363d", accent: "#3fb950", accentBg: "rgba(63,185,80,0.10)",
    danger: "#f85149", dangerBg: "rgba(248,81,73,0.08)",
    surface: "#21262d", surfaceBorder: "#30363d", disabled: "#1c2128",
  } : {
    bg: "#f8fafc", card: "#ffffff", border: "#e2e8f0", text: "#0f172a",
    muted: "#64748b", faint: "#f1f5f9", hov: "#f1f5f9", input: "#ffffff",
    inputBorder: "#d1d5db", accent: "#16a34a", accentBg: "rgba(22,163,74,0.08)",
    danger: "#dc2626", dangerBg: "rgba(220,38,38,0.08)",
    surface: "#f8fafc", surfaceBorder: "#e2e8f0", disabled: "#f1f5f9",
  };

  const [fields, setFields] = useState<FieldCfg[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [addLabel, setAddLabel] = useState("");
  const [addType, setAddType]   = useState("text");
  const [showAdd, setShowAdd]   = useState(false);
  const [preview, setPreview]   = useState(true);

  const dragIdx  = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);

  if (rawSettings !== undefined && fields === null) {
    if (rawSettings && rawSettings.fields && rawSettings.fields.length > 0) {
      const dbKeys = new Set(rawSettings.fields.map((f: any) => f.key));
      const merged = [...rawSettings.fields];
      for (const sf of SYSTEM_FIELDS) {
        if (!dbKeys.has(sf.key)) {
          merged.push({ key: sf.key, label: sf.label, type: sf.type, enabled: false, required: false, custom: false, icon: sf.icon });
        }
      }
      setFields(merged as FieldCfg[]);
    } else {
      setFields(buildDefaults());
    }
  }

  const live = fields ?? buildDefaults();
  const isDirty = fields !== null;

  const update = (idx: number, patch: Partial<FieldCfg>) =>
    setFields(prev => (prev ?? buildDefaults()).map((f, i) => i === idx ? { ...f, ...patch } : f));

  const remove = (idx: number) =>
    setFields(prev => (prev ?? buildDefaults()).filter((_, i) => i !== idx));

  const addCustom = () => {
    if (!addLabel.trim()) return;
    const key = "custom_" + Date.now();
    setFields(prev => [...(prev ?? buildDefaults()), {
      key, label: addLabel.trim(), type: addType,
      enabled: true, required: false, custom: true, icon: "FileText",
    }]);
    setAddLabel(""); setAddType("text"); setShowAdd(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings({ fields: live, updatedAt: Date.now() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  };

  const onDragStart = (i: number) => { dragIdx.current = i; };
  const onDragEnter = (i: number) => { dragOver.current = i; };
  const onDragEnd = () => {
    if (dragIdx.current === null || dragOver.current === null || dragIdx.current === dragOver.current) {
      dragIdx.current = null; dragOver.current = null; return;
    }
    setFields(prev => {
      const arr = [...(prev ?? buildDefaults())];
      const [moved] = arr.splice(dragIdx.current!, 1);
      arr.splice(dragOver.current!, 0, moved);
      dragIdx.current = null; dragOver.current = null;
      return arr;
    });
  };

  const enabledFields = live.filter(f => f.enabled);

  if (rawSettings === undefined) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: t.muted, fontFamily: "'DM Sans',sans-serif" }}>
      Loading...
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
        .cif-root{font-family:'DM Sans',sans-serif;padding:28px 32px 48px;background:${t.bg};min-height:calc(100vh - 52px);color:${t.text};}
        .cif-hdr{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:28px;}
        .cif-title{font-size:1.55rem;font-weight:800;letter-spacing:-0.02em;color:${t.text};margin-bottom:3px;}
        .cif-sub{font-size:0.875rem;color:${t.muted};}
        .cif-actions{display:flex;gap:8px;align-items:center;}
        .cif-btn-pri{background:${t.accent};color:#fff;border:none;border-radius:8px;padding:9px 20px;font-size:0.875rem;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px;transition:filter .15s;}
        .cif-btn-pri:hover:not(:disabled){filter:brightness(1.1);}
        .cif-btn-pri:disabled{opacity:0.5;cursor:not-allowed;}
        .cif-btn-sec{background:transparent;color:${t.muted};border:1px solid ${t.border};border-radius:8px;padding:9px 16px;font-size:0.875rem;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px;transition:all .15s;}
        .cif-btn-sec:hover{background:${t.hov};color:${t.text};}
        .cif-body{display:grid;grid-template-columns:1fr 360px;gap:20px;align-items:start;}
        @media(max-width:900px){.cif-body{grid-template-columns:1fr;}}
        .cif-panel{background:${t.card};border:1px solid ${t.border};border-radius:14px;overflow:hidden;}
        .cif-panel-hdr{padding:16px 20px;border-bottom:1px solid ${t.border};display:flex;align-items:center;justify-content:space-between;}
        .cif-panel-title{font-size:0.8rem;font-weight:700;color:${t.muted};text-transform:uppercase;letter-spacing:0.07em;}
        .cif-field-row{display:flex;align-items:center;gap:12px;padding:13px 16px;border-bottom:1px solid ${t.border};transition:background .12s;}
        .cif-field-row:last-child{border-bottom:none;}
        .cif-field-row--disabled{background:${t.disabled};opacity:0.6;}
        .cif-field-row:hover{background:${t.hov};}
        .cif-drag{color:${t.muted};cursor:grab;display:flex;align-items:center;flex-shrink:0;}
        .cif-drag:active{cursor:grabbing;}
        .cif-icon{width:32px;height:32px;border-radius:8px;background:${t.faint};border:1px solid ${t.border};display:flex;align-items:center;justify-content:center;color:${t.muted};flex-shrink:0;}
        .cif-field-info{flex:1;min-width:0;}
        .cif-field-label{font-size:0.875rem;font-weight:600;color:${t.text};display:flex;align-items:center;gap:6px;}
        .cif-field-sub{font-size:0.75rem;color:${t.muted};margin-top:2px;}
        .cif-badge-system{font-size:9px;font-weight:700;padding:2px 6px;border-radius:20px;background:${t.accentBg};color:${t.accent};border:1px solid rgba(63,185,80,0.2);text-transform:uppercase;letter-spacing:0.06em;}
        .cif-badge-custom{font-size:9px;font-weight:700;padding:2px 6px;border-radius:20px;background:rgba(139,92,246,0.1);color:#a78bfa;border:1px solid rgba(139,92,246,0.2);text-transform:uppercase;letter-spacing:0.06em;}
        .cif-req-btn{font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;border:1px solid ${t.border};cursor:pointer;background:transparent;font-family:inherit;transition:all .15s;white-space:nowrap;}
        .cif-req-btn--on{border-color:${t.danger};color:${t.danger};background:${t.dangerBg};}
        .cif-req-btn--off{color:${t.muted};}
        .cif-req-btn--off:hover{border-color:${t.muted};color:${t.text};}
        .cif-del-btn{color:${t.muted};background:none;border:none;cursor:pointer;display:flex;align-items:center;padding:4px;border-radius:6px;transition:all .15s;flex-shrink:0;}
        .cif-del-btn:hover{color:${t.danger};background:${t.dangerBg};}
        .cif-add-box{padding:16px 20px;border-top:1px solid ${t.border};}
        .cif-add-trigger{width:100%;padding:10px 14px;background:${t.faint};border:1px dashed ${t.border};border-radius:10px;color:${t.muted};font-size:0.875rem;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:7px;transition:all .15s;}
        .cif-add-trigger:hover{border-color:${t.accent};color:${t.accent};background:${t.accentBg};}
        .cif-add-form{display:flex;flex-direction:column;gap:10px;}
        .cif-input{padding:9px 12px;background:${t.input};border:1px solid ${t.inputBorder};border-radius:8px;font-size:0.875rem;font-family:inherit;color:${t.text};outline:none;width:100%;box-sizing:border-box;}
        .cif-input:focus{border-color:${t.accent};}
        .cif-input::placeholder{color:${t.muted};}
        .cif-select{padding:9px 12px;background:${t.input};border:1px solid ${t.inputBorder};border-radius:8px;font-size:0.875rem;font-family:inherit;color:${t.text};outline:none;width:100%;appearance:none;cursor:pointer;}
        .cif-select:focus{border-color:${t.accent};}
        .cif-add-actions{display:flex;gap:8px;justify-content:flex-end;}
        .cif-preview{background:${t.card};border:1px solid ${t.border};border-radius:14px;overflow:hidden;position:sticky;top:20px;}
        .cif-prev-hdr{padding:16px 20px;border-bottom:1px solid ${t.border};}
        .cif-prev-title{font-size:0.8rem;font-weight:700;color:${t.muted};text-transform:uppercase;letter-spacing:0.07em;margin-bottom:2px;}
        .cif-prev-sub{font-size:0.75rem;color:${t.muted};}
        .cif-prev-body{padding:20px;display:flex;flex-direction:column;gap:14px;}
        .cif-prev-field{display:flex;flex-direction:column;gap:5px;}
        .cif-prev-label{font-size:12px;font-weight:600;color:${t.muted};display:flex;align-items:center;gap:4px;}
        .cif-prev-req{color:${t.danger};}
        .cif-prev-input{padding:9px 12px;background:${t.faint};border:1px solid ${t.border};border-radius:8px;font-size:0.875rem;color:${t.muted};font-family:inherit;width:100%;box-sizing:border-box;}
        .cif-prev-select{padding:9px 12px;background:${t.faint};border:1px solid ${t.border};border-radius:8px;font-size:0.875rem;color:${t.muted};font-family:inherit;width:100%;appearance:none;}
        .cif-prev-empty{padding:32px 20px;text-align:center;color:${t.muted};font-size:0.875rem;}
        .cif-empty{padding:40px 20px;text-align:center;}
        .cif-empty-icon{font-size:36px;margin-bottom:10px;}
        .cif-empty-text{font-size:0.875rem;color:${t.muted};}
      `}</style>

      <div className="cif-root">
        <div className="cif-hdr">
          <div>
            <h1 className="cif-title">Check-in form</h1>
            <p className="cif-sub">Configure which fields visitors fill in when checking in</p>
          </div>
          <div className="cif-actions">
            <button className="cif-btn-sec" onClick={() => setPreview(p => !p)}>
              {preview ? <><EyeOff size={14}/>Hide preview</> : <><Eye size={14}/>Preview</>}
            </button>
            <button className="cif-btn-pri" disabled={saving || !isDirty} onClick={handleSave}>
              {saved ? <><Check size={14}/>Saved</> : saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>

        <div className="cif-body" style={{ gridTemplateColumns: preview ? undefined : "1fr" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="cif-panel">
              <div className="cif-panel-hdr">
                <span className="cif-panel-title">Active fields</span>
                <span style={{ fontSize: 12, color: t.muted }}>{enabledFields.length} field{enabledFields.length !== 1 ? "s" : ""} shown to visitors</span>
              </div>
              {enabledFields.length === 0 ? (
                <div className="cif-empty">
                  <div className="cif-empty-icon">??</div>
                  <div className="cif-empty-text">No fields enabled ? turn some on below</div>
                </div>
              ) : (
                live.map((field, idx) => {
                  if (!field.enabled) return null;
                  const IconComp = FIELD_ICONS[field.icon ?? "FileText"] ?? FileText;
                  return (
                    <div key={field.key} className="cif-field-row" draggable
                      onDragStart={() => onDragStart(idx)} onDragEnter={() => onDragEnter(idx)}
                      onDragEnd={onDragEnd} onDragOver={e => e.preventDefault()}>
                      <span className="cif-drag"><GripVertical size={16}/></span>
                      <div className="cif-icon"><IconComp size={14}/></div>
                      <div className="cif-field-info">
                        <div className="cif-field-label">
                          {field.label}
                          {!field.custom && <span className="cif-badge-system">system</span>}
                          {field.custom  && <span className="cif-badge-custom">custom</span>}
                        </div>
                        <div className="cif-field-sub"><FieldTypeTag type={field.type} t={t}/></div>
                      </div>
                      <button className={`cif-req-btn ${field.required ? "cif-req-btn--on" : "cif-req-btn--off"}`}
                        onClick={() => update(idx, { required: !field.required })}>
                        {field.required ? "Required" : "Optional"}
                      </button>
                      <Toggle on={true} onChange={() => update(idx, { enabled: false, required: false })} accent={t.accent}/>
                      {field.custom && (
                        <button className="cif-del-btn" onClick={() => remove(idx)} title="Remove field"><Trash2 size={14}/></button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {live.some(f => !f.enabled) && (
              <div className="cif-panel">
                <div className="cif-panel-hdr">
                  <span className="cif-panel-title">Available fields</span>
                  <span style={{ fontSize: 12, color: t.muted }}>Toggle to add to form</span>
                </div>
                {live.map((field, idx) => {
                  if (field.enabled) return null;
                  const IconComp = FIELD_ICONS[field.icon ?? "FileText"] ?? FileText;
                  return (
                    <div key={field.key} className="cif-field-row cif-field-row--disabled">
                      <span style={{ width: 16, flexShrink: 0 }}/>
                      <div className="cif-icon"><IconComp size={14}/></div>
                      <div className="cif-field-info">
                        <div className="cif-field-label">
                          {field.label}
                          {!field.custom && <span className="cif-badge-system">system</span>}
                          {field.custom  && <span className="cif-badge-custom">custom</span>}
                        </div>
                        <div className="cif-field-sub"><FieldTypeTag type={field.type} t={t}/></div>
                      </div>
                      <Toggle on={false} onChange={() => update(idx, { enabled: true })} accent={t.accent}/>
                      {field.custom && (
                        <button className="cif-del-btn" onClick={() => remove(idx)} title="Remove field"><Trash2 size={14}/></button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="cif-panel">
              <div className="cif-add-box">
                {!showAdd ? (
                  <button className="cif-add-trigger" onClick={() => setShowAdd(true)}>
                    <Plus size={15}/>Add custom field
                  </button>
                ) : (
                  <div className="cif-add-form">
                    <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 2 }}>New custom field</div>
                    <input className="cif-input" placeholder="Field label (e.g. Luggage description)"
                      value={addLabel} onChange={e => setAddLabel(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addCustom()} autoFocus/>
                    <div style={{ position: "relative" }}>
                      <select className="cif-select" value={addType} onChange={e => setAddType(e.target.value)}>
                        <option value="text">Text input</option>
                        <option value="textarea">Long text</option>
                        <option value="tel">Phone number</option>
                        <option value="email">Email</option>
                        <option value="select">Dropdown</option>
                        <option value="checkbox">Checkbox</option>
                      </select>
                      <ChevronDown size={13} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: t.muted, pointerEvents: "none" }}/>
                    </div>
                    <div className="cif-add-actions">
                      <button className="cif-btn-sec" onClick={() => { setShowAdd(false); setAddLabel(""); setAddType("text"); }}>Cancel</button>
                      <button className="cif-btn-pri" disabled={!addLabel.trim()} onClick={addCustom}><Plus size={14}/>Add field</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {preview && (
            <div className="cif-preview">
              <div className="cif-prev-hdr">
                <div className="cif-prev-title">Live preview</div>
                <div className="cif-prev-sub">How the form looks to visitors</div>
              </div>
              {enabledFields.length === 0 ? (
                <div className="cif-prev-empty">Enable some fields to see the preview</div>
              ) : (
                <div className="cif-prev-body">
                  {enabledFields.map(field => (
                    <div key={field.key} className="cif-prev-field">
                      <label className="cif-prev-label">
                        {field.label}{field.required && <span className="cif-prev-req">*</span>}
                      </label>
                      {field.type === "textarea" ? (
                        <textarea className="cif-prev-input" rows={3} placeholder={`Enter ${field.label.toLowerCase()}...`} disabled style={{ resize: "none", fontFamily: "inherit" }}/>
                      ) : field.type === "select" ? (
                        <select className="cif-prev-select" disabled><option>{`Select ${field.label.toLowerCase()}...`}</option></select>
                      ) : field.type === "checkbox" ? (
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "not-allowed", opacity: 0.6 }}>
                          <input type="checkbox" disabled/>
                          <span style={{ fontSize: "0.875rem", color: t.text }}>{field.label}</span>
                        </label>
                      ) : (
                        <input className="cif-prev-input" type={field.type} placeholder={`Enter ${field.label.toLowerCase()}...`} disabled/>
                      )}
                    </div>
                  ))}
                  <button disabled style={{
                    marginTop: 6, width: "100%", padding: "11px",
                    background: t.accent, color: "#fff", border: "none",
                    borderRadius: 9, fontSize: "0.9rem", fontWeight: 700,
                    fontFamily: "inherit", opacity: 0.7, cursor: "not-allowed",
                  }}>Check in</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div style={{textAlign:"center",padding:"12px 24px",fontSize:"12px",fontWeight:600,color:"#3fb950",letterSpacing:"0.04em",opacity:0.85,marginTop:"auto"}}>© {new Date().getFullYear()} Porta · Powered by Lider Technologies LTD</div>
    </>
  );
}



export default CheckInFormPage;
