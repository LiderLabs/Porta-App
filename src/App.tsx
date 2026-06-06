import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { useState, useEffect, useRef, createContext, useContext } from "react";
import { useUser } from "@clerk/clerk-react";
import LoginPage from "./features/auth/pages/LoginPage";
import SignUpPage from "./features/auth/pages/SignUpPage";
import AuthGuard from "./features/auth/components/AuthGuard";
import RoleRouter from "./features/auth/components/RoleRouter";
import { AdminLayout }            from "./app/layouts/AdminLayout";
import { AppLayout as ReceptionLayout } from "./app/layouts/ReceptionLayout";
import { AppLayout as StaffLayout }     from "./app/layouts/StaffLayout";
import { PALayout }               from "./app/layouts/PALayout";


import { AppointmentsPage }       from "./features/reception/pages/AppointmentsPage";
import { SchedulingPage }         from "./features/reception/pages/SchedulingPage";
import { CheckInPage }            from "./features/reception/pages/CheckInPage";
import { VisitorsPage }           from "./features/reception/pages/VisitorsPage";
import { AnalyticsPage }          from "./features/reception/pages/AnalyticsPage";
import { MessagesPage as ReceptionMessagesPage } from "./features/reception/pages/MessagesPage";
import { RoomsPage } from "./features/admin/pages/RoomsPage";
import { AdminMessagesPage } from "./features/admin/pages/AdminMessagesPage";
import { ProfilePage } from "./features/shared/ProfilePage";

import { HomePage }               from "./features/staff/pages/HomePage";
import { SchedulePage }           from "./features/staff/pages/SchedulePage";
import { SpacesPage }             from "./features/staff/pages/SpacesPage";
import { MessagesPage as StaffMessagesPage } from "./features/staff/pages/MessagesPage";

import { PAHomePage }             from "./features/pa/pages/PAHomePage";
import { PAAppointmentsPage }     from "./features/pa/pages/PAAppointmentsPage";
import { PAMessagesPage }         from "./features/pa/pages/PAMessagesPage";

import { DashboardPage }          from "./features/admin/pages/DashboardPage";
import { StaffPage }              from "./features/admin/pages/StaffPage";
import { BookingRulesPage }       from "./features/admin/pages/BookingRulesPage";
import { DepartmentsPage }        from "./features/admin/pages/DepartmentsPage";
import { SecurityPage }           from "./features/admin/pages/SecurityPage";
import { CheckInFormPage }        from "./features/admin/pages/CheckInFormPage";
import { SetupPage }              from "./features/admin/pages/SetupPage";

// -- Overlay context ----------------------------------------------------------
const OverlayCtx = createContext<{ hide: () => void }>({ hide: () => {} });
export const useHideOverlay = () => useContext(OverlayCtx);

const OVERLAY_BASE: React.CSSProperties = {
  position: "fixed", inset: 0, background: "#0d1117", zIndex: 9998,
  display: "flex", flexDirection: "column", alignItems: "center",
  justifyContent: "center", gap: 24, transition: "opacity .35s ease",
};

function WrappedRouteOverlay() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [fading,  setFading]  = useState(false);
  const prevPath  = useRef(location.pathname);
  const safetyRef = useRef<ReturnType<typeof setTimeout>>();
  const fadeRef   = useRef<ReturnType<typeof setTimeout>>();

  const hide = () => {
    setFading(true);
    clearTimeout(fadeRef.current);
    fadeRef.current = setTimeout(() => { setVisible(false); setFading(false); }, 350);
  };

  useEffect(() => {
    const from = prevPath.current;
    const to   = location.pathname;
    prevPath.current = to;
    if (from === "/login" && to !== "/login") {
      setVisible(true);
      setFading(false);
      clearTimeout(safetyRef.current);
      safetyRef.current = setTimeout(hide, 4000);
    }
  }, [location.pathname]);

  useEffect(() => () => { clearTimeout(safetyRef.current); clearTimeout(fadeRef.current); }, []);

  return (
    <OverlayCtx.Provider value={{ hide }}>
      {visible && (
        <div style={{ ...OVERLAY_BASE, opacity: fading ? 0 : 1 }}>
          <img src="/Porta.png" alt="Porta" style={{ height: 52, width: "auto", animation: "lgIn .45s cubic-bezier(.16,1,.3,1) both" }} />
          <div style={{ width: 160, height: 3, background: "#21262d", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", background: "#3fb950", borderRadius: 99, animation: "ld 3.5s cubic-bezier(.4,0,.2,1) forwards" }} />
          </div>
          <style>{`
            @keyframes lgIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
            @keyframes ld   { 0%{width:0%} 40%{width:60%} 80%{width:88%} 100%{width:95%} }
          `}</style>
        </div>
      )}
    </OverlayCtx.Provider>
  );
}

// -- Role guard: redirects away if user doesn't have the required role --------
function RoleGuard({ allowed, fallback = "/" }: { allowed: string[]; fallback?: string }) {
  const { user, isLoaded } = useUser();
  if (!isLoaded) return null;
  const role = (user?.publicMetadata as any)?.role ?? "";
  if (!allowed.includes(role)) return <Navigate to={fallback} replace />;
  return <Outlet />;
}

function AppRoutes() {
  return (
    <>
      <WrappedRouteOverlay />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />

        <Route element={<AuthGuard />}>
          <Route path="/" element={<RoleRouter />} />

          {/* Reception */}
          <Route element={<RoleGuard allowed={["receptionist"]} fallback="/" />}>
            <Route element={<ReceptionLayout />}>
              <Route path="/reception/appointments" element={<AppointmentsPage />} />
              <Route path="/reception/scheduling"   element={<SchedulingPage />} />
              <Route path="/reception/checkin"      element={<CheckInPage />} />
              <Route path="/reception/visitors"     element={<VisitorsPage />} />
              <Route path="/reception/analytics"    element={<AnalyticsPage />} />
              <Route path="/reception/messages"     element={<ReceptionMessagesPage />} />
          <Route path="/reception/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          {/* Staff (employee / dept_head) */}
          <Route element={<RoleGuard allowed={["employee","dept_head"]} fallback="/" />}>
            <Route element={<StaffLayout />}>
              <Route path="/staff/home"     element={<HomePage />} />
              <Route path="/staff/schedule" element={<SchedulePage />} />
              <Route path="/staff/messages" element={<StaffMessagesPage />} />
              <Route path="/staff/spaces"   element={<SpacesPage />} />
          <Route path="/staff/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          {/* PA / Secretary */}
          <Route element={<RoleGuard allowed={["pa"]} fallback="/" />}>
            <Route element={<PALayout />}>
              <Route path="/pa/home"         element={<PAHomePage />} />
              <Route path="/pa/appointments" element={<PAAppointmentsPage />} />
              <Route path="/pa/messages"     element={<PAMessagesPage />} />
          <Route path="/pa/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          {/* Admin */}
          <Route element={<RoleGuard allowed={["admin","superadmin"]} fallback="/" />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard"     element={<DashboardPage />} />
              <Route path="/admin/staff"         element={<StaffPage />} />
              <Route path="/admin/booking-rules" element={<BookingRulesPage />} />
              <Route path="/admin/departments"   element={<DepartmentsPage />} />
              <Route path="/admin/security"      element={<SecurityPage />} />
              <Route path="/admin/checkin-form"  element={<CheckInFormPage />} />
              <Route path="/admin/setup"         element={<SetupPage />} />
          <Route path="/admin/profile" element={<ProfilePage />} />
          <Route path="/admin/rooms" element={<RoomsPage />} />
        <Route path="/admin/messages" element={<AdminMessagesPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}




