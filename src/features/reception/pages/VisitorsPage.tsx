import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { useNavigate, useSearchParams } from "react-router-dom";

type Filter = "ALL" | "IN" | "OUT";

function hashColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  const hue = Math.abs(h) % 360;
  return `linear-gradient(135deg,hsl(${hue},55%,28%),hsl(${(hue+50)%360},65%,20%))`;
}

function exportCSV(visitors: Doc<"visitors">[]) {
  const rows = [
    ["Name","Company","Phone","Email","Purpose","Status","Check-in Time"],
    ...visitors.map(v=>[v.fullName,v.company??"",v.phone??"",v.email??"",v.purpose??"",v.status,new Date(v.checkInTime).toLocaleString()]),
  ];
  const csv = rows.map(r=>r.map(c=>JSON.stringify(c)).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
  a.download = "visitors.csv"; a.click();
}

export function VisitorsPage() {
  const [filter, setFilter]   = useState<Filter>("ALL");
  const [search, setSearch]   = useState("");
  const [selected, setSelected] = useState<Doc<"visitors"> | null>(null);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [params] = useSearchParams();
  const navigate  = useNavigate();
  const visitors  = useQuery(api.visitors.list);
  const checkOut  = useMutation(api.visitors.checkOut);

  const effectiveSearch = search || (params.get("search") ?? "");

  const filtered = visitors?.filter((v: any) => {
    const okFilter = filter === "ALL" || v.status === filter;
    const okSearch = !effectiveSearch ||
      v.fullName.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
      (v.company??"").toLowerCase().includes(effectiveSearch.toLowerCase()) ||
      (v.purpose??"").toLowerCase().includes(effectiveSearch.toLowerCase());
    return okFilter && okSearch;
  });

  const handleCheckOut = async (id: string) => {
    setCheckingOut(id);
    try { await checkOut({ visitorId: id as any }); } finally { setCheckingOut(null); }
  };

  const inCount  = visitors?.filter((v:any)=>v.status==="IN").length ?? 0;
  const outCount = visitors?.filter((v:any)=>v.status==="OUT").length ?? 0;

  return (
    <>
      <style>{`
        .vp { padding: 0; }
        .vp-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:20px; gap:16px; flex-wrap:wrap; }
        .vp-title { font-size:1.4rem; font-weight:700; color:var(--text,#e6edf3); margin-bottom:4px; }
        .vp-stats-row { display:flex; align-items:center; gap:8px; font-size:0.85rem; }
        .vp-stat { font-weight:600; color:var(--text,#e6edf3); }
        .vp-stat em { font-style:normal; color:var(--muted,#8b949e); font-weight:400; }
        .vp-stat--green { color:var(--accent,#3fb950); }
        .vp-stat--muted { color:var(--muted,#8b949e); }
        .vp-dot { width:3px; height:3px; border-radius:50%; background:var(--muted,#8b949e); }
        .vp-header-actions { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
        .vp-export-btn { display:flex; align-items:center; gap:6px; padding:8px 14px; background:transparent; border:1px solid var(--border,#30363d); border-radius:8px; font-size:0.82rem; font-weight:600; color:var(--muted,#8b949e); cursor:pointer; font-family:inherit; }
        .vp-export-btn:hover { background:var(--hov,#2d333b); color:var(--text,#e6edf3); }
        .vp-checkin-btn { display:flex; align-items:center; gap:6px; padding:8px 16px; background:var(--accent,#3fb950); color:#fff; border:none; border-radius:8px; font-size:0.85rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .vp-checkin-btn:hover { opacity:0.88; }
        .vp-toolbar { display:flex; align-items:center; gap:12px; margin-bottom:16px; flex-wrap:wrap; }
        .vp-search { display:flex; align-items:center; gap:8px; background:var(--surface,#21262d); border:1px solid var(--border,#30363d); border-radius:8px; padding:8px 12px; flex:1; min-width:200px; max-width:320px; }
        .vp-search-input { background:none; border:none; outline:none; font-size:0.85rem; color:var(--text,#e6edf3); font-family:inherit; width:100%; }
        .vp-search-input::placeholder { color:var(--muted,#8b949e); }
        .vp-search-clear { background:none; border:none; cursor:pointer; color:var(--muted,#8b949e); font-size:14px; padding:0; line-height:1; }
        .vp-filters { display:flex; gap:4px; }
        .vp-filter { padding:7px 12px; border:1px solid var(--border,#30363d); border-radius:8px; background:transparent; font-size:0.8rem; font-weight:600; color:var(--muted,#8b949e); cursor:pointer; font-family:inherit; display:flex; align-items:center; gap:6px; }
        .vp-filter:hover { background:var(--hov,#2d333b); color:var(--text,#e6edf3); }
        .vp-filter--on { background:var(--accent-bg,rgba(63,185,80,0.12)); color:var(--accent,#3fb950); border-color:transparent; }
        .vp-filter-count { background:var(--hov,#2d333b); border-radius:999px; padding:1px 7px; font-size:0.72rem; }
        .vp-layout { display:flex; gap:16px; align-items:flex-start; }
        .vp-table-wrap { flex:1; min-width:0; background:var(--surface,#161b22); border:1px solid var(--border,#30363d); border-radius:12px; overflow:hidden; }
        .vp-empty { padding:40px; text-align:center; color:var(--muted,#8b949e); font-size:0.875rem; }
        .vp-table { width:100%; border-collapse:collapse; font-size:0.85rem; }
        .vp-table th { text-align:left; padding:10px 16px; color:var(--muted,#8b949e); font-weight:600; font-size:0.75rem; text-transform:uppercase; letter-spacing:.05em; border-bottom:1px solid var(--border,#30363d); background:var(--sidebar,#161b22); }
        .vp-table td { padding:12px 16px; border-bottom:1px solid var(--border,#30363d); color:var(--text,#e6edf3); vertical-align:middle; }
        .vp-table tr:last-child td { border-bottom:none; }
        .vp-table tbody tr { cursor:pointer; transition:background .1s; }
        .vp-table tbody tr:hover td { background:var(--hov,#2d333b); }
        .vp-row--selected td { background:var(--accent-bg,rgba(63,185,80,0.08)) !important; }
        .vp-person { display:flex; align-items:center; gap:10px; }
        .vp-avatar { width:34px; height:34px; border-radius:50%; color:#fff; font-weight:700; font-size:13px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .vp-person-name { font-weight:600; font-size:0.875rem; color:var(--text,#e6edf3); }
        .vp-person-email { font-size:0.75rem; color:var(--muted,#8b949e); margin-top:1px; }
        .vp-cell-muted { color:var(--muted,#8b949e); }
        .vp-badge { display:inline-flex; align-items:center; padding:3px 10px; border-radius:999px; font-size:0.72rem; font-weight:700; }
        .vp-badge--in { background:rgba(63,185,80,0.12); color:#3fb950; }
        .vp-badge--out { background:rgba(139,148,158,0.12); color:#8b949e; }
        .vp-checkout-btn { padding:5px 12px; border:1px solid var(--border,#30363d); border-radius:6px; background:transparent; font-size:0.78rem; font-weight:600; color:var(--muted,#8b949e); cursor:pointer; font-family:inherit; white-space:nowrap; }
        .vp-checkout-btn:hover { background:rgba(248,81,73,0.08); color:#f85149; border-color:rgba(248,81,73,0.3); }
        .vp-checkout-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .vp-panel { width:280px; flex-shrink:0; background:var(--surface,#161b22); border:1px solid var(--border,#30363d); border-radius:12px; overflow:hidden; }
        .vp-panel-top { position:relative; padding:24px 20px 16px; text-align:center; border-bottom:1px solid var(--border,#30363d); }
        .vp-panel-avatar { width:56px; height:56px; border-radius:50%; color:#fff; font-weight:700; font-size:22px; display:flex; align-items:center; justify-content:center; margin:0 auto 10px; }
        .vp-panel-close { position:absolute; top:12px; right:12px; background:none; border:1px solid var(--border,#30363d); border-radius:6px; cursor:pointer; color:var(--muted,#8b949e); font-size:14px; padding:3px 7px; font-family:inherit; }
        .vp-panel-close:hover { background:var(--hov,#2d333b); color:var(--text,#e6edf3); }
        .vp-panel-name { font-weight:700; font-size:1rem; color:var(--text,#e6edf3); margin-bottom:4px; }
        .vp-panel-body { padding:16px 20px; }
        .vp-panel-fields { display:flex; flex-direction:column; gap:10px; margin-top:16px; }
        .vp-panel-field { display:flex; flex-direction:column; gap:2px; }
        .vp-panel-field-label { font-size:0.72rem; font-weight:600; text-transform:uppercase; letter-spacing:.05em; color:var(--muted,#8b949e); }
        .vp-panel-field-value { font-size:0.85rem; color:var(--text,#e6edf3); word-break:break-word; }
      `}</style>
      <div className="vp">
        <div className="vp-header">
          <div>
            <h1 className="vp-title">Visitors</h1>
            <div className="vp-stats-row">
              <span className="vp-stat">{visitors?.length ?? 0} <em>total</em></span>
              <span className="vp-dot"/>
              <span className="vp-stat vp-stat--green">{inCount} <em>in</em></span>
              <span className="vp-dot"/>
              <span className="vp-stat vp-stat--muted">{outCount} <em>out</em></span>
            </div>
          </div>
          <div className="vp-header-actions">
            {filtered && filtered.length > 0 && (
              <button className="vp-export-btn" onClick={() => exportCSV(filtered as any)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Export CSV
              </button>
            )}
            <button className="vp-checkin-btn" onClick={() => navigate("/reception/checkin")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Check in
            </button>
          </div>
        </div>

        <div className="vp-toolbar">
          <div className="vp-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input className="vp-search-input" placeholder="Search by name, company, purpose..." value={search} onChange={e=>setSearch(e.target.value)} />
            {search && <button className="vp-search-clear" onClick={()=>setSearch("")}>x</button>}
          </div>
          <div className="vp-filters">
            {(["ALL","IN","OUT"] as Filter[]).map(f=>(
              <button key={f} className={`vp-filter${filter===f?" vp-filter--on":""}`} onClick={()=>setFilter(f)}>
                {f==="ALL"?"All visitors":f==="IN"?"Checked in":"Checked out"}
                <span className="vp-filter-count">
                  {f==="ALL"?visitors?.length??0:f==="IN"?inCount:outCount}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="vp-layout">
          <div className="vp-table-wrap">
            {visitors === undefined ? (
              <div className="vp-empty">Loading...</div>
            ) : filtered?.length === 0 ? (
              <div className="vp-empty">No visitors found.</div>
            ) : (
              <table className="vp-table">
                <thead>
                  <tr>
                    <th>Visitor</th><th>Company</th><th>Purpose</th>
                    <th>Time</th><th>Status</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered?.map((v:any) => (
                    <tr key={v._id} onClick={()=>setSelected(v)} className={selected?._id===v._id?"vp-row--selected":""}>
                      <td>
                        <div className="vp-person">
                          <div className="vp-avatar" style={{background:hashColor(v.fullName)}}>{v.fullName[0].toUpperCase()}</div>
                          <div>
                            <div className="vp-person-name">{v.fullName}</div>
                            {v.email && <div className="vp-person-email">{v.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="vp-cell-muted">{v.company||"—"}</td>
                      <td className="vp-cell-muted">{v.purpose||"—"}</td>
                      <td className="vp-cell-muted">{new Date(v.checkInTime).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</td>
                      <td><span className={`vp-badge vp-badge--${v.status==="IN"?"in":"out"}`}>{v.status}</span></td>
                      <td onClick={e=>e.stopPropagation()}>
                        {v.status==="IN" && (
                          <button className="vp-checkout-btn" disabled={checkingOut===v._id} onClick={()=>handleCheckOut(v._id)}>
                            {checkingOut===v._id?"...":"Check out"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {selected && (
            <div className="vp-panel">
              <div className="vp-panel-top">
                <div className="vp-panel-avatar" style={{background:hashColor(selected.fullName)}}>
                  {selected.fullName[0].toUpperCase()}
                </div>
                <button className="vp-panel-close" onClick={()=>setSelected(null)}>x</button>
              </div>
              <div className="vp-panel-body">
                <div className="vp-panel-name">{selected.fullName}</div>
                <span className={`vp-badge vp-badge--${selected.status==="IN"?"in":"out"}`} style={{margin:"4px auto 0",display:"block",width:"fit-content"}}>{selected.status}</span>
                <div className="vp-panel-fields">
                  {[
                    {label:"Company",    value:selected.company},
                    {label:"Phone",      value:selected.phone},
                    {label:"Email",      value:selected.email},
                    {label:"Purpose",    value:selected.purpose},
                    {label:"Checked in", value:new Date(selected.checkInTime).toLocaleString()},
                    {label:"Checked out",value:selected.checkOutTime?new Date(selected.checkOutTime).toLocaleString():null},
                  ].filter(f=>f.value).map(({label,value})=>(
                    <div key={label} className="vp-panel-field">
                      <span className="vp-panel-field-label">{label}</span>
                      <span className="vp-panel-field-value">{value}</span>
                    </div>
                  ))}
                </div>
                {selected.status==="IN" && (
                  <button className="vp-checkin-btn" style={{width:"100%",justifyContent:"center",marginTop:"16px"}}
                    disabled={checkingOut===selected._id}
                    onClick={()=>{handleCheckOut(selected._id);setSelected(null);}}>
                    Check out
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}