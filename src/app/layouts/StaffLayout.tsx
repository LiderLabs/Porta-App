import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useUser, useClerk } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
// @ts-ignore
import { api } from "../../../convex/_generated/api";
import { useState, useEffect } from "react";
import { useHideOverlay } from "../../App";
import { Sun, Moon } from "lucide-react";

export function AppLayout() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const location = useLocation();
  const convexUser = useQuery(api.users.getByClerkId, user?.id ? { clerkUserId: user.id } : "skip");
  const displayName = convexUser?.name ?? user?.fullName ?? user?.firstName ?? "";
  const avatarInitial = displayName?.[0]?.toUpperCase() ?? "?";
  const unreadCount = useQuery(api.directMessages.unreadCount, user?.id ? { clerkUserId: user.id } : "skip") ?? 0;

  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"dark"|"light">(() =>
    (localStorage.getItem("porta-theme") as "dark"|"light") ?? "dark"
  );
  const orgSettings = useQuery(api.orgSettings.get);
  const myOrg = useQuery(api.orgSettings.getMyOrg);
  const orgName = myOrg?.name || orgSettings?.branding?.appName || "Porta";

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("porta-theme", theme);
  }, [theme]);
  const { hide } = useHideOverlay();
  useEffect(() => { const t = setTimeout(hide, 50); return () => clearTimeout(t); }, []);

  const navItems = [
    {
      path: "/staff/home",
      label: "Home",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ),
    },
    {
      path: "/staff/schedule",
      label: "My Schedule",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      ),
    },    {
      path: "/staff/messages",
      label: "Messages",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      ),
    },
  ];

  return (
    <div className="app-layout">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root[data-theme="dark"] {
          --bg: #0d1117;
          --sidebar: #161b22;
          --border: #30363d;
          --text: #e6edf3;
          --muted: #8b949e;
          --surface: #21262d;
          --hov: #2d333b;
          --accent: #3fb950;
          --accent-bg: rgba(63,185,80,0.12);
          --danger: #f85149;
          --blue: #58a6ff;
          --orange: #d29922;
        }
        :root[data-theme="light"] {
          --bg: #f8fafc;
          --sidebar: #ffffff;
          --border: #e2e8f0;
          --text: #0f172a;
          --muted: #64748b;
          --surface: #ffffff;
          --hov: #f1f5f9;
          --accent: #16a34a;
          --accent-bg: rgba(22,163,74,0.10);
          --danger: #dc2626;
          --blue: #2563eb;
          --orange: #d97706;
        }

        body {
          font-family: 'DM Sans', sans-serif;
          background: var(--bg);
          color: var(--text);
        }

        .app-layout { display: flex; height: 100vh; overflow: hidden; }

        /* -- Sidebar -- */
        .sidebar {
          width: 220px; min-width: 220px;
          background: var(--sidebar);
          border-right: 1px solid var(--border);
          display: flex; flex-direction: column;
          position: sticky; top: 0; height: 100vh;
          transition: background 0.2s;
        }
        .sidebar-brand {
          display: flex; align-items: center; gap: 10px;
          padding: 18px 16px 14px;
          border-bottom: 1px solid var(--border);
        }
        .brand-mark {
          width: 36px; height: 36px; border-radius: 9px;
          background: var(--accent); color: #fff;
          font-weight: 800; font-size: 18px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .brand-name  { font-size: 15px; font-weight: 700; color: var(--text); }
        .brand-pill { font-size: .65rem; font-weight: 700; color: var(--accent); background: var(--accent-bg); padding: 2px 8px; border-radius: 20px; margin-left: 4px; letter-spacing: .04em; text-transform: uppercase; }
        .brand-sub   { font-size: 11px; color: var(--muted); }

        .sidebar-nav {
          flex: 1; padding: 10px 8px;
          display: flex; flex-direction: column; gap: 2px;
        }
        .nav-item {
          display: flex; align-items: center; gap: 9px;
          padding: 9px 10px; border-radius: 8px;
          background: none; border: none;
          font-size: 0.85rem; font-weight: 500;
          color: var(--muted); cursor: pointer;
          font-family: inherit; width: 100%; text-align: left;
          transition: background .12s, color .12s;
        }
        .nav-item:hover  { background: var(--hov); color: var(--text); }
        .nav-item.active { background: var(--accent-bg); color: var(--accent); font-weight: 600; }

        .sidebar-footer {
          padding: 12px 12px 14px;
          border-top: 1px solid var(--border);
          display: flex; flex-direction: column; gap: 10px;
        }
        .user-info   { display: flex; align-items: center; gap: 9px; }
        .user-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          background: var(--hov); color: var(--muted);
          font-weight: 700; font-size: 13px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .user-name { font-size: 0.8rem; font-weight: 600; color: var(--text); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; }
        .user-role { font-size: 0.7rem; color: var(--muted); display: block; }

        .theme-toggle {
          display: flex; align-items: center; gap: 7px;
          background: none; border: 1px solid var(--border);
          border-radius: 8px; padding: 7px 12px;
          font-size: 0.78rem; font-weight: 600;
          color: var(--muted); cursor: pointer;
          font-family: inherit; width: 100%;
          transition: background .12s, color .12s;
        }
        .theme-toggle:hover { background: var(--hov); color: var(--text); }

        .logout-btn {
          width: 100%; padding: 8px;
          background: transparent; border: 1px solid var(--border);
          border-radius: 8px; font-size: 0.8rem; font-weight: 600;
          color: var(--muted); cursor: pointer; font-family: inherit;
          transition: all .12s;
        }
        .logout-btn:hover {
          background: rgba(239,68,68,0.08);
          color: #ef4444;
          border-color: rgba(239,68,68,0.3);
        }

        /* -- Main � NO top header bar -- */
        .app-main { flex: 1; overflow-y: auto; min-width: 0; background: var(--bg); display: flex; flex-direction: column; }
        .app-content { flex: 1; display: flex; flex-direction: column; min-height: 0; } }
        .staff-footer-bar { padding: 20px 24px; font-size: 11px; color: var(--accent, #3fb950); text-align: center; background: transparent; letter-spacing: 0.04em; font-weight: 500; width: 100%; display: block; }
        .staff-topbar { display:flex; justify-content:flex-end; align-items:center; padding:12px 24px 0; background:var(--bg); }
        .staff-topbar-toggle { display:flex; align-items:center; gap:7px; background:var(--surface); border:1px solid var(--border); border-radius:999px; padding:6px 14px; cursor:pointer; font-size:.78rem; font-weight:600; color:var(--muted); font-family:inherit; }
        .staff-topbar-toggle:hover { color:var(--text); background:var(--hov); }

        /* Loading */
        .page-loading {
          display: flex; align-items: center; justify-content: center;
          height: 100vh; color: var(--muted);
          font-family: 'DM Sans', sans-serif;
        }

        /* Responsive: slim sidebar on mobile */
        @media (max-width: 768px) {
          .app-layout { display: block; }
          .sidebar { display: none; }
          .mobile-header { display: flex !important; }
          .app-main { width: 100%; max-width: 100%; }
        }
        .mobile-header {
          display: none; align-items: center; justify-content: space-between;
          padding: 12px 16px; background: var(--sidebar);
          border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 10;
        }
        .hamburger-btn {
          display: flex; align-items: center; justify-content: center;
          background: none; border: 1px solid var(--border); border-radius: 8px;
          padding: 7px; cursor: pointer; color: var(--muted);
        }
        .hamburger-btn:hover { background: var(--hov); color: var(--text); }
        .drawer { position: fixed; inset: 0; z-index: 200; display: flex; }
        .drawer-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.55); }
        .drawer-panel {
          position: relative; width: 260px; background: var(--sidebar);
          border-right: 1px solid var(--border); display: flex;
          flex-direction: column; height: 100vh; animation: slideIn .2s ease;
        }
        @keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }

      `}</style>

      {/* Sidebar */}
      {menuOpen && (
          <div className="drawer">
            <div className="drawer-overlay" onClick={() => setMenuOpen(false)} />
            <div className="drawer-panel">
              <div className="sidebar-brand" style={{padding:"18px 16px 14px",borderBottom:"1px solid var(--border)"}}>
                <img src="/Porta.png" alt="Porta" style={{height:"26px",width:"auto"}} />
                <span className="brand-pill">Staff</span>
                <button onClick={() => setMenuOpen(false)} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:"18px",lineHeight:1,padding:"0 4px"}}>&#x2715;</button>
              </div>
              <nav className="sidebar-nav">
          <div style={{fontSize:"11px",fontWeight:600,color:"#3fb950",padding:"4px 16px 10px",letterSpacing:"0.03em",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",borderBottom:"1px solid var(--border)"}}>{orgName}</div>
                {navItems.map(item => (
                  <button key={item.path} className={`nav-item${location.pathname === item.path ? " active" : ""}`} onClick={() => { navigate(item.path); setMenuOpen(false); }}>
                    {item.icon}<span className="nav-label">{item.label}</span>
                    {item.label === "Messages" && unreadCount > 0 && (<span style={{marginLeft:"auto",minWidth:18,height:18,borderRadius:9,background:"var(--accent)",color:"#fff",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 5px"}}>{unreadCount}</span>)}
                  </button>
                ))}
              </nav>
              <div className="sidebar-footer">
                <div className="user-info"><div className="user-avatar">{avatarInitial}</div><div><span className="user-name">{displayName}</span><span className="user-role">Staff</span></div></div>
                <button className="logout-btn" onClick={async () => { await signOut(); navigate("/login"); }}>Sign out</button>
              </div>
            </div>
          </div>
        )}
        <div className="mobile-header">
          <button className="hamburger-btn" onClick={() => setMenuOpen(true)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>
          <img src="/Porta.png" alt="Porta" style={{height:"24px",width:"auto"}} />
          <div style={{width:"34px"}} />
        </div>
        <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="/Porta.png" alt="Porta" style={{height:"26px",width:"auto"}} />
          <span className="brand-pill">Staff</span>
        </div>
          <div style={{fontSize:"11px",fontWeight:600,color:"#3fb950",padding:"4px 16px 10px",letterSpacing:"0.03em",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",borderBottom:"1px solid var(--border)"}}>{orgName}</div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.path}
              className={`nav-item${location.pathname === item.path ? " active" : ""}`}
              onClick={() => navigate(item.path)}
            >
              {item.icon}
              <span className="nav-label">{item.label}</span>
              {item.label === "Messages" && unreadCount > 0 && (
                <span style={{marginLeft:"auto",minWidth:18,height:18,borderRadius:9,background:"var(--accent)",color:"#fff",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 5px"}}>
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {avatarInitial}
            </div>
            <div>
              <span className="user-name">{displayName}</span>
              <span className="user-role">Staff</span>
            </div>
          </div>









          <button className="logout-btn" onClick={async () => { await signOut(); navigate("/login"); }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main � content fills full width, no header bar */}
      <main className="app-main">
        <div className="staff-topbar">
          <button className="staff-topbar-toggle" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}>
            {theme === "dark"
              ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg><span>Light mode</span></>
              : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg><span>Dark mode</span></>}
          </button>
        </div>
        <div className="app-content">
          <Outlet />

        </div>
      <div style={{textAlign:"center",padding:"12px 24px",fontSize:"12px",fontWeight:600,color:"#3fb950",letterSpacing:"0.04em",opacity:0.85,marginTop:"auto"}}>© {new Date().getFullYear()} Porta · Powered by Lider Technologies LTD</div>
      </main>
    </div>
  );
}















