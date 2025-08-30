import { Producer, atom, producerToAction } from "@ouestware/atoms";

import { globalStorage } from "../storage/globalStorage";
import { Preferences } from "./types";
import { getAppliedTheme, getCurrentPreferencesSync, serializePreferences } from "./utils";

/**
 * Producers:
 * **********
 */
const changeLocale: Producer<Preferences, [string]> = (locale) => {
  // save the new locale in the state
  return (preferences) => ({
    ...preferences,
    locale,
  });
};

const changeTheme: Producer<Preferences, [Preferences["theme"]]> = (theme) => {
  return (preferences) => ({
    ...preferences,
    theme,
  });
};

/**
 * Public API:
 * ***********
 */
export const preferencesAtom = atom<Preferences>(getCurrentPreferencesSync());

export const preferencesActions = {
  changeLocale: producerToAction(changeLocale, preferencesAtom),
  changeTheme: producerToAction(changeTheme, preferencesAtom),
};

/**
 * Bindings:
 * *********
 */
preferencesAtom.bind((preferences, prevPreferences) => {
  // Save to global storage (async)
  globalStorage.setItem("preferences", preferences).catch(console.error);
  
  // Keep localStorage as backup for sync access
  localStorage.setItem("preferences", serializePreferences(preferences));

  // Apply theme change
  if (prevPreferences.theme !== preferences.theme || !document.documentElement.getAttribute("data-bs-theme")) {
    document.documentElement.setAttribute("data-bs-theme", getAppliedTheme(preferences.theme));
  }
});
