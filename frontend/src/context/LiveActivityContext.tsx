import { createContext, useContext, ReactNode } from "react";
import { useLiveActivity } from "../hooks/useLiveActivity";
import { useAuth } from "./AuthContext";

type LiveActivityValue = ReturnType<typeof useLiveActivity>;

const LiveActivityContext = createContext<LiveActivityValue | undefined>(undefined);

// One socket connection per session, shared across the header (notifications)
// and whichever dashboard page is mounted (activity feed), instead of each
// component opening its own.
export function LiveActivityProvider({ children }: { children: ReactNode }) {
  const { accessToken } = useAuth();
  const value = useLiveActivity(accessToken);
  return <LiveActivityContext.Provider value={value}>{children}</LiveActivityContext.Provider>;
}

export function useLiveActivityContext() {
  const ctx = useContext(LiveActivityContext);
  if (!ctx) throw new Error("useLiveActivityContext must be used within LiveActivityProvider");
  return ctx;
}
