import { useConvexAuth } from "convex/react";
import { useClerk } from "@clerk/clerk-react";
import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";

export default function AuthGuard() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useClerk();
  const [slow, setSlow] = useState(false);

  // No automatic page reload. If Convex auth is slow, tell the person and let them choose.
  useEffect(() => {
    if (!isLoading) { setSlow(false); return; }
    const t = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(t);
  }, [isLoading]);

  if (isLoading) return (
    <div style={{position:"fixed",inset:0,background:"#0d1117",zIndex:9998,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:24}}>
      <img src="/Porta.png" alt="Porta" style={{height:52,width:"auto"}} />
      <div style={{width:160,height:3,background:"#21262d",borderRadius:99,overflow:"hidden"}}>
        <div style={{height:"100%",background:"#3fb950",borderRadius:99,animation:"ld 4.5s cubic-bezier(.4,0,.2,1) forwards"}} />
      </div>
      <style>{`@keyframes ld{0%{width:0%}60%{width:75%}90%{width:92%}100%{width:100%}}`}</style>
      {slow && (
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12,color:"#8b949e",fontFamily:"DM Sans,sans-serif",fontSize:14}}>
          <div>Taking longer than usual...</div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={() => window.location.reload()} style={{background:"#21262d",color:"#c9d1d9",border:"1px solid #30363d",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontFamily:"inherit"}}>Retry</button>
            <button onClick={() => signOut()} style={{background:"#21262d",color:"#c9d1d9",border:"1px solid #30363d",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontFamily:"inherit"}}>Sign out</button>
          </div>
        </div>
      )}
    </div>
  );

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}
