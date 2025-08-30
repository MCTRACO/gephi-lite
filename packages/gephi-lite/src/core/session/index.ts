import { Producer, atom, producerToAction } from "@ouestware/atoms";

import { globalStorage } from "../storage/globalStorage";
import { Session } from "./types";
import { getCurrentSessionSync, getEmptySession } from "./utils";

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
  // Save to global storage only
  globalStorage.setItem("session", session).catch(console.error);
});
