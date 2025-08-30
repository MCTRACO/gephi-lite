import { gephiLiteParse, gephiLiteStringify } from "@gephi/gephi-lite-sdk";

import { globalStorage } from "../storage/globalStorage";
import { Session } from "./types";

export function getEmptySession(): Session {
  return {
    layoutsParameters: {},
    metrics: {},
  };
}

export async function getCurrentSession(): Promise<Session> {
  try {
    const session = await globalStorage.getItem<Session>("session");
    return { ...getEmptySession(), ...session };
  } catch (e) {
    console.error(e);
    return getEmptySession();
  }
}

export function getCurrentSessionSync(): Session {
  try {
    // Return empty session since sync access to global storage is not available
    // The async getCurrentSession function should be used instead
    return getEmptySession();
  } catch (e) {
    console.error(e);
    return getEmptySession();
  }
}

/**
 * Session lifecycle helpers (state serialization / deserialization):
 */
export function serializeSession(session: Session): string {
  return gephiLiteStringify(session);
}

export function parseSession(rawSession: string): Session | null {
  try {
    // Validate the actual data
    return gephiLiteParse(rawSession);
  } catch (e) {
    console.error(e);
    return null;
  }
}
