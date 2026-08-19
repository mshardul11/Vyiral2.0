import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Editor } from "./routes/Editor";
import { SharedResumeView } from "./routes/SharedResumeView";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Editor />} />
        <Route path="/r/:slug" element={<SharedResumeView />} />
      </Routes>
    </BrowserRouter>
  );
}
