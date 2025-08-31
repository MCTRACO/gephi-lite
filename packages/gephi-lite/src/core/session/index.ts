import { Producer, atom, producerToAction } from "@ouestware/atoms";

import { globalStorage } from "../storage/globalStorage";
import { Session } from "./types";
import { getEmptySession, serializeSession } from "./utils";

/**
 * Producers:
 * **********
 */

/**
 * Public API:
 * ***********
 */
export const sessionAtom = atom<Session>(getEmptySession());

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
sessionAtom.bind(async (session) => {
  try {
    await globalStorage.setItem("session", serializeSession(session));
  } catch (error) {
    console.warn("Failed to save session to global storage:", error);
  }
});
