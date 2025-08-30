import { Producer, atom, producerToAction } from "@ouestware/atoms";

import { globalStorage } from "../storage/globalStorage";
import { Session } from "./types";
import { getCurrentSessionSync, getEmptySession, serializeSession } from "./utils";

/**
 * Producers:
 * **********
 */

/**
 * Public API:
 * ***********
 */
export const sessionAtom = atom<Session>(getCurrentSessionSync());

export const reset: Producer<Session, []> = () => {
  return () => getEmptySession();
};

export const sessionActions = {
  reset: producerToAction(reset, sessionAtom),
};

/**
 * Bindings:
 * *********
 */
sessionAtom.bind((session) => {
  // Save to global storage (async)
  globalStorage.setItem("session", session).catch(console.error);
  
  // Keep sessionStorage as backup for sync access
  sessionStorage.setItem("session", serializeSession(session));
});
