import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useUser } from "@clerk/clerk-react";
import { LiveCalendar } from "../../shared/LiveCalendar";

function fmt(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function dayRange(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return { start: d.getTime(), end: d.getTime() + 24 * 60 * 60 * 1000 };
}
function toDateInput(ts: number) { return new Date(ts).toISOString().split("T")[0]; }
function todayStr() { return toDateInput(Date.now()); }
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function SpacesPage() {
  const { user } = useUser();
  const staffRecord = useQuery(api.staff.getByClerkId, user?.id ? { clerkUserId: user.id } : "skip");
  const orgId = (staffRecord?.orgId ?? (user?.publicMetadata as any)?.orgId) as string | undefined;
  const rooms = useQuery(api.rooms.listActive, orgId ? { orgId } : "skip");
  const allVisits = useQuery(api.scheduling.listByOrg, orgId ? { orgId } : "skip");
  const createVisit = useMutation(api.scheduling.createByStaff);

  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [pageView, setPageView] = useState<"list"|"calendar">("list");
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [showBook, setShowBook] = useState(false);
  const [bookForm, setBookForm] = useState({
    visitorName: "", visitorEmail: "", visitorPhone: "",
    purpose: "", time: "", duration: "60", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const now = Date.now();

  const roomVisitsForDate = useMemo(() => {
    if (!selectedRoom || !allVisits) return [];
    const { start, end } = dayRange(selectedDate);
    return (allVisits as any[]).filter(v =>
      v.roomId === selectedRoom._id &&
      v.scheduledDate >= start &&
      v.scheduledDate < end &&
      !["cancelled", "no_show", "rejected", "declined"].includes(v.status)
    ).sort((a: any, b: any) => a.scheduledDate - b.scheduledDate);
  }, [selectedRoom, selectedDate, allVisits]);

  const todayVisitsByRoom = useMemo(() => {
    if (!allVisits) return {} as Record<string, any[]>;
    const { start, end } = dayRange(todayStr());
    const map: Record<string, any[]> = {};
    for (const v of allVisits as any[]) {
      if (!v.roomId || v.scheduledDate < start || v.scheduledDate >= end) continue;
      if (["cancelled", "no_show", "rejected", "declined"].includes(v.status)) continue;
      if (!map[v.roomId]) map[v.roomId] = [];
      map[v.roomId].push(v);
    }
    return map;
  }, [allVisits]);

  const handleBook = async () => {
    setErr("");
    if (!bookForm.visitorName.trim()) { setErr("Visitor name required."); return; }
    if (!bookForm.time) { setErr("Please select a time."); return; }
    setSaving(true);
    try {
      const dt = new Date(selectedDate + "T" + bookForm.time);
      await createVisit({
        clerkUserId: user?.id ?? "",
        visitorName: bookForm.visitorName.trim(),
        visitorEmail: bookForm.visitorEmail.trim() || undefined,
        visitorPhone: bookForm.visitorPhone.trim() || undefined,
        purpose: bookForm.purpose.trim() || undefined,
        scheduledDate: dt.getTime(),
        duration: parseInt(bookForm.duration),
        notes: bookForm.notes.trim() || undefined,
        roomId: selectedRoom._id,
      });
      setSaved(true);
      setShowBook(false);
      setBookForm({ visitorName: "", visitorEmail: "", visitorPhone: "", purpose: "", time: "", duration: "60", notes: "" });
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to book.");
    } finally {
      setSaving(false);
    }
  };

  const isToday = selectedDate === todayStr();
  const nowLineTop = useMemo(() => {
    if (!isToday) return null;
    const d = new Date();
    return (d.getHours() + d.getMinutes() / 60) * 40;
  }, [isToday]);

  const selectedDateLabel = new Date(selectedDate + "T12:00:00").toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  const selectedDateLong  = new Date(selectedDate + "T12:00:00").toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  const css = `
    .sps{padding:28px 32px;font-family:"DM Sans",sans-serif;color:var(--text,#e6edf3)}
    .sps-title{font-size:20px;font-weight:800;color:var(--text);margin:0 0 4px}
    .sps-sub{font-size:13px;color:var(--muted,#8b949e);margin:0 0 24px}
    .sps-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
    .sps-card{background:var(--surface,#161b22);border:1px solid var(--border,#30363d);border-radius:14px;padding:18px 20px;cursor:pointer;transition:border-color .15s,box-shadow .15s}
    .sps-card:hover{border-color:var(--accent,#3fb950);box-shadow:0 0 0 1px var(--accent,#3fb950)}
    .sps-card--on{border-color:var(--accent,#3fb950);box-shadow:0 0 0 2px rgba(63,185,80,.2)}
    .sps-panel{background:var(--surface,#161b22);border:1px solid var(--border,#30363d);border-radius:16px;padding:24px;margin-top:20px}
    .sps-panel-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;gap:12px;flex-wrap:wrap}
    .sps-datepick{padding:7px 12px;background:var(--bg,#0d1117);border:1px solid var(--border,#30363d);border-radius:8px;color:var(--text);font-family:inherit;font-size:13px}
    .sps-datepick:focus{outline:none;border-color:var(--accent,#3fb950)}
    .sps-book-btn{padding:8px 18px;background:var(--accent,#3fb950);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit}
    .sps-book-btn:hover{opacity:.88}
    .sps-tl-hour{display:flex;align-items:flex-start;gap:10px;min-height:40px}
    .sps-tl-lbl{width:44px;font-size:11px;color:var(--muted);flex-shrink:0;padding-top:2px;text-align:right}
    .sps-tl-line{flex:1;border-top:1px solid var(--border,#30363d);margin-top:6px;position:relative;min-height:6px}
    .sps-tl-ev{position:absolute;top:-6px;left:0;right:0;background:rgba(63,185,80,.12);border:1px solid rgba(63,185,80,.3);border-radius:6px;padding:4px 8px;font-size:11px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;z-index:1}
    .sps-tl-ev--now{background:rgba(248,81,73,.12);border-color:rgba(248,81,73,.35);color:#f85149}
    .sps-tl-ev--past{opacity:.4}
    .sps-nowline{position:absolute;left:54px;right:0;height:2px;background:#f85149;z-index:10;pointer-events:none}
    .sps-nowline::before{content:"";position:absolute;left:-4px;top:-4px;width:9px;height:9px;border-radius:50%;background:#f85149}
    .sps-empty{padding:32px;text-align:center;color:var(--muted);font-size:13px;border:1px dashed var(--border,#30363d);border-radius:10px}
    .sps-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100;display:flex;align-items:center;justify-content:center;padding:16px}
    .sps-modal{background:var(--surface,#161b22);border:1px solid var(--border,#30363d);border-radius:16px;padding:28px;width:100%;max-width:460px;max-height:90vh;overflow-y:auto}
    .sps-field{display:flex;flex-direction:column;gap:5px;margin-bottom:14px}
    .sps-lbl{font-size:12px;font-weight:600;color:var(--muted)}
    .sps-inp{padding:9px 12px;background:var(--bg,#0d1117);border:1px solid var(--border,#30363d);border-radius:8px;font-size:13px;font-family:inherit;color:var(--text);outline:none;width:100%;box-sizing:border-box}
    .sps-inp:focus{border-color:var(--accent,#3fb950)}
    .sps-row2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .sps-success{background:rgba(63,185,80,.1);border:1px solid rgba(63,185,80,.3);border-radius:8px;padding:10px 14px;font-size:13px;font-weight:600;color:var(--accent,#3fb950);margin-bottom:16px}
    @media(max-width:768px){.sps{padding:16px 14px}.sps-grid{grid-template-columns:1fr}.sps-row2{grid-template-columns:1fr}}
  `;

  if (staffRecord === undefined || rooms === undefined) {
    return <><style>{css}</style><div className="sps" style={{color:"var(--muted)"}}>Loading...</div></>;
  }
  if (!orgId || rooms.length === 0) {
    return <><style>{css}</style><div className="sps"><h2 className="sps-title">Room Availability</h2><p className="sps-sub">No active rooms set up yet. Ask your admin to add rooms.</p></div></>;
  }

  return (
    <><style>{css}</style>
    <div className="sps">
      <h2 className="sps-title">Room Availability</h2>
      <p className="sps-sub">Click a room to view its schedule and book a meeting.</p>

      {saved && <div className="sps-success">✓ Meeting booked successfully!</div>}

      {/* Room grid */}
      <div className="sps-grid">
        {(rooms as any[]).map((room: any) => {
          const tv = todayVisitsByRoom[room._id] ?? [];
          const cur = tv.find((v: any) => {
            const e = v.scheduledDate + (v.duration ?? 60) * 60000;
            return v.scheduledDate <= now && e > now;
          });
          const col = cur ? "#f85149" : "#3fb950";
          const isActive = selectedRoom?._id === room._id;
          return (
            <div
              key={room._id}
              className={"sps-card" + (isActive ? " sps-card--on" : "")}
              onClick={() => { setSelectedRoom(room); setSelectedDate(todayStr()); setShowBook(false); }}
            >
              <div style={{fontSize:15,fontWeight:700,color:"var(--text)",marginBottom:4}}>{room.name}</div>
              <div style={{fontSize:12,color:"var(--muted)",marginBottom:10,display:"flex",gap:10,flexWrap:"wrap"}}>
                {room.floor && <span>Floor {room.floor}</span>}
                {room.capacity && <span>Cap. {room.capacity}</span>}
                {room.amenities?.length > 0 && <span>{room.amenities.slice(0, 2).join(", ")}</span>}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                <span style={{width:7,height:7,borderRadius:"50%",background:col,display:"inline-block"}}/>
                <span style={{fontSize:12,fontWeight:600,color:col}}>{cur ? "Occupied now" : "Available"}</span>
              </div>
              <div style={{fontSize:11,color:"var(--muted)"}}>
                {tv.length === 0 ? "No bookings today" : `${tv.length} booking${tv.length > 1 ? "s" : ""} today`}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail panel */}
      {selectedRoom && (
        <div className="sps-panel">
          <div className="sps-panel-hdr">
            <div>
              <div style={{fontSize:17,fontWeight:700,color:"var(--text)"}}>{selectedRoom.name}</div>
              <div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>
                {[
                  selectedRoom.floor && `Floor ${selectedRoom.floor}`,
                  selectedRoom.capacity && `Capacity ${selectedRoom.capacity}`,
                  ...(selectedRoom.amenities ?? []),
                ].filter(Boolean).join(" · ")}
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <div style={{display:"flex",background:"var(--bg,#0d1117)",border:"1px solid var(--border,#30363d)",borderRadius:8,overflow:"hidden"}}>
                <button
                  onClick={() => setPageView("list")}
                  style={{padding:"7px 14px",background:pageView==="list"?"var(--accent-bg,rgba(63,185,80,.12))":"none",color:pageView==="list"?"var(--accent,#3fb950)":"var(--muted,#8b949e)",border:"none",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit"}}
                >List</button>
                <button
                  onClick={() => setPageView("calendar")}
                  style={{padding:"7px 14px",background:pageView==="calendar"?"var(--accent-bg,rgba(63,185,80,.12))":"none",color:pageView==="calendar"?"var(--accent,#3fb950)":"var(--muted,#8b949e)",border:"none",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit"}}
                >Calendar</button>
              </div>
              {pageView === "list" && (
                <input
                  type="date"
                  className="sps-datepick"
                  value={selectedDate}
                  min={todayStr()}
                  onChange={e => setSelectedDate(e.target.value)}
                />
              )}
              <button className="sps-book-btn" onClick={() => setShowBook(true)}>+ Book meeting</button>
            </div>
          </div>

          <div style={{fontSize:11,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12}}>
            {isToday ? "Today's schedule" : `Schedule — ${selectedDateLabel}`}
            <span style={{marginLeft:10,fontWeight:400,textTransform:"none",letterSpacing:0,color:"var(--muted)"}}>
              {roomVisitsForDate.length === 0 ? "— Free all day" : `— ${roomVisitsForDate.length} booking${roomVisitsForDate.length > 1 ? "s" : ""}`}
            </span>
          </div>

          {pageView === "calendar" ? (
            <LiveCalendar
              visits={roomVisitsForDate}
              blockedSlots={[]}
              onSelectVisit={() => {}}
            />
          ) : roomVisitsForDate.length === 0 ? (
            <div className="sps-empty">No bookings on this day — room is completely free!</div>
          ) : (
            <div style={{position:"relative"}}>
              {nowLineTop !== null && (
                <div className="sps-nowline" style={{top: nowLineTop + "px"}} />
              )}
              {HOURS.filter(h =>
                roomVisitsForDate.some((v: any) => new Date(v.scheduledDate).getHours() === h) || (h >= 7 && h <= 20)
              ).map(h => {
                const events = roomVisitsForDate.filter((v: any) => new Date(v.scheduledDate).getHours() === h);
                const hLabel = h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`;
                return (
                  <div key={h} className="sps-tl-hour">
                    <div className="sps-tl-lbl">{hLabel}</div>
                    <div className="sps-tl-line">
                      {events.map((v: any) => {
                        const endTs = v.scheduledDate + (v.duration ?? 60) * 60000;
                        const isPast = endTs < now && isToday;
                        const isNow  = v.scheduledDate <= now && endTs > now && isToday;
                        return (
                          <div
                            key={v._id}
                            className={"sps-tl-ev" + (isNow ? " sps-tl-ev--now" : isPast ? " sps-tl-ev--past" : "")}
                            title={`${v.visitorName} · ${fmt(v.scheduledDate)}–${fmt(endTs)}`}
                          >
                            <strong>{fmt(v.scheduledDate)}–{fmt(endTs)}</strong> · {v.visitorName}{v.purpose ? ` · ${v.purpose}` : ""}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Booking modal */}
      {showBook && selectedRoom && (
        <div className="sps-overlay" onClick={e => { if (e.target === e.currentTarget) setShowBook(false); }}>
          <div className="sps-modal">
            <div style={{fontSize:16,fontWeight:700,color:"var(--text)",marginBottom:4}}>
              Book {selectedRoom.name}
            </div>
            <div style={{fontSize:12,color:"var(--muted)",marginBottom:20}}>{selectedDateLong}</div>

            <div className="sps-field">
              <label className="sps-lbl">Visitor name *</label>
              <input className="sps-inp" placeholder="Full name" value={bookForm.visitorName} onChange={e => setBookForm(f => ({...f, visitorName: e.target.value}))} />
            </div>
            <div className="sps-row2">
              <div className="sps-field">
                <label className="sps-lbl">Email</label>
                <input className="sps-inp" placeholder="email@example.com" value={bookForm.visitorEmail} onChange={e => setBookForm(f => ({...f, visitorEmail: e.target.value}))} />
              </div>
              <div className="sps-field">
                <label className="sps-lbl">Phone</label>
                <input className="sps-inp" placeholder="+1 234 567" value={bookForm.visitorPhone} onChange={e => setBookForm(f => ({...f, visitorPhone: e.target.value}))} />
              </div>
            </div>
            <div className="sps-row2">
              <div className="sps-field">
                <label className="sps-lbl">Time *</label>
                <input type="time" className="sps-inp" value={bookForm.time} onChange={e => setBookForm(f => ({...f, time: e.target.value}))} />
              </div>
              <div className="sps-field">
                <label className="sps-lbl">Duration</label>
                <select className="sps-inp" value={bookForm.duration} onChange={e => setBookForm(f => ({...f, duration: e.target.value}))}>
                  <option value="30">30 min</option>
                  <option value="60">1 hour</option>
                  <option value="90">1.5 hours</option>
                  <option value="120">2 hours</option>
                  <option value="180">3 hours</option>
                  <option value="240">4 hours</option>
                </select>
              </div>
            </div>
            <div className="sps-field">
              <label className="sps-lbl">Purpose</label>
              <input className="sps-inp" placeholder="e.g. Interview, Meeting, Training" value={bookForm.purpose} onChange={e => setBookForm(f => ({...f, purpose: e.target.value}))} />
            </div>
            <div className="sps-field">
              <label className="sps-lbl">Notes</label>
              <input className="sps-inp" placeholder="Any additional notes" value={bookForm.notes} onChange={e => setBookForm(f => ({...f, notes: e.target.value}))} />
            </div>

            {err && <div style={{fontSize:12,color:"#f85149",fontWeight:600,marginBottom:8}}>{err}</div>}

            <div style={{display:"flex",gap:10,marginTop:20}}>
              <button
                style={{flex:1,padding:"9px",background:"none",border:"1px solid var(--border)",borderRadius:8,fontSize:13,fontWeight:600,color:"var(--muted)",cursor:"pointer",fontFamily:"inherit"}}
                onClick={() => { setShowBook(false); setErr(""); }}
              >Cancel</button>
              <button
                style={{flex:2,padding:"9px",background:"var(--accent,#3fb950)",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",opacity:saving?0.5:1}}
                onClick={handleBook}
                disabled={saving}
              >{saving ? "Booking..." : "Confirm booking"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}