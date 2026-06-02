import { useState } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";

export function ProfilePage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName]   = useState(user?.lastName  ?? "");
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [pwStep, setPwStep]       = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw]         = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving]   = useState(false);
  const [pwError, setPwError]     = useState("");
  const [pwSaved, setPwSaved]     = useState(false);

  const avatarInitial = (user?.firstName?.[0] ?? user?.emailAddresses?.[0]?.emailAddress?.[0] ?? "?").toUpperCase();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? "";

  const handleSaveProfile = async () => {
    setSaving(true); setSaved(false);
    try {
      await user?.update({ firstName, lastName });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    setPwError("");
    if (newPw !== confirmPw) { setPwError("Passwords do not match."); return; }
    if (newPw.length < 8)    { setPwError("Password must be at least 8 characters."); return; }
    setPwSaving(true);
    try {
      await user?.updatePassword({ currentPassword: currentPw, newPassword: newPw });
      setPwSaved(true);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setPwStep(false);
      setTimeout(() => setPwSaved(false), 3000);
    } catch (e: any) {
      setPwError(e?.errors?.[0]?.message ?? "Failed to update password.");
    } finally { setPwSaving(false); }
  };

  return (
    <>
      <style>{`
        .prof-page { padding: 32px 28px; max-width: 560px; font-family: 'DM Sans', sans-serif; color: var(--text); }
        .prof-back { background: none; border: none; color: var(--muted); cursor: pointer; font-family: inherit; font-size: .85rem; font-weight: 600; display: flex; align-items: center; gap: 6px; padding: 0; margin-bottom: 24px; }
        .prof-back:hover { color: var(--text); }
        .prof-avatar-row { display: flex; align-items: center; gap: 16px; margin-bottom: 28px; }
        .prof-avatar { width: 56px; height: 56px; border-radius: 50%; background: var(--accent-bg, rgba(63,185,80,0.15)); color: var(--accent, #3fb950); font-weight: 800; font-size: 22px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .prof-avatar-info h2 { font-size: 1.1rem; font-weight: 700; margin: 0 0 2px; }
        .prof-avatar-info p  { font-size: .82rem; color: var(--muted); margin: 0; }
        .prof-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 22px; margin-bottom: 16px; }
        .prof-card-title { font-size: .78rem; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; margin-bottom: 16px; }
        .prof-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
        .prof-field:last-child { margin-bottom: 0; }
        .prof-label { font-size: 12px; font-weight: 600; color: var(--muted); }
        .prof-input { padding: 9px 12px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; font-size: .875rem; font-family: inherit; color: var(--text); outline: none; width: 100%; box-sizing: border-box; }
        .prof-input:focus { border-color: var(--accent, #3fb950); }
        .prof-input:disabled { opacity: .5; cursor: not-allowed; }
        .prof-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .prof-save-btn { margin-top: 16px; padding: 9px 22px; background: var(--accent, #3fb950); color: #fff; border: none; border-radius: 8px; font-size: .875rem; font-weight: 700; cursor: pointer; font-family: inherit; }
        .prof-save-btn:disabled { opacity: .5; cursor: not-allowed; }
        .prof-success { margin-top: 10px; font-size: .82rem; color: var(--accent, #3fb950); font-weight: 600; }
        .prof-error   { margin-top: 10px; font-size: .82rem; color: #f85149; font-weight: 600; }
        .prof-pw-btn { background: none; border: 1px solid var(--border); border-radius: 8px; padding: 9px 18px; font-size: .875rem; font-weight: 600; color: var(--muted); cursor: pointer; font-family: inherit; }
        .prof-pw-btn:hover { border-color: var(--accent, #3fb950); color: var(--accent, #3fb950); }
        .prof-danger-btn { background: none; border: 1px solid rgba(248,81,73,.4); border-radius: 8px; padding: 9px 18px; font-size: .875rem; font-weight: 600; color: #f85149; cursor: pointer; font-family: inherit; }
        .prof-danger-btn:hover { background: rgba(248,81,73,.08); }
        @media(max-width:600px) { .prof-page { padding: 20px 14px; } .prof-row { grid-template-columns: 1fr; } }
      `}</style>

      <div className="prof-page">
        <button className="prof-back" onClick={() => navigate(-1)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>

        <div className="prof-avatar-row">
          <div className="prof-avatar">{avatarInitial}</div>
          <div className="prof-avatar-info">
            <h2>{user?.firstName} {user?.lastName}</h2>
            <p>{email}</p>
          </div>
        </div>

        {/* Personal info */}
        <div className="prof-card">
          <div className="prof-card-title">Personal information</div>
          <div className="prof-row">
            <div className="prof-field">
              <label className="prof-label">First name</label>
              <input className="prof-input" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" />
            </div>
            <div className="prof-field">
              <label className="prof-label">Last name</label>
              <input className="prof-input" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" />
            </div>
          </div>
          <div className="prof-field">
            <label className="prof-label">Email address</label>
            <input className="prof-input" value={email} disabled />
          </div>
          <button className="prof-save-btn" onClick={handleSaveProfile} disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </button>
          {saved && <div className="prof-success">✓ Profile updated successfully</div>}
        </div>

        {/* Password */}
        <div className="prof-card">
          <div className="prof-card-title">Password</div>
          {!pwStep ? (
            <button className="prof-pw-btn" onClick={() => setPwStep(true)}>Change password</button>
          ) : (
            <>
              <div className="prof-field">
                <label className="prof-label">Current password</label>
                <input className="prof-input" type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="••••••••" />
              </div>
              <div className="prof-field">
                <label className="prof-label">New password</label>
                <input className="prof-input" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min. 8 characters" />
              </div>
              <div className="prof-field">
                <label className="prof-label">Confirm new password</label>
                <input className="prof-input" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Repeat new password" />
              </div>
              {pwError && <div className="prof-error">{pwError}</div>}
              {pwSaved && <div className="prof-success">✓ Password updated successfully</div>}
              <div style={{display:"flex",gap:"8px",marginTop:"14px"}}>
                <button className="prof-save-btn" onClick={handleChangePassword} disabled={pwSaving || !currentPw || !newPw || !confirmPw}>
                  {pwSaving ? "Updating..." : "Update password"}
                </button>
                <button className="prof-pw-btn" onClick={() => { setPwStep(false); setPwError(""); setCurrentPw(""); setNewPw(""); setConfirmPw(""); }}>Cancel</button>
              </div>
            </>
          )}
        </div>

        {/* Danger zone */}
        <div className="prof-card">
          <div className="prof-card-title">Account</div>
          <button className="prof-danger-btn" onClick={async () => { await signOut(); navigate("/login"); }}>Sign out</button>
        </div>
      </div>
    </>
  );
}
