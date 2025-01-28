import { parseWithSetsAndFunctions, stringifyWithSetsAndFunctions } from "@gephi/gephi-lite-sdk";

import { i18n } from "../../locales/provider";
import { Preferences } from "./types";

export function getEmptyPreferences(): Preferences {
  return {
    recentRemoteFiles: [],
    layoutsParameters: {},
    metrics: {},
    // default is the local detected by i18n
    locale: i18n.language,
    theme: "auto",
  };
}

export function getCurrentPreferences(): Preferences {
  try {
    const rawPreferences = localStorage.getItem("preferences");
    const preferences = rawPreferences ? parsePreferences(rawPreferences) : null;
    return { ...getEmptyPreferences(), ...preferences };
  } catch (e) {
    return getEmptyPreferences();
  }
}

/**
 * Preferences lifecycle helpers (state serialization / deserialization):
 */
export function serializePreferences(preferences: Preferences): string {
  return stringifyWithSetsAndFunctions(preferences);
}

export function parsePreferences(rawPreferences: string): Preferences | null {
  try {
    // TODO:
    // Validate the actual data
    return parseWithSetsAndFunctions(rawPreferences);
  } catch (e) {
    return null;
  }
}

export function getAppliedTheme(theme: Preferences["theme"]): "light" | "dark" {
  if (theme === "auto") {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    else return "light";
  }
  return theme;
}
