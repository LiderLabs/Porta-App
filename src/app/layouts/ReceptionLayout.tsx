import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useUser, useClerk } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState, useEffect } from "react";
import { useHideOverlay } from "../../App";

export function AppLayout() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const convexUser = useQuery(api.users.getByClerkId, user?.id ? { clerkUserId: user.id } : "skip");
  const displayName = convexUser?.name ?? user?.fullName ?? user?.firstName ?? "";
  const avatarInitial = displayName?.[0]?.toUpperCase() ?? "?";
  const unreadCount = useQuery(api.directMessages.unreadCount, user?.id ? { clerkUserId: user.id } : "skip") ?? 0;
  const [menuOpen, setMenuOpen] = useState(false);
  const [popOpen, setPopOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [theme, setTheme] = useState<"dark"|"light">(() => (localStorage.getItem("porta-theme") as "dark"|"light") ?? "dark");
  const orgSettings = useQuery(api.orgSettings.get);
  const myOrg = useQuery(api.orgSettings.getMyOrg);
  const orgName = myOrg?.name || orgSettings?.branding?.appName || "Porta";
  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); localStorage.setItem("porta-theme", theme); }, [theme]);
  const { hide } = useHideOverlay();
  useEffect(() => { const t = setTimeout(hide, 50); return () => clearTimeout(t); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) navigate("/reception/visitors?search=" + encodeURIComponent(search.trim()));
  };

  return (
    <div className="app-layout">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root[data-theme="dark"] { --bg:#0d1117; --sidebar:#161b22; --border:#30363d; --text:#e6edf3; --muted:#8b949e; --surface:#21262d; --hov:#2d333b; --accent:#3fb950; --accent-bg:rgba(63,185,80,0.12); --danger:#f85149; --blue:#58a6ff; }
        :root[data-theme="light"] { --bg:#f8fafc; --sidebar:#ffffff; --border:#e2e8f0; --text:#0f172a; --muted:#64748b; --surface:#ffffff; --hov:#f1f5f9; --accent:#16a34a; --accent-bg:rgba(22,163,74,0.10); --danger:#dc2626; --blue:#2563eb; }
        body { font-family:'Plus Jakarta Sans',sans-serif; background:var(--bg); color:var(--text); }
        .app-layout { display:flex; height:100vh; overflow:hidden; }
        .sidebar { width:220px; min-width:220px; background:var(--sidebar); border-right:1px solid var(--border); display:flex; flex-direction:column; position:sticky; top:0; height:100vh; }
        .sidebar-brand { display:flex; align-items:center; gap:10px; padding:18px 16px 14px; border-bottom:1px solid var(--border); }
        .brand-mark { width:36px; height:36px; border-radius:9px; background:var(--accent); color:#fff; font-weight:800; font-size:18px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .brand-name { font-size:15px; font-weight:700; color:var(--text); }
        .brand-pill { font-size:.65rem; font-weight:700; color:var(--accent); background:var(--accent-bg); padding:2px 8px; border-radius:20px; margin-left:4px; letter-spacing:.04em; text-transform:uppercase; }
        .sidebar-nav { flex:1; padding:10px 8px; display:flex; flex-direction:column; gap:2px; }
        .nav-item { display:flex; align-items:center; gap:9px; padding:9px 10px; border-radius:8px; text-decoration:none; font-size:.85rem; font-weight:500; color:var(--muted); transition:background .12s,color .12s; }
        .nav-item:hover { background:var(--hov); color:var(--text); }
        .nav-item.active { background:var(--accent-bg); color:var(--accent); font-weight:600; }
        .sidebar-footer { padding:12px 12px 14px; border-top:1px solid var(--border); display:flex; flex-direction:column; gap:10px; }
        .user-info { display:flex; align-items:center; gap:9px; }
        .user-avatar { width:32px; height:32px; border-radius:50%; background:var(--hov); color:var(--muted); font-weight:700; font-size:13px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .user-name { font-size:.8rem; font-weight:600; color:var(--text); display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:120px; }
        .user-role { font-size:.7rem; color:var(--muted); display:block; }
        .logout-btn { width:100%; padding:8px; background:transparent; border:1px solid var(--border); border-radius:8px; font-size:.8rem; font-weight:600; color:var(--muted); cursor:pointer; font-family:inherit; }
        .logout-btn:hover { background:rgba(239,68,68,.08); color:#ef4444; border-color:rgba(239,68,68,.3); }
        .theme-toggle { display:flex; align-items:center; gap:7px; background:none; border:1px solid var(--border); border-radius:8px; padding:7px 12px; font-size:.78rem; font-weight:600; color:var(--muted); cursor:pointer; font-family:inherit; width:100%; }
        .theme-toggle:hover { background:var(--hov); color:var(--text); }
        .app-main { flex:1; display:flex; flex-direction:column; min-height:100vh; overflow-y:auto; min-width:0; background:var(--bg); display:flex; flex-direction:column; position:relative; isolation:isolate; }
        .app-header { display:flex; align-items:center; justify-content:space-between; padding:12px 28px; border-bottom:1px solid var(--border); background:var(--sidebar); gap:16px; }
        .header-search { display:flex; align-items:center; gap:8px; background:var(--bg); border:1px solid var(--border); border-radius:8px; padding:7px 12px; flex:1; max-width:320px; }
        .header-search-input { background:none; border:none; outline:none; font-size:.85rem; color:var(--text); font-family:inherit; width:100%; }
        .header-search-input::placeholder { color:var(--muted); }
        .app-header-right { display:flex; align-items:center; gap:10px; }
        .header-icon-btn { background:none; border:1px solid var(--border); border-radius:8px; padding:7px; cursor:pointer; color:var(--muted); display:flex; align-items:center; }
        .header-icon-btn:hover { color:var(--text); background:var(--hov); }
        .header-user-chip { display:flex; align-items:center; gap:8px; }
        .header-user-name { font-size:.83rem; font-weight:600; color:var(--text); }
        .app-content { flex:1; padding:28px; }
        .rec-footer-bar { padding: 20px 24px; font-size: 11px; color: var(--accent, #3fb950); text-align: center; background: transparent; letter-spacing: 0.04em; font-weight: 500; width: 100%; display: block; }
        @media(max-width:768px){.app-layout{display:block;}.sidebar{display:none!important;}.rec-mobile-bar{display:flex!important;}.app-main{width:100%;max-width:100%;}.app-content{padding:16px 12px;}}
        .rec-mobile-bar{display:none;align-items:center;gap:12px;padding:10px 16px;background:var(--sidebar);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:10;}
        .rec-hamburger{display:flex;align-items:center;justify-content:center;background:none;border:1px solid var(--border);border-radius:8px;padding:7px;cursor:pointer;color:var(--muted);}
        .rec-hamburger:hover{background:var(--hov);color:var(--text);}
        .rec-drawer{position:fixed;inset:0;z-index:200;display:flex;}
        .rec-drawer-overlay{position:absolute;inset:0;background:rgba(0,0,0,0.55);}
        .rec-drawer-panel{position:relative;width:260px;background:var(--sidebar);border-right:1px solid var(--border);display:flex;flex-direction:column;height:100vh;animation:recSlide .2s ease;}
        @keyframes recSlide{from{transform:translateX(-100%)}to{transform:translateX(0)}}
      `}</style>
      {menuOpen && (
          <div className="rec-drawer">
            <div className="rec-drawer-overlay" onClick={() => setMenuOpen(false)} />
            <div className="rec-drawer-panel">
              <div className="sidebar-brand">
                <img src="/Porta.png" alt="Porta" style={{height:"26px",width:"auto"}} />
                <span className="brand-pill">Reception</span>
                <button onClick={() => setMenuOpen(false)} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:"18px",lineHeight:1,padding:"0 4px"}}>&#x2715;</button>
              </div>
              <nav className="sidebar-nav">
                <NavLink to="/reception/appointments" onClick={() => setMenuOpen(false)} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Appointments</NavLink>
                <NavLink to="/reception/visitors" onClick={() => setMenuOpen(false)} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Visitors</NavLink>
                <NavLink to="/reception/messages" onClick={() => setMenuOpen(false)} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} style={{position:"relative"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>Messages{unreadCount > 0 && <span style={{marginLeft:"auto",minWidth:18,height:18,borderRadius:9,background:"var(--accent)",color:"#fff",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 5px"}}>{unreadCount}</span>}</NavLink>
                {/* <NavLink to="/reception/analytics" onClick={() => setMenuOpen(false)} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>Analytics</NavLink> */}
              </nav>
              <div className="sidebar-footer">
                <div className="user-info"><div className="user-avatar">{avatarInitial}</div><div><span className="user-name">{displayName}</span><span className="user-role">Receptionist</span></div></div>
                <button className="logout-btn" onClick={async () => { await signOut(); navigate("/login"); }}>Sign out</button>
              </div>
            </div>
          </div>
        )}
        <div className="rec-mobile-bar">
          <button className="rec-hamburger" onClick={() => setMenuOpen(true)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>
          <img src="/Porta.png" alt="Porta" style={{height:"24px",width:"auto"}} />
          <form onSubmit={handleSearch} className="header-search" style={{flex:1,maxWidth:"200px"}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="search" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="header-search-input" />
          </form>
        </div>
        <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="/Porta.png" alt="Porta" style={{height:"26px",width:"auto"}} />
          <span className="brand-pill">Reception</span>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/reception/appointments" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Appointments
          </NavLink>
          <NavLink to="/reception/visitors" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Visitors
          </NavLink>
          <NavLink to="/reception/messages" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} style={{position:"relative"}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Messages
            {unreadCount > 0 && <span style={{marginLeft:"auto",minWidth:18,height:18,borderRadius:9,background:"var(--accent)",color:"#fff",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 5px"}}>{unreadCount}</span>}
          </NavLink>
{/*           <NavLink to="/reception/analytics" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            Analytics
          </NavLink> */}
        </nav>
        <div className="sidebar-footer"><div style={{position:"relative"}}><button onClick={()=>setPopOpen(p=>!p)} style={{display:"flex",alignItems:"center",gap:"9px",background:"none",border:"none",cursor:"pointer",padding:"4px",borderRadius:"8px",width:"100%",transition:"background .12s",display:"flex",alignItems:"center"}} onMouseEnter={e=>e.currentTarget.style.background="var(--hov)"} onMouseLeave={e=>e.currentTarget.style.background="none"}><div className="user-avatar">{avatarInitial}</div><div style={{textAlign:"left"}}><div style={{fontSize:".8rem",fontWeight:600,color:"var(--text)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"120px"}}>{displayName}</div><div style={{fontSize:".7rem",color:"var(--muted)"}}>Receptionist</div></div><span style={{marginLeft:"auto",fontSize:"18px",color:"var(--muted)",letterSpacing:"2px",lineHeight:1,flexShrink:0,opacity:0.6}}>&#8943;</span></button>{popOpen&&(<div style={{position:"absolute",bottom:"48px",left:0,right:0,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"10px",padding:"6px",zIndex:50,boxShadow:"0 8px 24px rgba(0,0,0,0.25)"}}><button onClick={()=>{setPopOpen(false);navigate("/reception/profile");}} onMouseEnter={e=>e.currentTarget.style.background="var(--hov)"} onMouseLeave={e=>e.currentTarget.style.background="none"} style={{display:"block",width:"100%",padding:"8px 12px",background:"none",border:"none",borderRadius:"7px",fontSize:".82rem",fontWeight:600,color:"var(--text)",cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}>Profile</button><button onClick={async()=>{await signOut();navigate("/login");}} onMouseEnter={e=>e.currentTarget.style.background="rgba(239,68,68,0.08)"} onMouseLeave={e=>e.currentTarget.style.background="none"} style={{display:"block",width:"100%",padding:"8px 12px",background:"none",border:"none",borderRadius:"7px",fontSize:".82rem",fontWeight:600,color:"#ef4444",cursor:"pointer",textAlign:"left",fontFamily:"inherit",transition:"background .12s"}}>Sign out</button></div>)}</div></div>

      </aside>
      <main className="app-main">
        <header className="app-header">
          <div className="app-header-left">
            <form onSubmit={handleSearch} className="header-search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="search" placeholder="Search visitors..." value={search} onChange={e => setSearch(e.target.value)} className="header-search-input" />
            </form>
          </div>
          <div className="app-header-right">
            <div style={{width:"1px",height:22,background:"var(--border)",flexShrink:0}}/>
            <span style={{fontSize:"0.82rem",fontWeight:700,color:"var(--text)",letterSpacing:"-0.01em",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{orgName}</span>
            <button className="header-icon-btn" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} title={theme==="dark"?"Light mode":"Dark mode"}>
              {theme === "dark" ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
            </button>
            <div className="header-user-chip"><div className="user-avatar" style={{width:"30px",height:"30px",fontSize:"12px"}}>{avatarInitial}</div></div>
          </div>
        </header>
        <div className="app-content"><Outlet /></div>

      <div style={{textAlign:"center",padding:"12px 24px",fontSize:"12px",fontWeight:600,color:"#3fb950",letterSpacing:"0.04em",opacity:0.85,marginTop:"auto",flexShrink:0}}>© {new Date().getFullYear()} Porta · Powered by Lider Technologies LTD</div>
      </main>
    </div>
  );
}




























