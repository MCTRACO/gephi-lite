import { parseAppearanceState } from "@gephi/gephi-lite-sdk";
import { FC, PropsWithChildren, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import useKonami from "react-use-konami";

import { I18n } from "../locales/provider";
import { extractFilename } from "../utils/url";
import { WelcomeModal } from "../views/graphPage/modals/WelcomeModal";
import { appearanceAtom } from "./appearance";
import { getCurrentAppearance } from "./appearance/storageUtils";
import { useBroadcast } from "./broadcast/useBroadcast";
import { useFileActions, useGraphDatasetActions } from "./context/dataContexts";
import { filtersAtom } from "./filters";
import { parseFiltersState } from "./filters/utils";
import { graphDatasetAtom } from "./graph";
import { parseDataset } from "./graph/utils";
import { useModal } from "./modals";
import { useNotifications } from "./notifications";
import { preferencesAtom } from "./preferences";
import { getCurrentPreferences } from "./preferences/utils";
import { sessionAtom } from "./session";
import { getCurrentSession, getEmptySession, parseSession } from "./session/utils";
import { resetCamera } from "./sigma";
import { AuthInit } from "./user/AuthInit";

// This awful flag helps to deal with the double rendering caused from
// React.StrictMode:
// https://react.dev/reference/react/StrictMode#fixing-bugs-found-by-double-rendering-in-development
let isInitialized = false;

export const Initialize: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const { t } = useTranslation();
  const { notify } = useNotifications();
  const { openModal } = useModal();
  const { open } = useFileActions();
  const { resetGraph } = useGraphDatasetActions();
  const [broadcastID, setBroadcastID] = useState<string | null>(null);
  useBroadcast(broadcastID);

  useKonami(
    () => {
      notify({
        type: "warning",
        title: "Warning",
        message: "java.lang.RuntimeException: java.lang.NullPointerException",
      });
    },
    {
      code: [
        "ArrowUp",
        "ArrowUp",
        "ArrowDown",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "ArrowLeft",
        "ArrowRight",
        "b",
        "a",
      ],
    },
  );

  /**
   * Initialize the application by loading data from
   * - url
   * - local storage
   * - ...
   */
  const initialize = useCallback(async () => {
    if (isInitialized) return;
    isInitialized = true;

    // Load session from global storage (with fallback to local)
    try {
      const session = await getCurrentSession();
      sessionAtom.set(session);
    } catch (e) {
      console.error("Failed to load session from global storage:", e);
      // Fallback to local session storage
      sessionAtom.set(() => {
        const raw = sessionStorage.getItem("session");
        const parsed = raw ? parseSession(raw) : null;
        return parsed ?? getEmptySession();
      });
    }

    // Load preferences from global storage (with fallback to local)
    try {
      const preferences = await getCurrentPreferences();
      preferencesAtom.set(preferences);
    } catch (e) {
      console.error("Failed to load preferences from global storage:", e);
      // Fallback to local preferences  
      const raw = localStorage.getItem("preferences");
      const parsed = raw ? JSON.parse(raw) : null;
      preferencesAtom.set({ ...getEmptySession(), ...parsed });
    }

    // Load appearance from global storage (with fallback to local)
    try {
      const appearance = await getCurrentAppearance();
      appearanceAtom.set(appearance);
    } catch (e) {
      console.error("Failed to load appearance from global storage:", e);
      // Fallback to local appearance
      const raw = sessionStorage.getItem("appearance");
      const parsed = raw ? parseAppearanceState(raw) : null;
      if (parsed) {
        appearanceAtom.set(parsed);
      }
    }

    // Load a graph
    // ~~~~~~~~~~~~
    let graphFound = false;
    let showWelcomeModal = true;
    const url = new URL(window.location.href);
    const broadcastID = url.searchParams.get("broadcast");
    setBroadcastID(broadcastID);

    // If query params has new
    // => empty graph & open welcome modal
    if (url.searchParams.has("new") || broadcastID) {
      resetGraph();
      graphFound = true;
      url.searchParams.delete("new");
      window.history.pushState({}, "", url);
      showWelcomeModal = false;
    }

    // If query params has file (or GEXF, although it's deprecated)
    // => try to load the file
    if (!graphFound && (url.searchParams.has("file") || url.searchParams.has("gexf"))) {
      if (!url.searchParams.has("file") && url.searchParams.has("gexf"))
        notify({ type: "warning", message: t("error.deprecated.gexf_search_params") });

      const file = url.searchParams.get("file") || url.searchParams.get("gexf") || "";

      try {
        await open({
          type: "remote",
          filename: extractFilename(file),
          url: file,
        });
        graphFound = true;
        showWelcomeModal = false;
        // remove param in url
        url.searchParams.delete("file");
        window.history.pushState({}, "", url);
      } catch (e) {
        console.error(e);
        notify({
          type: "error",
          message: t("graph.open.remote.error") as string,
          title: t("gephi-lite.title") as string,
        });
      }
    }

    if (!graphFound) {
      // Load data from session storage first, then global storage
      let rawDataset = sessionStorage.getItem("dataset");
      const rawFilters = sessionStorage.getItem("filters");
      const rawAppearance = sessionStorage.getItem("appearance");

      // If not found in sessionStorage, try global storage
      if (!rawDataset) {
        try {
          const { globalStorage } = await import("./storage/globalStorage");
          rawDataset = await globalStorage.getItem("dataset");
        } catch (e) {
          console.warn("Failed to load dataset from global storage:", e);
        }
      }

      if (rawDataset) {
        const dataset = parseDataset(rawDataset);

        if (dataset) {
          const appearance = rawAppearance ? parseAppearanceState(rawAppearance) : null;
          const filters = rawFilters ? parseFiltersState(rawFilters) : null;

          graphDatasetAtom.set(dataset);
          filtersAtom.set((prev) => filters || prev);
          appearanceAtom.set((prev) => appearance || prev);
          resetCamera({ forceRefresh: true });

          if (dataset.fullGraph.order > 0) showWelcomeModal = false;
        }
      }
    }

    // Clean URL:
    if (broadcastID) {
      const newSearch = new URLSearchParams(location.search);
      newSearch.delete("broadcast");
      const searchStr = newSearch.toString();
      const cleanedURL = location.pathname + (searchStr ? "?" + searchStr : "");
      history.replaceState(null, "", cleanedURL);
    }

    if (showWelcomeModal)
      openModal({
        component: WelcomeModal,
        arguments: {},
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * When application is loaded
   * => run the initialize function
   */
  useEffect(() => {
    initialize().catch((error) => {
      console.error(error);
      notify({
        type: "error",
        title: t("error.title"),
        message: t("error.message"),
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialize]);

  return (
    <I18n>
      <AuthInit />
      {children}
    </I18n>
  );
};
