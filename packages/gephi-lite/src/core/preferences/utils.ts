import { gephiLiteParse, gephiLiteStringify } from "@gephi/gephi-lite-sdk";

import { i18n } from "../../locales/provider";
import { Preferences } from "./types";

export function getEmptyPreferences(): Preferences {
  return {
    layoutsParameters: {},
    metrics: {},
    // default is the local detected by i18n
    locale: i18n.language,
    theme: "auto",
    autoFillNewAttributes: {
      enabled: false,
      nodeAttributeNames: ["attribute"],
      edgeAttributeNames: ["attribute"],
    },
  };
}

function migrateAutoFillPreferences(storedPreferences: Partial<Preferences>): void {
  if (!storedPreferences.autoFillNewAttributes) {
    return;
  }
  
  const oldAutoFill = storedPreferences.autoFillNewAttributes as Record<string, unknown>;
  
  // Check if migration is needed (has old properties but not new ones)
  const needsMigration = (!oldAutoFill.nodeAttributeNames || !oldAutoFill.edgeAttributeNames) && (
    oldAutoFill.attributeNames !== undefined ||
    oldAutoFill.defaultValue !== undefined || 
    oldAutoFill.defaultNodeAttributeName !== undefined || 
    oldAutoFill.defaultEdgeAttributeName !== undefined
  );
  
  if (!needsMigration) {
    return;
  }
  
  let nodeNames: string[] = [];
  let edgeNames: string[] = [];
  
  // If migrating from the previous version with attributeNames array
  if (Array.isArray(oldAutoFill.attributeNames)) {
    nodeNames = [...oldAutoFill.attributeNames];
    edgeNames = [...oldAutoFill.attributeNames];
  } else {
    // Migrating from the original version with separate default names
    if (typeof oldAutoFill.defaultNodeAttributeName === 'string') {
      nodeNames.push(oldAutoFill.defaultNodeAttributeName);
    }
    if (typeof oldAutoFill.defaultEdgeAttributeName === 'string') {
      edgeNames.push(oldAutoFill.defaultEdgeAttributeName);
    }
  }
  
  // Fallback to default if no names found
  if (nodeNames.length === 0) {
    nodeNames.push("attribute");
  }
  if (edgeNames.length === 0) {
    edgeNames.push("attribute");
  }
  
  storedPreferences.autoFillNewAttributes = {
    enabled: Boolean(oldAutoFill.enabled),
    nodeAttributeNames: nodeNames,
    edgeAttributeNames: edgeNames,
  };
}

export function getCurrentPreferences(): Preferences {
  try {
    const rawPreferences = localStorage.getItem("preferences");
    const storedPreferences = rawPreferences ? parsePreferences(rawPreferences) : null;
    const defaultPreferences = getEmptyPreferences();
    
    if (!storedPreferences) {
      return defaultPreferences;
    }
    
    // Migrate old autoFillNewAttributes structure
    migrateAutoFillPreferences(storedPreferences);
    
    // Ensure autoFillNewAttributes has the correct structure
    const mergedPreferences = { ...defaultPreferences, ...storedPreferences };
    if (!Array.isArray(mergedPreferences.autoFillNewAttributes.nodeAttributeNames)) {
      mergedPreferences.autoFillNewAttributes.nodeAttributeNames = ["attribute"];
    }
    if (!Array.isArray(mergedPreferences.autoFillNewAttributes.edgeAttributeNames)) {
      mergedPreferences.autoFillNewAttributes.edgeAttributeNames = ["attribute"];
    }
    
    return mergedPreferences;
  } catch (e) {
    console.error(e);
    return getEmptyPreferences();
  }
}

/**
 * Preferences lifecycle helpers (state serialization / deserialization):
 */
export function serializePreferences(preferences: Preferences): string {
  return gephiLiteStringify(preferences);
}

export function parsePreferences(rawPreferences: string): Preferences | null {
  try {
    // TODO:
    // Validate the actual data
    return gephiLiteParse(rawPreferences);
  } catch (e) {
    console.error(e);
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
