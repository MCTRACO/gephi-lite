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
import { filtersAtom } from "./filters";
import { parseFiltersState } from "./filters/utils";
import { graphDatasetAtom } from "./graph";
import { parseDataset } from "./graph/utils";
import { useModal } from "./modals";
import { useNotifications } from "./notifications";
import { preferencesAtom } from "./preferences";
import { getCurrentPreferences, parsePreferences } from "./preferences/utils";
import { sessionAtom } from "./session";
import { getEmptySession, parseSession } from "./session/utils";
import { resetCamera } from "./sigma";
import { AuthInit } from "./user/AuthInit";
import { loadSlice } from "./persistence/client";
// (types imported above if needed)
import { layoutStateAtom } from "./layouts";
import { LayoutState } from "./layouts/types";

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
  const loadSession = async () => {
    try {
      const remoteSession = await loadSlice<string>("session");
      const parsed = remoteSession ? parseSession(remoteSession) : null;
      sessionAtom.set(() => parsed ?? getEmptySession());
    } catch {
      sessionAtom.set(() => getEmptySession());
    }
  };

  const loadPreferences = async () => {
    try {
      const prefs = await loadSlice<string>("preferences");
      const parsed = prefs ? parsePreferences(prefs) : null;
      preferencesAtom.set({ ...getCurrentPreferences(), ...(parsed || {}) });
    } catch {
      preferencesAtom.set(getCurrentPreferences());
    }
  };

  const loadLayout = async () => {
    try {
      const layoutState = await loadSlice<LayoutState>("layout");
      if (layoutState) layoutStateAtom.set(layoutState);
    } catch {
      // ignore
    }
  };

  const tryOpenFromUrl = async (url: URL): Promise<{ graphFound: boolean; showWelcomeModal: boolean }> => {
    let graphFound = false;
    let showWelcomeModal = true;
    const broadcastID = url.searchParams.get("broadcast");
    setBroadcastID(broadcastID);
    if (url.searchParams.has("new") || broadcastID) {
      resetGraph();
      graphFound = true;
      url.searchParams.delete("new");
      window.history.pushState({}, "", url);
      showWelcomeModal = false;
    }

    if (!graphFound && (url.searchParams.has("file") || url.searchParams.has("gexf"))) {
      if (!url.searchParams.has("file") && url.searchParams.has("gexf"))
        notify({ type: "warning", message: t("error.deprecated.gexf_search_params") });
      const file = url.searchParams.get("file") || url.searchParams.get("gexf") || "";
      try {
        await open({ type: "remote", filename: extractFilename(file), url: file });
        graphFound = true;
        showWelcomeModal = false;
        url.searchParams.delete("file");
        window.history.pushState({}, "", url);
      } catch (e) {
        console.error(e);
        notify({ type: "error", message: t("graph.open.remote.error"), title: t("gephi-lite.title") });
      }
    }
    return { graphFound, showWelcomeModal };
  };

  const loadFromBackend = async () => {
    const rawDataset = await loadSlice<string>("dataset");
    const rawFilters = await loadSlice<string>("filters");
    const rawAppearance = await loadSlice<string>("appearance");
    if (!rawDataset) return false;
    const dataset = parseDataset(rawDataset);
    if (!dataset) return false;
    const appearance = rawAppearance ? parseAppearanceState(rawAppearance) : null;
    const filters = rawFilters ? parseFiltersState(rawFilters) : null;
    graphDatasetAtom.set(dataset);
    if (filters) filtersAtom.set(() => filters);
    if (appearance) appearanceAtom.set(() => appearance);
    resetCamera({ forceRefresh: true });
    return dataset.fullGraph.order > 0;
  };

  const initialize = useCallback(async () => {
    if (isInitialized) return;
    isInitialized = true;
    await Promise.all([loadSession(), loadPreferences(), loadLayout()]);

    // Load a graph
    // ~~~~~~~~~~~~
    const url = new URL(window.location.href);
    const urlOutcome = await tryOpenFromUrl(url);
  const { graphFound } = urlOutcome;
  let { showWelcomeModal } = urlOutcome;
    if (!graphFound) {
      const loaded = await loadFromBackend();
      if (loaded) showWelcomeModal = false;
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
