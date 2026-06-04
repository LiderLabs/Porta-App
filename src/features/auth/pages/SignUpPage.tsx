import { useState, useEffect } from "react";
import { useSignUp, useUser } from "@clerk/clerk-react";

const ROLE_LANDING: Record<string, string> = {
  receptionist: "/reception/appointments",
  employee:     "/staff/home",
  pa:           "/pa/home",
  dept_head:    "/staff/home",
  admin:        "/admin/dashboard",
  superadmin:   "/admin/dashboard",
};

export default function SignUpPage() {
  const { signUp, isLoaded, setActive } = useSignUp();
  const { isSignedIn, user } = useUser();
  const [step, setStep]         = useState<"init" | "password" | "verify">("init");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [code, setCode]         = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);
  const [showCf, setShowCf]     = useState(false);

  const hasTicket = Boolean(new URLSearchParams(window.location.search).get("__clerk_ticket"));

  // Already signed in with no invite ticket — go to their dashboard
  useEffect(() => {
    if (isSignedIn && user && !hasTicket) {
      const role = (user.publicMetadata as any)?.role;
      window.location.replace(ROLE_LANDING[role] ?? "/");
    }
  }, [isSignedIn, user, hasTicket]);

  // Process the invite ticket
  useEffect(() => {
    if (!isLoaded || !signUp || step !== "init") return;
    const ticket = new URLSearchParams(window.location.search).get("__clerk_ticket");
    if (!ticket) { setStep("password"); return; }
    signUp.create({ strategy: "ticket", ticket })
      .then(() => setStep("password"))
      .catch((err: any) => {
        setError(err?.errors?.[0]?.message ?? "Invalid or expired invite link.");
        setStep("password");
      });
  }, [isLoaded, signUp, step]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8)  { setError("Password must be at least 8 characters."); return; }
    setError(""); setLoading(true);
    try {
      const result = await signUp!.update({ password });
      if (result.status === "complete") {
        await setActive!({ session: result.createdSessionId! });
        const role = (result as any)?.publicMetadata?.role ?? "";
        window.location.replace(ROLE_LANDING[role] ?? "/");
      } else if (result.status === "missing_requirements") {
        await signUp!.prepareEmailAddressVerification({ strategy: "email_code" });
        setStep("verify");
        setLoading(false);
      } else {
        await setActive!({ session: result.createdSessionId! });
        window.location.replace("/");
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? "Something went wrong.");
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const result = await signUp!.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive!({ session: result.createdSessionId! });
        window.location.replace("/");
      } else {
        setError("Verification failed. Please try again.");
        setLoading(false);
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? "Invalid code.");
      setLoading(false);
    }
  };

  if (!isLoaded || step === "init") return <div style={{ minHeight: "100vh", background: "#0d1117" }} />;

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #0d1117; color: #e6edf3; }
        .su-page { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0d1117; padding: 24px; }
        .su-card { background: #161b22; border: 1px solid #30363d; border-radius: 16px; padding: 40px 36px; width: 100%; max-width: 400px; animation: fadeUp .3s cubic-bezier(.16,1,.3,1) both; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .su-brand { text-align: center; margin-bottom: 8px; }
        .su-logo { height: 56px; width: auto; margin: 0 auto 8px; display: block; }
        .su-title { font-size: 1rem; font-weight: 700; color: #e6edf3; text-align: center; margin-bottom: 4px; }
        .su-sub { font-size: 0.83rem; color: #8b949e; text-align: center; margin-bottom: 28px; }
        .su-form { display: flex; flex-direction: column; gap: 18px; }
        .field-group { display: flex; flex-direction: column; gap: 6px; }
        .field-label { font-size: 0.8rem; font-weight: 600; color: #8b949e; }
        .field-input { background: #0d1117; border: 1px solid #30363d; border-radius: 8px; padding: 10px 14px; font-size: 0.9rem; color: #e6edf3; font-family: inherit; outline: none; transition: border-color .15s; }
        .field-input:focus { border-color: #3fb950; }
        .field-input--code { letter-spacing: 0.3em; font-size: 1.1rem; text-align: center; }
        .field-error { font-size: 0.8rem; color: #f85149; background: rgba(248,81,73,0.1); border: 1px solid rgba(248,81,73,0.3); border-radius: 8px; padding: 10px 14px; }
        .btn-primary { background: #3fb950; color: #fff; border: none; border-radius: 8px; padding: 11px; font-size: 0.9rem; font-weight: 700; cursor: pointer; font-family: inherit; transition: opacity .15s; }
        .btn-primary:hover:not(:disabled) { opacity: 0.88; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .pw-wrap { position: relative; }
        .pw-wrap .field-input { width: 100%; padding-right: 42px; }
        .pw-eye { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #8b949e; display: flex; align-items: center; padding: 0; }
        .pw-eye:hover { color: #e6edf3; }
      `}</style>
      <div className="su-page">
        <div className="su-card">
          <div className="su-brand">
            <img src="/Porta.png" alt="Porta" className="su-logo" />
          </div>
          {step === "password" ? (
            <>
              <p className="su-title">Set up your account</p>
              <p className="su-sub">Create a password to activate your invite.</p>
              {error && <p className="field-error" style={{marginBottom:16}}>{error}</p>}
              <form className="su-form" onSubmit={handleSetPassword}>
                <div className="field-group">
                  <label className="field-label">Password</label>
                  <div className="pw-wrap"><input type={showPw ? "text" : "password"} className="field-input" placeholder="Min. 8 characters" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" /><button type="button" className="pw-eye" onClick={() => setShowPw(p => !p)} tabIndex={-1}>{showPw ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}</button></div>
                </div>
                <div className="field-group">
                  <label className="field-label">Confirm password</label>
                  <div className="pw-wrap"><input type={showCf ? "text" : "password"} className="field-input" placeholder="Repeat password" value={confirm} onChange={e => setConfirm(e.target.value)} required autoComplete="new-password" /><button type="button" className="pw-eye" onClick={() => setShowCf(p => !p)} tabIndex={-1}>{showCf ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}</button></div>
                </div>
                <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Setting up..." : "Activate account"}</button>
              </form>
            </>
          ) : (
            <>
              <p className="su-title">Verify your email</p>
              <p className="su-sub">Enter the 6-digit code sent to your email.</p>
              <form className="su-form" onSubmit={handleVerify}>
                <div className="field-group">
                  <label className="field-label">Verification code</label>
                  <input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} className="field-input field-input--code" placeholder="000000" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} required autoFocus />
                </div>
                {error && <p className="field-error">{error}</p>}
                <button type="submit" className="btn-primary" disabled={loading || code.length !== 6}>{loading ? "Verifying..." : "Verify & continue"}</button>
              </form>
            </>
          )}
        </div>
      </div>
      <div style={{textAlign:"center",padding:"12px 24px",fontSize:"12px",fontWeight:600,color:"#3fb950",letterSpacing:"0.04em",opacity:0.85}}>© {new Date().getFullYear()} Porta · Powered by Lider Technologies LTD</div>
    </>
  );
}


