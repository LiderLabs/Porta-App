import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useUser, useClerk } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
// @ts-ignore
import { api } from "../../../convex/_generated/api";
import { useState, useEffect } from "react";
import { useHideOverlay } from "../../App";
import { Sun, Moon } from "lucide-react";

export function PALayout() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const convexUser  = useQuery(api.users.getByClerkId, user?.id ? { clerkUserId: user.id } : "skip");
  const displayName = convexUser?.name ?? user?.fullName ?? user?.firstName ?? "";
  const avatarInitial = displayName?.[0]?.toUpperCase() ?? "?";
  const unreadCount = useQuery(api.directMessages.unreadCount, user?.id ? { clerkUserId: user.id } : "skip") ?? 0;
  const [menuOpen, setMenuOpen] = useState(false);
  const [popOpen, setPopOpen] = useState(false);
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
    { path:"/pa/home",         label:"Dashboard",    icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
    { path:"/pa/appointments", label:"Appointments", icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
    { path:"/pa/messages",     label:"Messages",     icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, badge: unreadCount > 0 ? unreadCount : null },
  ];

  return (
    <div className="pal-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        :root[data-theme="dark"]  {--bg:#0d1117;--sidebar:#161b22;--border:#30363d;--text:#e6edf3;--muted:#8b949e;--surface:#21262d;--hov:#2d333b;--accent:#a78bfa;--accent-bg:rgba(167,139,250,0.12);--danger:#f85149;--blue:#58a6ff;}
        :root[data-theme="light"] {--bg:#f8fafc;--sidebar:#ffffff;--border:#e2e8f0;--text:#0f172a;--muted:#64748b;--surface:#ffffff;--hov:#f1f5f9;--accent:#7c3aed;--accent-bg:rgba(124,58,237,0.10);--danger:#dc2626;--blue:#2563eb;}
        body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);color:var(--text);}
        .pal-root{display:flex;height:100vh;overflow:hidden;}
        .pal-sidebar{width:220px;min-width:220px;background:var(--sidebar);border-right:1px solid var(--border);display:flex;flex-direction:column;height:100vh;}
        .pal-brand{display:flex;align-items:center;gap:10px;padding:18px 16px 14px;border-bottom:1px solid var(--border);}
        .pal-brand-role{font-size:.7rem;font-weight:700;color:var(--accent);background:var(--accent-bg);padding:2px 8px;border-radius:20px;margin-left:auto;}
        .pal-nav{flex:1;padding:10px 8px;display:flex;flex-direction:column;gap:2px;}
        .pal-nav-item{display:flex;align-items:center;gap:9px;padding:9px 10px;border-radius:8px;text-decoration:none;font-size:.85rem;font-weight:500;color:var(--muted);transition:background .12s,color .12s;position:relative;}
        .pal-nav-item:hover{background:var(--hov);color:var(--text);}
        .pal-nav-item.active{background:var(--accent-bg);color:var(--accent);font-weight:600;}
        .pal-badge{position:absolute;right:10px;background:var(--accent);color:#fff;font-size:.65rem;font-weight:700;padding:1px 6px;border-radius:20px;}
        .pal-footer{padding:12px 12px 14px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:8px;}
        .pal-user{display:flex;align-items:center;gap:9px;}
        .pal-avatar{width:32px;height:32px;border-radius:50%;background:var(--accent-bg);color:var(--accent);font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .pal-user-name{font-size:.8rem;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px;}
        .pal-user-role{font-size:.7rem;color:var(--muted);}
        .pal-signout{width:100%;padding:8px;background:transparent;border:1px solid var(--border);border-radius:8px;font-size:.8rem;font-weight:600;color:var(--muted);cursor:pointer;font-family:inherit;}
        .pal-signout:hover{background:rgba(239,68,68,.08);color:#ef4444;border-color:rgba(239,68,68,.3);}
        .pal-theme{display:flex;align-items:center;gap:7px;background:none;border:1px solid var(--border);border-radius:8px;padding:7px 12px;font-size:.78rem;font-weight:600;color:var(--muted);cursor:pointer;font-family:inherit;width:100%;}
        .pal-theme:hover{background:var(--hov);color:var(--text);}
        .pal-main{flex:1;overflow-y:auto;min-width:0;background:var(--bg);}
.pal-content{padding:28px;} }
        .pal-footer-bar { padding: 20px 24px; font-size: 11px; color: var(--accent, #3fb950); text-align: center; background: transparent; letter-spacing: 0.04em; font-weight: 500; width: 100%; display: block; }
        .pal-topbar{display:flex;justify-content:flex-end;align-items:center;padding:12px 24px 0;background:var(--bg);}
        .pal-topbar-toggle{background:none;border:1px solid var(--border);border-radius:8px;padding:7px;cursor:pointer;color:var(--muted);display:flex;align-items:center;}
        .pal-topbar-toggle:hover{color:var(--text);background:var(--hov);}
        .pal-mobile-header{display:none;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--sidebar);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:10;}
        .pal-hamburger{display:flex;align-items:center;justify-content:center;background:none;border:1px solid var(--border);border-radius:8px;padding:7px;cursor:pointer;color:var(--muted);}
        .pal-hamburger:hover{background:var(--hov);color:var(--text);}
        .pal-drawer{position:fixed;inset:0;z-index:200;display:flex;}
        .pal-drawer-overlay{position:absolute;inset:0;background:rgba(0,0,0,0.55);}
        .pal-drawer-panel{position:relative;width:260px;background:var(--sidebar);border-right:1px solid var(--border);display:flex;flex-direction:column;height:100vh;animation:palSlide .2s ease;}
        @keyframes palSlide{from{transform:translateX(-100%)}to{transform:translateX(0)}}
        @media(max-width:768px){.pal-root{display:block;}.pal-sidebar{display:none!important;}.pal-mobile-header{display:flex!important;}.pal-main{width:100%;max-width:100%;}.pal-content{padding:16px 12px;}}
      `}</style>
      {menuOpen && (
          <div className="pal-drawer">
            <div className="pal-drawer-overlay" onClick={() => setMenuOpen(false)} />
            <div className="pal-drawer-panel">
              <div className="pal-brand">
                <img src="/Porta.png" alt="Porta" style={{height:"26px",width:"auto"}}/>
                <span className="pal-brand-role">PA</span>
                <button onClick={() => setMenuOpen(false)} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:"18px",lineHeight:1,padding:"0 4px"}}>&#x2715;</button>
              </div>
              <nav className="pal-nav">
                {navItems.map(item=>(
                  <NavLink key={item.path} to={item.path} onClick={() => setMenuOpen(false)} className={({isActive})=>isActive?"pal-nav-item active":"pal-nav-item"}>
                    {item.icon}{item.label}{item.badge&&<span className="pal-badge">{item.badge}</span>}
                  </NavLink>
                ))}
              </nav>
              <div className="pal-footer">
                <div className="pal-user"><div className="pal-avatar">{avatarInitial}</div><div><div className="pal-user-name">{displayName}</div><div className="pal-user-role">PA / Secretary</div></div></div>
                <button className="pal-signout" onClick={()=>signOut(()=>navigate("/login"))}>Sign out</button>
              </div>
            </div>
          </div>
        )}
        <div className="pal-mobile-header">
          <button className="pal-hamburger" onClick={() => setMenuOpen(true)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>
          <img src="/Porta.png" alt="Porta" style={{height:"24px",width:"auto"}} />
          <span className="pal-brand-role" style={{fontSize:"10px"}}>PA</span>
        </div>
        <aside className="pal-sidebar">
        <div className="pal-brand">
          <img src="/Porta.png" alt="Porta" style={{height:"26px",width:"auto"}}/>
          <span className="pal-brand-role">PA</span>
        </div>
        <nav className="pal-nav">
          {navItems.map(item=>(
            <NavLink key={item.path} to={item.path} className={({isActive})=>isActive?"pal-nav-item active":"pal-nav-item"}>
              {item.icon}{item.label}
              {item.badge&&<span className="pal-badge">{item.badge}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="pal-footer"><div style={{position:"relative"}}><button onClick={()=>setPopOpen(p=>!p)} onMouseEnter={e=>e.currentTarget.style.background="var(--hov)"} onMouseLeave={e=>e.currentTarget.style.background="none"} style={{display:"flex",alignItems:"center",gap:"9px",background:"none",border:"none",cursor:"pointer",padding:"4px",borderRadius:"8px",width:"100%",transition:"background .12s"}}><div className="pal-avatar">{avatarInitial}</div><div style={{textAlign:"left"}}><div style={{fontSize:".8rem",fontWeight:600,color:"var(--text)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"120px"}}>{displayName}</div><div style={{fontSize:".7rem",color:"var(--muted)"}}>PA / Secretary</div></div></button>{popOpen&&(<div style={{position:"absolute",bottom:"48px",left:0,right:0,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"10px",padding:"6px",zIndex:50,boxShadow:"0 8px 24px rgba(0,0,0,0.25)"}}><button onClick={()=>{setPopOpen(false);navigate("/pa/profile");}} onMouseEnter={e=>e.currentTarget.style.background="var(--hov)"} onMouseLeave={e=>e.currentTarget.style.background="none"} style={{display:"block",width:"100%",padding:"8px 12px",background:"none",border:"none",borderRadius:"7px",fontSize:".82rem",fontWeight:600,color:"var(--text)",cursor:"pointer",textAlign:"left",fontFamily:"inherit",transition:"background .12s"}}>Profile</button><button onClick={()=>signOut(()=>navigate("/login"))} onMouseEnter={e=>e.currentTarget.style.background="rgba(239,68,68,0.08)"} onMouseLeave={e=>e.currentTarget.style.background="none"} style={{display:"block",width:"100%",padding:"8px 12px",background:"none",border:"none",borderRadius:"7px",fontSize:".82rem",fontWeight:600,color:"#ef4444",cursor:"pointer",textAlign:"left",fontFamily:"inherit",transition:"background .12s"}}>Sign out</button></div>)}</div></div>













      </aside>
        <main className="pal-main">
          <div className="pal-topbar" style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:10}}>
            <span style={{fontSize:"0.82rem",fontWeight:700,color:"var(--text)",letterSpacing:"-0.01em",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{orgName}</span>
            <div style={{width:"1px",height:20,background:"var(--border)",flexShrink:0}}/>
            <button className="pal-topbar-toggle" onClick={()=>setTheme(t=>t==="dark"?"light":"dark")} title={theme==="dark"?"Light mode":"Dark mode"}>{theme==="dark" ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}</button>
          </div>


        <div className="pal-content"><Outlet/></div>

      <div style={{textAlign:"center",padding:"12px 24px",fontSize:"12px",fontWeight:600,color:"#3fb950",letterSpacing:"0.04em",opacity:0.85,marginTop:"auto",flexShrink:0}}>© {new Date().getFullYear()} Porta · Powered by Lider Technologies LTD</div>
      </main>
    </div>
  );
}
export default PALayout;

















