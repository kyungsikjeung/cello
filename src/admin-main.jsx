import React from "react";
import { createRoot } from "react-dom/client";
import { CmsAppV2 } from "./cms/CmsAppV2.jsx";
import { AuthGate } from "./cms/AuthGate.jsx";
import "../styles.css";
import "./cms/admin.css";
import "./cms/preview-frame.css";
import "./cms/v2.css";
import "./restaurant.css";

createRoot(document.getElementById("admin-root")).render(
  <React.StrictMode>
    <AuthGate>
      {({ session, project, onLogout }) => (
        <CmsAppV2 session={session} project={project} onLogout={onLogout} />
      )}
    </AuthGate>
  </React.StrictMode>,
);
