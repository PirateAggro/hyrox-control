"use client";

import { useEffect } from "react";
import { closeStaleSessions } from "./actions";

/** Tanca les sessions que un tall ha deixat obertes (01 §1). No pinta res. */
export function CloseStale() {
  useEffect(() => {
    closeStaleSessions().catch(() => {});
  }, []);
  return null;
}
