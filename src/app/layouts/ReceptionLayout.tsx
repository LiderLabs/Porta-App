import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useUser, useClerk } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState, useEffect } from "react";
import { useHideOverlay } from "../../App";

const NAV = [
  { to: "/reception/front-desk", label: "Front desk", short: "Front desk" },
  { to: "/reception/agenda", label: "Book a visit", short: "Book" },
  { to: "/reception/appointments", label: "Appointments", short: "Appts", badge: "pending" as const },
  { to: "/reception/visitors", label: "Visitors", short: "Visitors" },
  { to: "/reception/messages", label: "Messages", short: "Messages", badge: "unread" as const },
];

export function AppLayout() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const convexUser = useQuery(api.users.getByClerkId, user?.id ? { clerkUserId: user.id } : "skip");
  const displayName = convexUser?.name ?? user?.fullName ?? user?.firstName ?? "";
  const avatarInitial = displayName?.[0]?.toUpperCase() ?? "?";
  const unreadCount = useQuery(api.directMessages.unreadCount, user?.id ? { clerkUserId: user.id } : "skip") ?? 0;
  const visits = useQuery(api.scheduling.list);
  const pendingCount = ((visits ?? []) as any[]).filter((v) => v.status === "pending" && v.scheduledDate >= new Date().setHours(0, 0, 0, 0)).length;
  const orgSettings = useQuery(api.orgSettings.get);
  const myOrg = useQuery(api.orgSettings.getMyOrg);
  const orgName = myOrg?.name || orgSettings?.branding?.appName || "Porta";

  const [accountOpen, setAccountOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">(() => (localStorage.getItem("porta-theme") as "dark" | "light") ?? "dark");
  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); localStorage.setItem("porta-theme", theme); }, [theme]);
  const { hide } = useHideOverlay();
  useEffect(() => { const t = setTimeout(hide, 50); return () => clearTimeout(t); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) navigate("/reception/visitors?search=" + encodeURIComponent(search.trim()));
  };
  const badgeFor = (b?: "pending" | "unread") => (b === "pending" ? pendingCount : b === "unread" ? unreadCount : 0);
  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  const logout = async () => { await signOut(); navigate("/login"); };

  return (
    <div className="rl">
      <style>{`
        :root[data-theme="dark"] { --bg:#0d1117; --sidebar:#161b22; --border:#30363d; --text:#e6edf3; --muted:#8b949e; --surface:#21262d; --hov:#2d333b; --accent:#3fb950; --accent-bg:rgba(63,185,80,0.12); --danger:#f85149; --blue:#58a6ff; }
        :root[data-theme="light"] { --bg:#f8fafc; --sidebar:#ffffff; --border:#e2e8f0; --text:#0f172a; --muted:#64748b; --surface:#ffffff; --hov:#f1f5f9; --accent:#16a34a; --accent-bg:rgba(22,163,74,0.10); --danger:#dc2626; --blue:#2563eb; }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family:'Plus Jakarta Sans',system-ui,sans-serif; background:var(--bg); color:var(--text); -webkit-font-smoothing:antialiased; }
        .rl { display:flex; height:100vh; height:100dvh; overflow:hidden; font-family:'Plus Jakarta Sans',system-ui,sans-serif; }
        .rl-side { width:232px; min-width:232px; background:var(--sidebar); border-right:1px solid var(--border); display:flex; flex-direction:column; }
        .rl-brand { display:flex; align-items:center; gap:10px; padding:18px 18px 16px; border-bottom:1px solid var(--border); }
        .rl-pill { font-size:.65rem; font-weight:700; color:var(--accent); background:var(--accent-bg); padding:2px 8px; border-radius:20px; letter-spacing:.05em; text-transform:uppercase; }
        .rl-nav { flex:1; padding:12px 10px; display:flex; flex-direction:column; gap:2px; }
        .rl-link { position:relative; display:flex; align-items:center; justify-content:space-between; gap:8px; padding:10px 12px; border-radius:8px; text-decoration:none; font-size:.88rem; font-weight:500; color:var(--muted); transition:background .12s,color .12s; }
        .rl-link:hover { background:var(--hov); color:var(--text); }
        .rl-link.active { background:var(--accent-bg); color:var(--accent); font-weight:700; }
        .rl-link.active::before { content:""; position:absolute; left:-10px; top:8px; bottom:8px; width:3px; border-radius:0 3px 3px 0; background:var(--accent); }
        .rl-badge { min-width:20px; height:20px; padding:0 6px; border-radius:10px; background:var(--accent); color:#fff; font-size:.7rem; font-weight:700; display:inline-flex; align-items:center; justify-content:center; }
        .rl-link .rl-badge--amber { background:#d29922; color:#111; }
        .rl-foot { padding:12px; border-top:1px solid var(--border); position:relative; }
        .rl-user { display:flex; align-items:center; gap:10px; width:100%; padding:6px; border:none; background:none; border-radius:8px; cursor:pointer; font-family:inherit; text-align:left; color:var(--text); }
        .rl-user:hover { background:var(--hov); }
        .rl-avatar { width:32px; height:32px; border-radius:50%; background:var(--hov); color:var(--muted); border:1px solid var(--border); font-weight:700; font-size:13px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .rl-uname { font-size:.82rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:140px; }
        .rl-urole { font-size:.72rem; color:var(--muted); }
        .rl-menu { position:absolute; left:12px; right:12px; bottom:64px; background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:6px; z-index:50; box-shadow:0 8px 24px rgba(0,0,0,.25); }
        .rl-menu button { display:block; width:100%; padding:9px 12px; background:none; border:none; border-radius:7px; font-size:.84rem; font-weight:600; color:var(--text); cursor:pointer; text-align:left; font-family:inherit; }
        .rl-menu button:hover { background:var(--hov); }
        .rl-menu .rl-out { color:var(--danger); }
        .rl-main { flex:1; min-width:0; display:flex; flex-direction:column; overflow-y:auto; background:var(--bg); }
        .rl-top { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:12px 32px; border-bottom:1px solid var(--border); background:var(--sidebar); position:sticky; top:0; z-index:20; }
        .rl-search { flex:1; max-width:340px; min-height:38px; padding:0 12px; border-radius:8px; border:1px solid var(--border); background:var(--bg); color:var(--text); font:inherit; font-size:.85rem; outline:none; }
        .rl-search:focus { border-color:var(--accent); }
        .rl-search::placeholder { color:var(--muted); }
        .rl-top-right { display:flex; align-items:center; gap:14px; }
        .rl-org { font-size:.84rem; font-weight:700; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .rl-ghost { min-height:34px; padding:0 12px; border-radius:8px; border:1px solid var(--border); background:none; color:var(--muted); font:inherit; font-size:.8rem; font-weight:600; cursor:pointer; }
        .rl-ghost:hover { background:var(--hov); color:var(--text); }
        .rl-content { flex:1; padding:28px 32px; }
        .rl-foot-note { text-align:center; padding:14px 24px; font-size:12px; font-weight:600; color:var(--accent); letter-spacing:.04em; opacity:.85; }
        .rl-mtop, .rl-bottom { display:none; }
        .rl-sheet-wrap { position:fixed; inset:0; z-index:200; display:none; align-items:flex-end; }
        .rl-sheet-shade { position:absolute; inset:0; background:rgba(0,0,0,.55); }
        .rl-sheet { position:relative; width:100%; background:var(--sidebar); border-top:1px solid var(--border); border-radius:16px 16px 0 0; padding:16px 16px calc(16px + env(safe-area-inset-bottom)); display:flex; flex-direction:column; gap:8px; }
        .rl-sheet .rl-ghost { min-height:44px; text-align:left; font-size:.9rem; color:var(--text); }
        .rl-sheet .rl-out { color:var(--danger); }
        @media (max-width: 768px) {
          .rl-sheet-wrap { display:flex; }
          .rl { display:block; height:auto; min-height:100dvh; overflow:visible; }
          .rl-side, .rl-top { display:none; }
          .rl-main { overflow:visible; min-height:100dvh; padding-bottom:calc(68px + env(safe-area-inset-bottom)); }
          .rl-content { padding:18px 14px; }
          .rl-mtop { display:flex; align-items:center; gap:10px; padding:10px 14px; background:var(--sidebar); border-bottom:1px solid var(--border); position:sticky; top:0; z-index:20; }
          .rl-mtop .rl-search { max-width:none; }
          .rl-bottom { display:grid; grid-template-columns:repeat(5,1fr); position:fixed; left:0; right:0; bottom:0; z-index:30; background:var(--sidebar); border-top:1px solid var(--border); padding-bottom:env(safe-area-inset-bottom); }
          .rl-tab { position:relative; display:flex; align-items:center; justify-content:center; min-height:56px; padding:0 2px; text-decoration:none; font-size:.72rem; font-weight:600; color:var(--muted); text-align:center; }
          .rl-tab.active { color:var(--accent); }
          .rl-tab.active::before { content:""; position:absolute; top:0; left:22%; right:22%; height:3px; border-radius:0 0 3px 3px; background:var(--accent); }
          .rl-tab .rl-badge { position:absolute; top:6px; right:8%; min-width:16px; height:16px; font-size:.62rem; padding:0 4px; }
        }
      `}</style>

      <aside className="rl-side">
        <div className="rl-brand">
          <img src="/Porta.png" alt="Porta" style={{ height: 26, width: "auto" }} />
          <span className="rl-pill">Reception</span>
        </div>
        <nav className="rl-nav" aria-label="Reception">
          {NAV.map((n) => {
            const c = badgeFor(n.badge);
            return (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `rl-link${isActive ? " active" : ""}`}>
                {n.label}
                {c > 0 && <span className={`rl-badge${n.badge === "pending" ? " rl-badge--amber" : ""}`}>{c}</span>}
              </NavLink>
            );
          })}
        </nav>
        <div className="rl-foot">
          <button className="rl-user" onClick={() => setAccountOpen((o) => !o)} aria-expanded={accountOpen}>
            <div className="rl-avatar">{avatarInitial}</div>
            <div><div className="rl-uname">{displayName}</div><div className="rl-urole">Receptionist</div></div>
          </button>
          {accountOpen && (
            <div className="rl-menu">
              <button onClick={() => { setAccountOpen(false); navigate("/reception/profile"); }}>Profile</button>
              <button className="rl-out" onClick={logout}>Sign out</button>
            </div>
          )}
        </div>
      </aside>

      <main className="rl-main">
        <header className="rl-top">
          <form onSubmit={handleSearch} style={{ flex: 1 }}>
            <input className="rl-search" type="search" placeholder="Search visitors" aria-label="Search visitors" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: "100%" }} />
          </form>
          <div className="rl-top-right">
            <span className="rl-org">{orgName}</span>
            <button className="rl-ghost" onClick={toggleTheme}>{theme === "dark" ? "Light mode" : "Dark mode"}</button>
          </div>
        </header>

        <div className="rl-mtop">
          <img src="/Porta.png" alt="Porta" style={{ height: 22, width: "auto" }} />
          <form onSubmit={handleSearch} style={{ flex: 1 }}>
            <input className="rl-search" type="search" placeholder="Search visitors" aria-label="Search visitors" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: "100%" }} />
          </form>
          <button className="rl-avatar" style={{ cursor: "pointer", font: "inherit", fontWeight: 700 }} onClick={() => setSheetOpen(true)} aria-label="Account">{avatarInitial}</button>
        </div>

        <div className="rl-content"><Outlet /></div>
        <div className="rl-foot-note">© {new Date().getFullYear()} Porta · Powered by Lider Technologies LTD</div>
      </main>

      <nav className="rl-bottom" aria-label="Reception">
        {NAV.map((n) => {
          const c = badgeFor(n.badge);
          return (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `rl-tab${isActive ? " active" : ""}`}>
              {n.short}
              {c > 0 && <span className={`rl-badge${n.badge === "pending" ? " rl-badge--amber" : ""}`} style={n.badge === "pending" ? { background: "#d29922", color: "#111" } : undefined}>{c}</span>}
            </NavLink>
          );
        })}
      </nav>

      {sheetOpen && (
        <div className="rl-sheet-wrap">
          <div className="rl-sheet-shade" onClick={() => setSheetOpen(false)} />
          <div className="rl-sheet" role="dialog" aria-label="Account">
            <div style={{ fontSize: ".85rem", fontWeight: 700, padding: "2px 4px 6px" }}>{displayName} <span style={{ color: "var(--muted)", fontWeight: 500 }}>· {orgName}</span></div>
            <button className="rl-ghost" onClick={() => { setSheetOpen(false); navigate("/reception/profile"); }}>Profile</button>
            <button className="rl-ghost" onClick={toggleTheme}>{theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}</button>
            <button className="rl-ghost rl-out" onClick={logout}>Sign out</button>
          </div>
        </div>
      )}
    </div>
  );
}
