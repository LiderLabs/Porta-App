import { useState } from "react";
import { useSignIn, useUser } from "@clerk/clerk-react";


type Step = "credentials" | "mfa";

const ROLE_LANDING: Record<string, string> = {
  receptionist: "/reception/appointments",
  employee: "/staff/home",
  pa: "/pa/home",
  dept_head: "/staff/home",
  admin: "/admin/dashboard",
  superadmin: "/admin/dashboard",
};

export default function LoginPage() {
  const { signIn, isLoaded, setActive } = useSignIn();
  const { isSignedIn, user } = useUser();
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  // Already signed in on page load — redirect immediately
  if (isSignedIn && user) {
    const role = (user.publicMetadata as any)?.role;
    window.location.replace(ROLE_LANDING[role] ?? "/staff/home");
    return <div style={{minHeight:"100vh",background:"#0d1117"}} />;
  }

  if (!isLoaded) return <div style={{minHeight:"100vh",background:"#0d1117"}} />;

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signIn) return;
    setError(""); setLoading(true);
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId! });
        window.location.replace("/");
      } else if (result.status === "needs_second_factor") {
        await signIn.prepareSecondFactor({ strategy: "email_code" });
        setStep("mfa");
        setLoading(false);
      } else {
        setError(`Unexpected status: ${result.status}`);
        setLoading(false);
      }
    } catch (err: unknown) {
      const clerkErr = (err as { errors?: { message: string; code?: string }[] })?.errors?.[0];
      if (!clerkErr || clerkErr.code === "session_exists" || clerkErr.message?.toLowerCase().includes("session")) {
        window.location.replace("/");
      } else {
        setError(clerkErr.message ?? "Invalid email or password.");
        setLoading(false);
      }
    }
  };

  const handleMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signIn) return;
    setError(""); setLoading(true);
    try {
      const result = await signIn.attemptSecondFactor({ strategy: "email_code", code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId! });
        window.location.replace("/");
      } else {
        setError(`Unexpected status: ${result.status}`);
        setLoading(false);
      }
    } catch (err: unknown) {
      setError((err as { errors?: { message: string }[] })?.errors?.[0]?.message ?? "Invalid code.");
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #0d1117; color: #e6edf3; }
        .login-page { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background: #0d1117; padding: 24px; }
        .login-card { background: #161b22; border: 1px solid #30363d; border-radius: 16px; padding: 40px 36px; width: 100%; max-width: 400px; animation: fadeUp .3s cubic-bezier(.16,1,.3,1) both; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .login-brand { text-align: center; margin-bottom: 32px; }
        .login-logo { height: 56px; width: auto; margin: 0 auto 8px; display: block; }
        .login-subtitle { font-size: 0.85rem; color: #8b949e; }
        .login-form { display: flex; flex-direction: column; gap: 18px; }
        .field-group { display: flex; flex-direction: column; gap: 6px; }
        .field-label { font-size: 0.8rem; font-weight: 600; color: #8b949e; }
        .field-input { background: #0d1117; border: 1px solid #30363d; border-radius: 8px; padding: 10px 14px; font-size: 0.9rem; color: #e6edf3; font-family: inherit; outline: none; transition: border-color .15s; }
        .field-input:focus { border-color: #3fb950; }
        .field-input--code { letter-spacing: 0.3em; font-size: 1.1rem; text-align: center; }
        .field-error { font-size: 0.8rem; color: #f85149; background: rgba(248,81,73,0.1); border: 1px solid rgba(248,81,73,0.3); border-radius: 8px; padding: 10px 14px; }
        .btn-primary { background: #3fb950; color: #fff; border: none; border-radius: 8px; padding: 11px; font-size: 0.9rem; font-weight: 700; cursor: pointer; font-family: inherit; transition: opacity .15s; }
        .btn-primary:hover:not(:disabled) { opacity: 0.88; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-ghost { background: none; border: 1px solid #30363d; border-radius: 8px; padding: 10px; font-size: 0.85rem; font-weight: 600; color: #8b949e; cursor: pointer; font-family: inherit; }
        .btn-ghost:hover { background: #21262d; color: #e6edf3; }
        .mfa-prompt { font-size: 0.85rem; color: #8b949e; text-align: center; line-height: 1.5; }
        .pw-wrap { position: relative; }
        .pw-wrap .field-input { width: 100%; padding-right: 42px; }
        .pw-eye { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #8b949e; display: flex; align-items: center; padding: 0; }
        .pw-eye:hover { color: #e6edf3; }
      `}</style>
      <div className="login-page">
        <div className="login-card">
          <div className="login-brand">
            <img src="/Porta.png" alt="Porta" className="login-logo" />
            </div>
          {step === "credentials" ? (
            <form className="login-form" onSubmit={handleCredentials}>
              <div className="field-group">
                <label className="field-label" htmlFor="email">Email address</label>
                <input id="email" type="email" className="field-input" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div className="field-group">
                <label className="field-label" htmlFor="password">Password</label>
                <div className="pw-wrap"><input id="password" type={showPw ? "text" : "password"} className="field-input" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" /><button type="button" className="pw-eye" onClick={() => setShowPw(p => !p)} tabIndex={-1}>{showPw ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}</button></div>
              </div>
              {error && <p className="field-error">{error}</p>}
              <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
            </form>
          ) : (
            <form className="login-form" onSubmit={handleMfa}>
              <p className="mfa-prompt">Enter the 6-digit code sent to your email address.</p>
              <div className="field-group">
                <label className="field-label" htmlFor="code">Authentication code</label>
                <input id="code" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} className="field-input field-input--code" placeholder="000000" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} required autoComplete="one-time-code" autoFocus />
              </div>
              {error && <p className="field-error">{error}</p>}
              <button type="submit" className="btn-primary" disabled={loading || code.length !== 6}>{loading ? "Verifying..." : "Verify"}</button>
              <button type="button" className="btn-ghost" onClick={() => { setStep("credentials"); setError(""); setCode(""); }}>Back</button>
            </form>
          )}
        </div>
      </div>
      <div style={{textAlign:"center",padding:"12px 24px",fontSize:"12px",fontWeight:600,color:"#3fb950",letterSpacing:"0.04em",opacity:0.85,position:"fixed",bottom:0,left:0,right:0}}>© {new Date().getFullYear()} Porta · Powered by Lider Technologies LTD</div>
    </>
  );
}





