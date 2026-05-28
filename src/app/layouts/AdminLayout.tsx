import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useUser, useClerk } from "@clerk/clerk-react";
import { LayoutDashboard, Users, Building2, CalendarCog, ClipboardList, ShieldAlert, Sun, Moon } from "lucide-react";
import { useState, useEffect, createContext, useContext } from "react";

export const ThemeContext = createContext<{ dark: boolean; toggle: () => void }>({ dark: true, toggle: () => {} });
export const useTheme = () => useContext(ThemeContext);

const NAV = [
  { to: "/admin/dashboard",     label: "Dashboard",        Icon: LayoutDashboard },
  { to: "/admin/staff",         label: "Staff & Invites",  Icon: Users },
  { to: "/admin/departments",   label: "Departments",      Icon: Building2 },
  { to: "/admin/booking-rules", label: "Appointment rules",Icon: CalendarCog },
  { to: "/admin/checkin-form",  label: "Check-in form",    Icon: ClipboardList },
  { to: "/admin/security",      label: "Security",         Icon: ShieldAlert },
];

export function AdminLayout() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const [dark, setDark] = useState(() => { const s = localStorage.getItem("porta-theme"); return s ? s === "dark" : true; });
  useEffect(() => { localStorage.setItem("porta-theme", dark ? "dark" : "light"); document.documentElement.setAttribute("data-theme", dark ? "dark" : "light"); }, [dark]);
  const toggle = () => setDark(d => !d);
  const t = dark
    ? { bg:"#0d1117",sidebar:"#161b22",border:"#30363d",text:"#e6edf3",textMuted:"#8b949e",surface:"#21262d",surfaceHov:"#2d333b",accent:"#3fb950",accentBg:"rgba(63,185,80,0.12)",navHov:"#2d333b" }
    : { bg:"#f8fafc",sidebar:"#ffffff",border:"#e2e8f0",text:"#0f172a",textMuted:"#64748b",surface:"#ffffff",surfaceHov:"#f1f5f9",accent:"#16a34a",accentBg:"rgba(22,163,74,0.10)",navHov:"#f1f5f9" };
  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'DM Sans',sans-serif;background:${t.bg};color:${t.text};transition:background .2s,color .2s}
        .adl-wrap{display:flex;min-height:100vh}
        .adl-sidebar{width:220px;min-width:220px;background:${t.sidebar};border-right:1px solid ${t.border};display:flex;flex-direction:column;position:sticky;top:0;height:100vh;z-index:10}
        .adl-brand{display:flex;align-items:center;gap:10px;padding:18px 16px 14px;border-bottom:1px solid ${t.border}}
        .adl-brand-mark{width:36px;height:36px;border-radius:9px;background:${t.accent};color:#fff;font-weight:800;font-size:18px;display:flex;align-items:center;justify-content:center}
        .adl-brand-name{font-size:15px;font-weight:700;color:${t.text};line-height:1.2}
        .adl-brand-sub{font-size:11px;color:${t.textMuted};font-weight:500}
        .adl-nav{flex:1;padding:10px 8px;display:flex;flex-direction:column;gap:2px}
        .adl-nav-item{display:flex;align-items:center;gap:9px;padding:9px 10px;border-radius:8px;text-decoration:none;font-size:.85rem;font-weight:500;color:${t.textMuted};transition:background .12s,color .12s}
        .adl-nav-item:hover{background:${t.navHov};color:${t.text}}
        .adl-nav-item--on{background:${t.accentBg};color:${t.accent}!important;font-weight:600}
        .adl-footer{padding:12px 12px 14px;border-top:1px solid ${t.border};display:flex;flex-direction:column;gap:10px}
        .adl-user{display:flex;align-items:center;gap:9px}
        .adl-av{width:32px;height:32px;border-radius:50%;background:${t.surfaceHov};color:${t.textMuted};font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center}
        .adl-uname{font-size:.8rem;font-weight:600;color:${t.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px}
        .adl-urole{font-size:.7rem;color:${t.textMuted}}
        .adl-signout{width:100%;padding:8px;background:transparent;border:1px solid ${t.border};border-radius:8px;font-size:.8rem;font-weight:600;color:${t.textMuted};cursor:pointer;font-family:inherit}
        .adl-signout:hover{background:rgba(239,68,68,.08);color:#ef4444;border-color:rgba(239,68,68,.3)}
        .adl-main{flex:1;overflow-y:auto;min-width:0;background:${t.bg}}
        .adl-topbar{display:flex;justify-content:flex-end;padding:14px 32px 0;background:${t.bg}}
        .adl-toggle{display:flex;align-items:center;gap:7px;background:${t.surface};border:1px solid ${t.border};border-radius:999px;padding:6px 14px;cursor:pointer;font-size:.78rem;font-weight:600;color:${t.textMuted};font-family:inherit}
        .adl-toggle:hover{color:${t.text};background:${t.surfaceHov}}
        @media(max-width:700px){.adl-sidebar{width:56px;min-width:56px}.adl-brand-name,.adl-brand-sub,.adl-nav-lbl,.adl-uname,.adl-urole,.adl-signout{display:none}.adl-brand{justify-content:center;padding:14px 0}.adl-nav-item{justify-content:center;padding:10px 0}.adl-footer{align-items:center;padding:10px 4px 12px}.adl-topbar{padding:10px 12px 0}}

        /* â”€â”€ Shared admin page styles â”€â”€ */
        .ad-page{padding:32px;max-width:1100px}
        .ad-page-head{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;gap:16px;flex-wrap:wrap}
        .ad-title{font-size:1.4rem;font-weight:700;color:${t.text};margin-bottom:4px}
        .ad-sub{font-size:0.85rem;color:${t.textMuted}}
        .ad-card{background:${t.surface};border:1px solid ${t.border};border-radius:12px;padding:24px;margin-bottom:20px}
        .ad-card-title{font-size:0.9rem;font-weight:700;color:${t.text}}
        .ad-empty{color:${t.textMuted};font-size:0.875rem;padding:24px 0;text-align:center}
        .ad-table{width:100%;border-collapse:collapse;font-size:0.85rem}
        .ad-table th{text-align:left;padding:10px 12px;color:${t.textMuted};font-weight:600;font-size:0.75rem;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid ${t.border}}
        .ad-table td{padding:12px 12px;border-bottom:1px solid ${t.border};color:${t.text};vertical-align:middle}
        .ad-table tr:last-child td{border-bottom:none}
        .ad-table tr:hover td{background:${t.surfaceHov}}
        .ad-primary-btn{padding:9px 18px;background:${t.accent};color:#fff;border:none;border-radius:8px;font-size:0.85rem;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap}
        .ad-primary-btn:hover{opacity:0.88}
        .ad-secondary-btn{padding:9px 18px;background:transparent;border:1px solid ${t.border};border-radius:8px;font-size:0.85rem;font-weight:600;color:${t.textMuted};cursor:pointer;font-family:inherit}
        .ad-secondary-btn:hover{background:${t.surfaceHov};color:${t.text}}
        .ad-ghost-btn{padding:6px 12px;background:transparent;border:1px solid ${t.border};border-radius:6px;font-size:0.8rem;font-weight:600;color:${t.textMuted};cursor:pointer;font-family:inherit}
        .ad-ghost-btn:hover{background:${t.surfaceHov};color:${t.text}}
        .ad-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:100;padding:24px}
        .ad-modal{background:${t.sidebar};border:1px solid ${t.border};border-radius:14px;width:100%;max-width:480px;display:flex;flex-direction:column;max-height:90vh}
        .ad-modal-head{display:flex;align-items:center;justify-content:space-between;padding:20px 24px 16px;border-bottom:1px solid ${t.border}}
        .ad-modal-title{font-size:1rem;font-weight:700;color:${t.text}}
        .ad-modal-close{background:none;border:none;cursor:pointer;color:${t.textMuted};font-size:1.2rem;padding:2px 6px;border-radius:6px;font-family:inherit}
        .ad-modal-close:hover{background:${t.surfaceHov};color:${t.text}}
        .ad-modal-body{padding:20px 24px;overflow-y:auto;display:flex;flex-direction:column;gap:14px}
        .ad-modal-note{padding:12px 14px;border-radius:8px;border:1px solid ${t.border};background:${t.surfaceHov};font-size:0.82rem;color:${t.textMuted};line-height:1.5}
        .ad-modal-foot{display:flex;gap:10px;justify-content:flex-end;padding:16px 24px 20px;border-top:1px solid ${t.border}}
        .ad-field{display:flex;flex-direction:column;gap:6px}
        .ad-field-label{font-size:0.8rem;font-weight:600;color:${t.textMuted}}
        .ad-field-input{background:${t.bg};border:1px solid ${t.border};border-radius:8px;padding:9px 12px;font-size:0.875rem;color:${t.text};font-family:inherit;outline:none;transition:border-color .15s}
        .ad-field-input:focus{border-color:${t.accent}}
        .ad-field-select{background:${t.bg};border:1px solid ${t.border};border-radius:8px;padding:9px 12px;font-size:0.875rem;color:${t.text};font-family:inherit;outline:none}
        .ad-badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:999px;font-size:0.72rem;font-weight:700}
        .ad-badge--green{background:${t.accentBg};color:${t.accent}}
        .ad-badge--red{background:rgba(248,81,73,0.12);color:#f85149}
        .ad-badge--blue{background:rgba(88,166,255,0.12);color:#58a6ff}
        .ad-badge--gray{background:${t.surfaceHov};color:${t.textMuted}}
        .ad-stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:24px}
        .ad-stat{background:${t.surface};border:1px solid ${t.border};border-radius:12px;padding:20px}
        .ad-stat-label{font-size:0.75rem;font-weight:600;color:${t.textMuted};text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px}
        .ad-stat-value{font-size:1.8rem;font-weight:800;color:${t.text};line-height:1}
        .ad-stat-sub{font-size:0.75rem;color:${t.textMuted};margin-top:6px}
      `}</style>
      <div className="adl-wrap">
        <aside className="adl-sidebar">
          <div className="adl-brand"><img src="/Porta.png" alt="Porta" style={{height:"26px",width:"auto"}} /><div><div className="adl-brand-sub">Admin panel</div></div></div>
          <nav className="adl-nav">{NAV.map(({ to, label, Icon }) => (<NavLink key={to} to={to} className={({ isActive }) => "adl-nav-item" + (isActive ? " adl-nav-item--on" : "")}><Icon size={17} strokeWidth={2} /><span className="adl-nav-lbl">{label}</span></NavLink>))}</nav>
          <div className="adl-footer"><div className="adl-user"><div className="adl-av">{user?.firstName?.[0]?.toUpperCase() ?? "A"}</div><div><div className="adl-uname">{user?.firstName} {user?.lastName}</div><div className="adl-urole">Admin</div></div></div><button className="adl-signout" onClick={() => { signOut(); navigate("/"); }}>Sign out</button></div>
        </aside>
        <main className="adl-main"><div className="adl-topbar"><button className="adl-toggle" onClick={toggle}>{dark ? <><Sun size={14}/><span>Light mode</span></> : <><Moon size={14}/><span>Dark mode</span></>}</button></div><Outlet context={{ dark }} /></main>
      </div>
    </ThemeContext.Provider>
  );
}





