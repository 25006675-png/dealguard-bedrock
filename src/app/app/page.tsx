import type { Metadata } from "next";
import { AppClient } from "./AppClient";

export const metadata: Metadata = { title: "Review a deal · DealGuard MY" };

export default function AppPage() {
  return <AppClient />;
}
