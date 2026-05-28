import { useUser } from "@clerk/clerk-react";
import { Navigate } from "react-router-dom";

const ROLE_LANDING: Record<string, string> = {
  receptionist: "/reception/appointments",
  employee: "/staff/home",
  pa: "/pa/home",
  dept_head: "/staff/home",
  admin: "/admin/dashboard",
  superadmin: "/admin/dashboard",
};

const Splash = () => (
  <div style={{position:"fixed",inset:0,background:"#0d1117",zIndex:9998,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:24}}>
    <img src="/Porta.png" alt="Porta" style={{height:52,width:"auto",opacity:0,animation:"lgIn .5s cubic-bezier(.16,1,.3,1) .1s forwards"}} />
    <div style={{width:160,height:3,background:"#21262d",borderRadius:99,overflow:"hidden"}}>
      <div style={{height:"100%",background:"#3fb950",borderRadius:99,animation:"ld 2.5s cubic-bezier(.4,0,.2,1) forwards"}} />
    </div>
    <style>{`
      @keyframes lgIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      @keyframes ld{0%{width:0%}40%{width:60%}80%{width:88%}100%{width:95%}}
    `}</style>
  </div>
);

export default function RoleRouter() {
  const { isLoaded, user } = useUser();

  // Wait for Clerk to fully load — show splash the whole time
  if (!isLoaded) return <Splash />;

  // isLoaded but no user = genuinely not logged in
  if (!user) return <Navigate to="/login" replace />;

  const role = (user.publicMetadata as any)?.role;
  console.log("RoleRouter: user=", user?.id, "role=", role, "metadata=", JSON.stringify(user?.publicMetadata));
  if (!role) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#0d1117",color:"#8b949e",fontFamily:"DM Sans,sans-serif"}}>
      Account not configured. Contact your admin.
    </div>
  );
  return <Navigate to={ROLE_LANDING[role] ?? "/staff/home"} replace />;
}

