import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useUser } from "@clerk/clerk-react";

function timeLabel(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function todayRange() {
  const d = new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return { start, end: start + 24 * 60 * 60 * 1000 };
}

export function SpacesPage() {
  const { user } = useUser();
  const staffRecord = useQuery(api.staff.getByClerkId, user?.id ? { clerkUserId: user.id } : "skip");
  const orgId = (staffRecord?.orgId ?? (user?.publicMetadata as any)?.orgId) as string | undefined;
  const rooms = useQuery(api.rooms.listActive, orgId ? { orgId } : "skip");
  const allVisits = useQuery(api.scheduling.listByOrg, orgId ? { orgId } : "skip");
  const now = Date.now();
  const { start: dayStart, end: dayEnd } = todayRange();

  const css = `
    .sps-root { padding: 24px 32px; font-family: inherit; }
    .sps-title { font-size: 20px; font-weight: 800; color: var(--text, #e6edf3); margin: 0; }
    .sps-sub { font-size: 13px; color: var(--muted, #8b949e); margin-top: 4px; }
    .sps-list { display: flex; flex-direction: column; gap: 16px; }
    .sps-card { background: var(--surface, #161b22); border: 1px solid var(--border, #30363d); border-radius: 12px; padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; }
    .sps-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .sps-card-meta { font-size: 12px; color: var(--muted, #8b949e); margin-top: 3px; display: flex; gap: 12px; flex-wrap: wrap; }
    .sps-next-free { font-size: 12px; text-align: right; flex-shrink: 0; }
    .sps-in-use { background: rgba(248,81,73,0.08); border: 1px solid rgba(248,81,73,0.2); border-radius: 8px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
    .sps-bookings-label { font-size: 11px; font-weight: 700; color: var(--muted, #8b949e); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
    .sps-booking-row { display: flex; align-items: center; gap: 10px; padding: 7px 12px; border-radius: 7px; }
    .sps-time { font-size: 11px; color: var(--muted, #8b949e); flex-shrink: 0; width: 96px; }
    @media(max-width:768px){
      .sps-root { padding: 16px 12px; }
      .sps-card { padding: 14px 14px; }
      .sps-card-top { flex-direction: column; }
      .sps-next-free { text-align: left; }
      .sps-time { width: 80px; }
    }
    @media(max-width:480px){
      .sps-booking-row { flex-wrap: wrap; gap: 6px; }
      .sps-time { width: 100%; }
    }
  `;

  if (staffRecord === undefined || rooms === undefined) {
    return (
      <>
        <style>{css}</style>
        <div className="sps-root" style={{color:"var(--muted,#8b949e)"}}>Loading...</div>
      </>
    );
  }

  if (!orgId || rooms.length === 0) {
    return (
      <>
        <style>{css}</style>
        <div className="sps-root">
          <h2 className="sps-title">Room Availability</h2>
          <p className="sps-sub">No active rooms have been set up yet. Ask your admin to add rooms.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div className="sps-root">
        <div style={{marginBottom:24}}>
          <h2 className="sps-title">Room Availability</h2>
          <p className="sps-sub">Live room availability · {new Date().toLocaleDateString([], { weekday:"long", month:"long", day:"numeric" })}</p>
        </div>
        <div className="sps-list">
          {rooms.map((room: any) => {
            const roomVisits = (allVisits ?? []).filter((v: any) =>
              v.roomId === room._id &&
              v.scheduledDate >= dayStart &&
              v.scheduledDate < dayEnd &&
              !["cancelled","no_show","rejected"].includes(v.status)
            ).sort((a: any, b: any) => a.scheduledDate - b.scheduledDate);

            const current = roomVisits.find((v: any) => {
              const end = v.scheduledDate + (v.duration ?? 60) * 60 * 1000;
              return v.scheduledDate <= now && end > now;
            });
            const next = roomVisits.find((v: any) => v.scheduledDate > now);
            const isOccupied = !!current;
            const statusColor = isOccupied ? "#f85149" : "#3fb950";
            const statusBg   = isOccupied ? "rgba(248,81,73,0.1)" : "rgba(63,185,80,0.1)";
            const nextFreeLabel = isOccupied && current
              ? `Free at ${timeLabel(current.scheduledDate + (current.duration ?? 60) * 60 * 1000)}`
              : next ? `Next booking at ${timeLabel(next.scheduledDate)}`
              : "Free for the rest of the day";

            return (
              <div key={room._id} className="sps-card">
                <div className="sps-card-top">
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:15,fontWeight:700,color:"var(--text,#e6edf3)"}}>{room.name}</span>
                      <span style={{fontSize:11,fontWeight:600,padding:"2px 10px",borderRadius:20,background:statusBg,color:statusColor,display:"flex",alignItems:"center",gap:5}}>
                        <span style={{width:6,height:6,borderRadius:"50%",background:statusColor,display:"inline-block"}}/>
                        {isOccupied ? "Occupied" : "Available"}
                      </span>
                    </div>
                    <div className="sps-card-meta">
                      {room.floor && <span>Floor {room.floor}</span>}
                      {room.capacity && <span>· Capacity {room.capacity}</span>}
                      {room.amenities?.length > 0 && <span>· {room.amenities.join(", ")}</span>}
                    </div>
                  </div>
                  <div className="sps-next-free" style={{color:isOccupied?"#f59e0b":"var(--muted,#8b949e)"}}>
                    {nextFreeLabel}
                  </div>
                </div>

                {current && (
                  <div className="sps-in-use">
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:"#f85149"}}>In use now</div>
                      <div style={{fontSize:13,color:"var(--text,#e6edf3)",marginTop:2}}>
                        {current.visitorName}
                        {current.purpose && <span style={{color:"var(--muted,#8b949e)"}}> · {current.purpose}</span>}
                      </div>
                    </div>
                    <div style={{fontSize:12,color:"var(--muted,#8b949e)",flexShrink:0}}>
                      {timeLabel(current.scheduledDate)} – {timeLabel(current.scheduledDate + (current.duration ?? 60) * 60 * 1000)}
                    </div>
                  </div>
                )}

                {roomVisits.length > 0 ? (
                  <div>
                    <div className="sps-bookings-label">Today's bookings ({roomVisits.length})</div>
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {roomVisits.map((v: any) => {
                        const endTs = v.scheduledDate + (v.duration ?? 60) * 60 * 1000;
                        const isPast = endTs < now;
                        const isNow  = v.scheduledDate <= now && endTs > now;
                        return (
                          <div key={v._id} className="sps-booking-row" style={{background:isNow?"rgba(63,185,80,0.07)":"var(--hov,#21262d)",border:`1px solid ${isNow?"rgba(63,185,80,0.2)":"transparent"}`,opacity:isPast?0.5:1}}>
                            <div className="sps-time">{timeLabel(v.scheduledDate)} – {timeLabel(endTs)}</div>
                            <div style={{flex:1,minWidth:0}}>
                              <span style={{fontSize:13,color:"var(--text,#e6edf3)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"block"}}>{v.visitorName}</span>
                              {v.purpose && <span style={{fontSize:11,color:"var(--muted,#8b949e)"}}>{v.purpose}</span>}
                            </div>
                            <div style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:12,background:isNow?"rgba(63,185,80,0.15)":isPast?"rgba(139,148,158,0.1)":"rgba(56,189,248,0.1)",color:isNow?"#3fb950":isPast?"#8b949e":"#38bdf8",flexShrink:0}}>
                              {isNow?"Now":isPast?"Done":"Upcoming"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div style={{fontSize:13,color:"var(--muted,#8b949e)",fontStyle:"italic"}}>No bookings scheduled for today</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
