import { useConvexAuth } from "convex/react";
import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useRef } from "react";

export default function AuthGuard() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (isLoading) {
      // If Convex takes more than 5s, force a page reload to break the deadlock
      timerRef.current = setTimeout(() => window.location.reload(), 5000);
    } else {
      clearTimeout(timerRef.current);
    }
    return () => clearTimeout(timerRef.current);
  }, [isLoading]);

  if (isLoading) return (
    <div style={{position:"fixed",inset:0,background:"#0d1117",zIndex:9998,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:24}}>
      <img src="/Porta.png" alt="Porta" style={{height:52,width:"auto"}} />
      <div style={{width:160,height:3,background:"#21262d",borderRadius:99,overflow:"hidden"}}>
        <div style={{height:"100%",background:"#3fb950",borderRadius:99,animation:"ld 4.5s cubic-bezier(.4,0,.2,1) forwards"}} />
      </div>
      <style>{`@keyframes ld{0%{width:0%}60%{width:75%}90%{width:92%}100%{width:100%}}`}</style>
    </div>
  );

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}
