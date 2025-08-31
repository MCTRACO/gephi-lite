import { parseAppearanceState } from "@gephi/gephi-lite-sdk";
import { FC, PropsWithChildren, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import useKonami from "react-use-konami";

import { I18n } from "../locales/provider";
import { extractFilename } from "../utils/url";
import { WelcomeModal } from "../views/graphPage/modals/WelcomeModal";
import { appearanceAtom } from "./appearance";
import { useBroadcast } from "./broadcast/useBroadcast";
import { useFileActions, useGraphDatasetActions } from "./context/dataContexts";
import { fileAtom } from "./file";
import { filtersAtom } from "./filters";
import { parseFiltersState } from "./filters/utils";
import { graphDatasetAtom } from "./graph";
import { parseDataset } from "./graph/utils";
import { useModal } from "./modals";
import { useNotifications } from "./notifications";
import { preferencesAtom } from "./preferences";
import { getCurrentPreferences } from "./preferences/utils";
import { sessionAtom } from "./session";
import { getEmptySession, parseSession } from "./session/utils";
import { resetCamera } from "./sigma";
import { globalStorage } from "./storage/globalStorage";
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

    // Load session from global storage
    try {
      const rawSession = await globalStorage.getItem<string>("session");
      const parsedSession = rawSession ? parseSession(rawSession) : null;
      sessionAtom.set(parsedSession ?? getEmptySession());
    } catch (error) {
      console.warn("Failed to load session from global storage:", error);
      sessionAtom.set(getEmptySession());
    }

    // Load preferences from global storage
    try {
      const rawPreferences = await globalStorage.getItem<string>("preferences");
      const preferences = rawPreferences ? JSON.parse(rawPreferences) : getCurrentPreferences();
      preferencesAtom.set(preferences);
    } catch (error) {
      console.warn("Failed to load preferences from global storage:", error);
      preferencesAtom.set(getCurrentPreferences());
    }

    // Load file state from global storage
    try {
      const rawFile = await globalStorage.getItem<string>("file");
      if (rawFile) {
        const fileState = JSON.parse(rawFile);
        fileAtom.set(fileState);
      }
    } catch (error) {
      console.warn("Failed to load file state from global storage:", error);
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
      // Load data from global storage
      try {
        const rawDataset = await globalStorage.getItem<string>("dataset");
        const rawFilters = await globalStorage.getItem<string>("filters");
        const rawAppearance = await globalStorage.getItem<string>("appearance");

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
      } catch (error) {
        console.warn("Failed to load data from global storage:", error);
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
