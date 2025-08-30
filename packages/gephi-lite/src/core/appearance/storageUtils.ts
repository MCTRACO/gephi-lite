import { getEmptyAppearanceState } from "@gephi/gephi-lite-sdk";

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
    // Return empty state since sync access to global storage is not available
    // The async getCurrentAppearance function should be used instead
    return getEmptyAppearanceState();
  } catch (e) {
    console.error(e);
    return getEmptyAppearanceState();
  }
}

// Re-export other utility functions that might be needed
export { serializeAppearanceState, parseAppearanceState } from "@gephi/gephi-lite-sdk";
