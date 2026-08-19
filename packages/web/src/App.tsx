import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

/**
 * Both routes are split out, which keeps react-pdf — by far the heaviest
 * dependency — out of the initial download. The editor form is usable while the
 * preview renderer is still arriving.
 */
const Editor = lazy(() =>
  import("./routes/Editor").then((module) => ({ default: module.Editor })),
);
const SharedResumeView = lazy(() =>
  import("./routes/SharedResumeView").then((module) => ({
    default: module.SharedResumeView,
  })),
);

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="loading-screen">Loading…</div>}>
        <Routes>
          <Route path="/" element={<Editor />} />
          <Route path="/r/:slug" element={<SharedResumeView />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
