import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
// @ts-ignore
import { api } from "../../../../convex/_generated/api";
import { useUser } from "@clerk/clerk-react";

export function MessagesPage() {
  const { user } = useUser();
  const myId    = user?.id ?? "";
  const myName  = user?.fullName ?? user?.firstName ?? "Me";
  const myRole  = (user?.publicMetadata?.role as string) ?? "staff";

  // All staff for contact list
  const allUsers  = useQuery(api.users.listForMessaging, myId ? { excludeClerkId: myId } : "skip");
  // Existing threads (people already messaged)
  const threads   = useQuery(api.directMessages.listThreads, { clerkUserId: myId });
  const sendMsg   = useMutation(api.directMessages.send);
  const markRead  = useMutation(api.directMessages.markRead);

  const [selected, setSelected] = useState<{ id: string; name: string; role: string } | null>(null);
  const [text, setText]         = useState("");
  const [search, setSearch]     = useState("");
  const [tab, setTab]           = useState<"chats" | "people">("chats");
  const bottomRef               = useRef<HTMLDivElement>(null);

  const conversation = useQuery(
    api.directMessages.listConversation,
    selected ? { userAClerkId: myId, userBClerkId: selected.id } : "skip"
  );

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [conversation]);
  useEffect(() => {
    if (selected) markRead({ toClerkId: myId, fromClerkId: selected.id });
  }, [selected, conversation?.length]);

  const handleSend = async () => {
    if (!text.trim() || !selected) return;
    await sendMsg({
      fromClerkId: myId, fromName: myName, fromRole: myRole,
      toClerkId: selected.id, toName: selected.name, message: text.trim(),
    });
    setText("");
  };

  const contacts = (allUsers ?? []).filter((u: any) => u.name && u.name.trim()).map((u: any) => ({ id: u.clerkUserId, name: u.name, role: u.role ?? "staff", department: u.department ?? "" }));

  // Unread map
  const unreadMap: Record<string, number> = {};
  (threads ?? []).forEach((t: any) => { unreadMap[t.otherId] = t.unread; });

  // Thread map for last message preview
  const threadMap: Record<string, any> = {};
  (threads ?? []).forEach((t: any) => { threadMap[t.otherId] = t; });

  // Filter contacts by search
  const filtered = contacts.filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.role.toLowerCase().includes(search.toLowerCase()) ||
    c.department.toLowerCase().includes(search.toLowerCase())
  );

  const contactIds = new Set(contacts.map((c: any) => c.id));
  const inboundOnly = (threads ?? []).filter((t: any) => !contactIds.has(t.otherId)).map((t: any) => ({ id: t.otherId, name: t.otherName, role: t.otherRole ?? "staff", department: "" }));
  const allChatContacts = [...contacts.filter((c: any) => threadMap[c.id]), ...inboundOnly];
  const chatContacts = allChatContacts.sort((a: any, b: any) => (threadMap[b.id]?.lastAt ?? 0) - (threadMap[a.id]?.lastAt ?? 0));

  const listToShow = tab === "chats" ? chatContacts : filtered;

  const avatarColor = (name: string) => {
    const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
    return `hsl(${hue},45%,32%)`;
  };

  return (
    <>
      <style>{`
        .cm { display: flex; height: 100%; min-height: 0; font-family: inherit; }

        /* -- Sidebar -- */
        .cm-sidebar {
          width: 260px; min-width: 260px; flex-shrink: 0;
          border-right: 1px solid var(--border);
          display: flex; flex-direction: column;
          background: var(--surface, #161b22);
        }
        .cm-sidebar-hd {
          padding: 16px 14px 10px;
          border-bottom: 1px solid var(--border);
        }
        .cm-sidebar-title {
          font-size: 15px; font-weight: 700;
          color: var(--text, var(--ink, #eee));
          margin-bottom: 10px;
        }
        .cm-search {
          display: flex; align-items: center; gap: 7px;
          background: var(--bg, #0d1117);
          border: 1px solid var(--border);
          border-radius: 8px; padding: 7px 10px;
        }
        .cm-search input {
          border: none; outline: none; background: none;
          font-size: 12px; color: var(--text, var(--ink));
          width: 100%; font-family: inherit;
        }
        .cm-search input::placeholder { color: var(--muted); }

        .cm-tabs {
          display: flex; gap: 4px;
          padding: 8px 10px 0;
        }
        .cm-tab {
          flex: 1; padding: 6px 0;
          border: none; border-radius: 7px;
          background: none; font-size: 12px; font-weight: 600;
          color: var(--muted); cursor: pointer; font-family: inherit;
          transition: all .12s;
        }
        .cm-tab:hover { background: var(--hov, #2d333b); color: var(--text, var(--ink)); }
        .cm-tab--on { background: var(--accent-bg, rgba(63,185,80,.12)); color: var(--accent, var(--brand, #3fb950)); }

        .cm-contact-list { flex: 1; overflow-y: auto; padding: 6px 0; }
        .cm-contact {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 14px; cursor: pointer;
          transition: background .12s; position: relative;
        }
        .cm-contact:hover { background: var(--hov, #2d333b); }
        .cm-contact--active {
          background: var(--accent-bg, rgba(63,185,80,.12));
          border-left: 3px solid var(--accent, var(--brand, #3fb950));
        }
        .cm-av {
          width: 36px; height: 36px; border-radius: 50%;
          color: #fff; display: flex; align-items: center;
          justify-content: center; font-weight: 700; font-size: 14px;
          flex-shrink: 0;
        }
        .cm-contact-name { font-size: 13px; font-weight: 600; color: var(--text, var(--ink)); }
        .cm-contact-sub  { font-size: 11px; color: var(--muted); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; }
        .cm-badge {
          margin-left: auto; min-width: 18px; height: 18px;
          background: var(--accent, var(--brand)); color: #fff;
          border-radius: 9px; font-size: 10px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          padding: 0 5px; flex-shrink: 0;
        }
        .cm-empty-list { padding: 24px 14px; text-align: center; font-size: 12px; color: var(--muted); line-height: 1.6; }

        /* -- Chat -- */
        .cm-chat { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        .cm-chat-hd {
          padding: 12px 20px;
          border-bottom: 1px solid var(--border);
          display: flex; align-items: center; gap: 10px;
          background: var(--surface, #161b22); flex-shrink: 0;
        }
        .cm-chat-hd-name { font-size: 14px; font-weight: 700; color: var(--text, var(--ink)); }
        .cm-chat-hd-role { font-size: 11px; color: var(--muted); }
        .cm-messages {
          flex: 1; overflow-y: auto;
          padding: 16px 20px;
          display: flex; flex-direction: column; gap: 8px;
        }
        .cm-placeholder {
          flex: 1; display: flex; align-items: center;
          justify-content: center; flex-direction: column;
          gap: 10px; color: var(--muted);
        }
        .cm-date { text-align: center; font-size: 11px; color: var(--muted); margin: 4px 0; }
        .cm-bwrap { display: flex; flex-direction: column; }
        .cm-bwrap--self  { align-items: flex-end; }
        .cm-bwrap--other { align-items: flex-start; }
        .cm-bubble {
          max-width: 70%; padding: 8px 12px;
          border-radius: 14px; font-size: 13px;
          line-height: 1.5; word-break: break-word;
        }
        .cm-bubble--self  { background: var(--accent, var(--brand)); color: #fff; border-bottom-right-radius: 4px; }
        .cm-bubble--other { background: var(--surface, #21262d); color: var(--text, var(--ink)); border: 1px solid var(--border); border-bottom-left-radius: 4px; }
        .cm-meta { font-size: 10px; color: var(--muted); margin-top: 3px; padding: 0 4px; }
        .cm-input-row {
          padding: 10px 16px;
          border-top: 1px solid var(--border);
          display: flex; gap: 8px; align-items: flex-end;
          background: var(--surface, #161b22); flex-shrink: 0;
        }
        .cm-input {
          flex: 1; padding: 8px 12px;
          border-radius: 10px; border: 1px solid var(--border);
          background: var(--bg, #0d1117); color: var(--text, var(--ink));
          font-size: 13px; font-family: inherit; outline: none;
          resize: none; min-height: 36px; max-height: 100px;
        }
        .cm-input:focus { border-color: var(--accent, var(--brand)); }
        .cm-send {
          padding: 8px 16px; border-radius: 10px;
          background: var(--accent, var(--brand)); color: #fff;
          border: none; font-size: 13px; font-weight: 600;
          cursor: pointer; font-family: inherit; flex-shrink: 0;
          transition: opacity .12s;
        }
        .cm-send:disabled { opacity: .4; cursor: not-allowed; }
      `}</style>

      <div className="cm">
        {/* Sidebar */}
        <div className="cm-sidebar">
          <div className="cm-sidebar-hd">
            <div className="cm-sidebar-title">Messages</div>
            <div className="cm-search">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input placeholder="Search people..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="cm-tabs">
              <button className={`cm-tab${tab === "chats" ? " cm-tab--on" : ""}`} onClick={() => setTab("chats")}>Chats</button>
              <button className={`cm-tab${tab === "people" ? " cm-tab--on" : ""}`} onClick={() => setTab("people")}>People</button>
            </div>
          </div>

          <div className="cm-contact-list">
            {tab === "chats" && chatContacts.length === 0 && (
              <div className="cm-empty-list">No chats yet.<br />Go to People to start a conversation.</div>
            )}
            {tab === "people" && filtered.length === 0 && (
              <div className="cm-empty-list">{contacts.length === 0 ? "No staff found.\nStaff must log in first." : "No results."}</div>
            )}
            {listToShow.map((c: any) => {
              const thread = threadMap[c.id];
              const unread = unreadMap[c.id] ?? 0;
              const isActive = selected?.id === c.id;
              return (
                <div
                  key={c.id}
                  className={`cm-contact${isActive ? " cm-contact--active" : ""}`}
                  onClick={() => { setSelected(c); setTab("chats"); }}
                >
                  <div className="cm-av" style={{ background: avatarColor(c.name) }}>
                    {(c.name?.[0] ?? "?").toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="cm-contact-name">{c.name}</div>
                    <div className="cm-contact-sub">
                      {thread ? thread.lastMessage : (c.department || c.role)}
                    </div>
                  </div>
                  {unread > 0 && <div className="cm-badge">{unread}</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat area */}
        <div className="cm-chat">
          {!selected ? (
            <div className="cm-placeholder">
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Select someone to message</div>
              <div style={{ fontSize: 12 }}>Use the People tab to start a new chat</div>
            </div>
          ) : (
            <>
              <div className="cm-chat-hd">
                <div className="cm-av" style={{ width: 30, height: 30, fontSize: 12, background: avatarColor(selected.name) }}>
                  {selected.name[0].toUpperCase()}
                </div>
                <div>
                  <div className="cm-chat-hd-name">{selected.name}</div>
                  <div className="cm-chat-hd-role">{selected.role}</div>
                </div>
              </div>

              <div className="cm-messages">
                {conversation === undefined ? (
                  <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 12 }}>Loading...</div>
                ) : conversation.length === 0 ? (
                  <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 12, marginTop: 40 }}>
                    No messages yet. Say hello!
                  </div>
                ) : conversation.map((m: any, i: number) => {
                  const isSelf = m.fromClerkId === myId;
                  const showDate = i === 0 ||
                    new Date(m.createdAt).toDateString() !== new Date(conversation[i - 1].createdAt).toDateString();
                  return (
                    <div key={m._id}>
                      {showDate && (
                        <div className="cm-date">
                          {new Date(m.createdAt).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                        </div>
                      )}
                      <div className={`cm-bwrap cm-bwrap--${isSelf ? "self" : "other"}`}>
                        <div className={`cm-bubble cm-bubble--${isSelf ? "self" : "other"}`}>{m.message}</div>
                        <div className="cm-meta">
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <div className="cm-input-row">
                <textarea
                  className="cm-input"
                  placeholder={`Message ${selected.name}...`}
                  value={text}
                  rows={1}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                />
                <button className="cm-send" disabled={!text.trim()} onClick={handleSend}>Send</button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

