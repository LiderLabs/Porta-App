// @ts-nocheck
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useUser } from "@clerk/clerk-react";
import { useState, useEffect, useRef } from "react";
import { Send, MessageSquare } from "lucide-react";

export function PAMessagesPage() {
  const { user } = useUser();
  const [selectedClerkId, setSelectedClerkId] = useState(null);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef(null);

  const myStaff       = useQuery(api.staff.getByClerkId, user?.id ? { clerkUserId: user.id } : "skip");
  const allStaff      = useQuery(api.staff.list) ?? [];
  const allAssignments= useQuery(api.paAssignments.listAll) ?? [];
  const threads       = useQuery(api.directMessages.listThreads, user?.id ? { clerkUserId: user.id } : "skip") ?? [];
  const messages      = useQuery(api.directMessages.listConversation,
    selectedClerkId && user?.id ? { userAClerkId: user.id, userBClerkId: selectedClerkId } : "skip") ?? [];
  const sendMsg  = useMutation(api.directMessages.send);
  const markRead = useMutation(api.directMessages.markRead);

  const assignedStaffIds = myStaff?._id
    ? allAssignments.filter((a) => a.paStaffId === myStaff._id).map((a) => a.targetStaffId)
    : [];
  const assignedStaff = allStaff.filter((s) => assignedStaffIds.includes(s._id));

  const getUnread  = (id) => threads.find((t) => t.otherClerkId === id)?.unread ?? 0;
  const getLastMsg = (id) => threads.find((t) => t.otherClerkId === id)?.lastMessage ?? null;

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSelect = (clerkId) => {
    setSelectedClerkId(clerkId);
    if (user?.id && clerkId) markRead({ toClerkId: user.id, fromClerkId: clerkId }).catch(() => {});
  };

  const handleSend = async () => {
    if (!draft.trim() || !selectedClerkId || !user?.id) return;
    await sendMsg({ fromClerkId: user.id, toClerkId: selectedClerkId, message: draft.trim() });
    setDraft("");
  };

  const otherContacts = threads
    .filter((t) => !assignedStaff.some((s) => s.clerkUserId === t.otherClerkId))
    .map((t) => allStaff.find((s) => s.clerkUserId === t.otherClerkId) ?? { clerkUserId: t.otherClerkId, name: t.otherClerkId });

  const contacts = [...assignedStaff, ...otherContacts];
  const selectedContact = contacts.find((c) => c.clerkUserId === selectedClerkId);

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", color:"var(--text)", height:"calc(100vh - 80px)", display:"flex", flexDirection:"column" }}>
      <h1 style={{ fontSize:"1.4rem", fontWeight:700, letterSpacing:"-0.02em", marginBottom:20 }}>Messages</h1>
      <div style={{ flex:1, display:"flex", gap:16, overflow:"hidden" }}>

        {/* Contact list */}
        <div style={{ width:240, flexShrink:0, background:"var(--sidebar)", border:"1px solid var(--border)", borderRadius:12, overflow:"auto" }}>
          {assignedStaff.length > 0 && (
            <div style={{ padding:"10px 14px 4px", fontSize:"0.68rem", fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.08em" }}>My Staff</div>
          )}
          {contacts.length === 0 ? (
            <div style={{ padding:24, color:"var(--muted)", fontSize:"0.85rem", textAlign:"center" }}>
              <MessageSquare size={28} style={{ opacity:0.3, display:"block", margin:"0 auto 8px" }}/>
              No assigned staff yet.
            </div>
          ) : contacts.map((contact, i) => {
            const clerkId  = contact.clerkUserId;
            const isActive = selectedClerkId === clerkId;
            const isAssigned = assignedStaff.some((s) => s.clerkUserId === clerkId);
            const unread   = getUnread(clerkId);
            const lastMsg  = getLastMsg(clerkId);
            return (
              <div key={clerkId}>
                {!isAssigned && i === assignedStaff.length && (
                  <div style={{ padding:"10px 14px 4px", fontSize:"0.68rem", fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.08em", borderTop:"1px solid var(--border)" }}>Other</div>
                )}
                <div onClick={() => handleSelect(clerkId)} style={{
                  padding:"11px 14px", cursor:"pointer", borderBottom:"1px solid var(--border)",
                  background: isActive ? "var(--accent-bg)" : "transparent",
                  borderLeft: isActive ? "3px solid var(--accent)" : "3px solid transparent",
                }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:30, height:30, borderRadius:"50%", background:"var(--accent-bg)", color:"var(--accent)", fontWeight:700, fontSize:12, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      {contact.name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:600, fontSize:"0.875rem", color: isActive ? "var(--accent)" : "var(--text)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{contact.name ?? clerkId}</span>
                        {unread > 0 && <span style={{ background:"var(--accent)", color:"#fff", fontSize:"0.6rem", fontWeight:700, padding:"1px 6px", borderRadius:20, marginLeft:6 }}>{unread}</span>}
                      </div>
                      <div style={{ fontSize:"0.72rem", color: lastMsg ? "var(--muted)" : "var(--accent)", marginTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", opacity: lastMsg ? 1 : 0.7 }}>
                        {lastMsg ?? "Start a conversation"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Chat */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", background:"var(--sidebar)", border:"1px solid var(--border)", borderRadius:12, overflow:"hidden" }}>
          {!selectedClerkId ? (
            <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:"var(--muted)", gap:10 }}>
              <MessageSquare size={36} style={{ opacity:0.2 }}/>
              <span style={{ fontSize:"0.9rem" }}>Select a conversation</span>
            </div>
          ) : (
            <>
              <div style={{ padding:"14px 18px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:32, height:32, borderRadius:"50%", background:"var(--accent-bg)", color:"var(--accent)", fontWeight:700, fontSize:13, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {selectedContact?.name?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div>
                  <div style={{ fontWeight:700, fontSize:"0.9rem" }}>{selectedContact?.name ?? selectedClerkId}</div>
                  {selectedContact?.department && <div style={{ fontSize:"0.72rem", color:"var(--muted)" }}>{selectedContact.department}</div>}
                </div>
              </div>
              <div style={{ flex:1, overflow:"auto", padding:"16px 18px", display:"flex", flexDirection:"column", gap:10 }}>
                {messages.length === 0 && (
                  <div style={{ textAlign:"center", color:"var(--muted)", fontSize:"0.82rem", marginTop:40 }}>No messages yet. Say hello!</div>
                )}
                {messages.map((m) => {
                  const mine = m.fromClerkId === user?.id;
                  return (
                    <div key={m._id} style={{ display:"flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                      <div style={{ maxWidth:"70%", padding:"9px 14px", borderRadius:12, background: mine ? "var(--accent)" : "var(--surface)", color: mine ? "#fff" : "var(--text)", fontSize:"0.875rem" }}>
                        {m.message}
                        <div style={{ fontSize:"0.65rem", opacity:0.6, marginTop:4, textAlign: mine ? "right" : "left" }}>
                          {new Date(m.createdAt).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef}/>
              </div>
              <div style={{ padding:"12px 16px", borderTop:"1px solid var(--border)", display:"flex", gap:8 }}>
                <input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&handleSend()}
                  placeholder="Type a message…"
                  style={{ flex:1, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:8, padding:"9px 13px", color:"var(--text)", fontSize:"0.875rem", fontFamily:"inherit", outline:"none" }}/>
                <button onClick={handleSend} style={{ padding:"9px 16px", borderRadius:8, border:"none", background:"var(--accent)", color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", gap:5, fontWeight:600, fontSize:"0.82rem", fontFamily:"inherit" }}>
                  <Send size={13}/> Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
export default PAMessagesPage;

