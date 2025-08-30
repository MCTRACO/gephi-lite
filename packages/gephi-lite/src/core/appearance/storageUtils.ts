import { getEmptyAppearanceState, parseAppearanceState } from "@gephi/gephi-lite-sdk";

import { globalStorage } from "../storage/globalStorage";
import { AppearanceState } from "./types";

export async function getCurrentAppearance(): Promise<AppearanceState> {
  try {
    const appearance = await globalStorage.getItem<AppearanceState>("appearance");
    return { ...getEmptyAppearanceState(), ...appearance };
  } catch (e) {
    console.error(e);
    return getEmptyAppearanceState();
  }
}

export function getCurrentAppearanceSync(): AppearanceState {
  try {
    // Fallback to sessionStorage for synchronous access
    const rawAppearance = sessionStorage.getItem("appearance");
    const appearance = rawAppearance ? parseAppearanceState(rawAppearance) : null;
    return { ...getEmptyAppearanceState(), ...appearance };
  } catch (e) {
    console.error(e);
    return getEmptyAppearanceState();
  }
}

// Re-export other utility functions that might be needed
export { serializeAppearanceState, parseAppearanceState } from "@gephi/gephi-lite-sdk";
