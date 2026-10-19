import { lazy, Suspense } from "react";
import { usePath } from "@/lib/router";
import Landing from "@/pages/Landing";

const Console = lazy(() => import("@/pages/Console"));

export default function App() {
  const path = usePath();
  if (path.startsWith("/console")) {
    return (
      <Suspense fallback={<div className="hammertone min-h-svh" />}>
        <Console />
      </Suspense>
    );
  }
  return <Landing />;
}
