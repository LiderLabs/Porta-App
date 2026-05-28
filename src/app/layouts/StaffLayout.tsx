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

  const [theme, setTheme] = useState<"dark"|"light">(() =>
    (localStorage.getItem("porta-theme") as "dark"|"light") ?? "dark"
  );

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

        /* -- Main — NO top header bar -- */
        .app-main { flex: 1; overflow-y: auto; min-width: 0; background: var(--bg); display: flex; flex-direction: column; }
        .app-content { flex: 1; display: flex; flex-direction: column; min-height: 0; }

        /* Loading */
        .page-loading {
          display: flex; align-items: center; justify-content: center;
          height: 100vh; color: var(--muted);
          font-family: 'DM Sans', sans-serif;
        }

        /* Responsive: slim sidebar on mobile */
        @media (max-width: 700px) {
          .sidebar { width: 56px; min-width: 56px; }
          .brand-name, .brand-sub, .nav-label,
          .user-name, .user-role, .logout-btn, .theme-toggle { display: none; }
          .sidebar-brand { justify-content: center; padding: 14px 0; }
          .nav-item { justify-content: center; padding: 10px 0; }
          .sidebar-footer { align-items: center; padding: 10px 4px 12px; }
        }
      `}</style>

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="/Porta.png" alt="Porta" style={{height:"26px",width:"auto"}} />
        </div>

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

          {/* Theme toggle in sidebar */}
          <button className="theme-toggle" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}>
            {theme === "dark"
              ? <><Sun size={14} /><span>Light mode</span></>
              : <><Moon size={14} /><span>Dark mode</span></>
            }
          </button>

          <button className="logout-btn" onClick={async () => { await signOut(); navigate("/login"); }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main — content fills full width, no header bar */}
      <main className="app-main">
        <div className="app-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}








