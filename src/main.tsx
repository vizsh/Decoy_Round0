import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/sofia-sans";
import "@fontsource-variable/sofia-sans-condensed";
import "@fontsource-variable/sofia-sans-extra-condensed";
import "@fontsource-variable/martian-mono/standard.css";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
