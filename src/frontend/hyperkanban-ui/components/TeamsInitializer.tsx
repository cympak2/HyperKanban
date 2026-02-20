"use client";

import { useEffect } from "react";

export default function TeamsInitializer() {
  useEffect(() => {
    import("@microsoft/teams-js").then(({ app }) => {
      app.initialize().catch(() => {
        // Not running inside Teams — safe to ignore
      });
    });
  }, []);

  return null;
}
