"use client";

import dynamic from "next/dynamic";

// Client-only: the app reads per-device settings (red lines) and the URL on first render.
const DealGuardApp = dynamic(() => import("@/components/DealGuardApp").then((m) => m.DealGuardApp), {
  ssr: false,
  loading: () => <div className="min-h-screen" />,
});

export function AppClient() {
  return <DealGuardApp />;
}
