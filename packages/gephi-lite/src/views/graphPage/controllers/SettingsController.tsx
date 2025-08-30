import { useSigma } from "@react-sigma/core";
import { FC, useEffect } from "react";
import { drawDiscNodeLabel, drawStraightEdgeLabel } from "sigma/rendering";
import { DEFAULT_SETTINGS, Settings } from "sigma/settings";

import { getDrawEdgeLabel, getDrawNodeLabel } from "../../../core/appearance/utils";
import { useAppearance, useGraphDataset, usePreferences } from "../../../core/context/dataContexts";
import { getAppliedTheme } from "../../../core/preferences/utils";
import { resetCamera, sigmaAtom } from "../../../core/sigma";
import { drawDiscNodeHover } from "../../../core/sigma/utils";
import { inputToStateThreshold } from "../../../utils/labels";

export const SettingsController: FC<{ setIsReady: () => void }> = ({ setIsReady }) => {
  const sigma = useSigma();
  const graphDataset = useGraphDataset();
  const graphAppearance = useAppearance();
  const { theme } = usePreferences();

  useEffect(() => {
    // @ts-expect-error - Sigma type mismatch with atoms
    sigmaAtom.set(sigma);
    
    // Only reset camera if there's no graph data loaded
    // This prevents overriding stored camera positions
    const dataset = graphDataset;
    if (dataset.fullGraph.order === 0) {
      resetCamera({ forceRefresh: true });
    }
  }, [sigma, graphDataset]);

  useEffect(() => {
    const mode = getAppliedTheme(theme);
    sigma.setSetting("labelColor", { color: mode === "dark" ? "#FFF" : "#000" });
    sigma.setSetting("edgeLabelColor", { color: mode === "dark" ? "#495057" : "#CCC" });
    sigma.setSetting("nodeHoverBackgroundColor" as keyof Settings, mode === "dark" ? "#000" : "#FFF");
    sigma.setSetting("renderEdgeLabels", graphAppearance.edgesLabel.type !== "none");
    sigma.setSetting("zIndex", graphAppearance.edgesZIndex.type !== "none");
    sigma.setSetting("defaultDrawNodeLabel", getDrawNodeLabel(graphAppearance, drawDiscNodeLabel));
    sigma.setSetting("defaultDrawNodeHover", getDrawNodeLabel(graphAppearance, drawDiscNodeHover));
    sigma.setSetting("defaultDrawEdgeLabel", getDrawEdgeLabel(graphAppearance, drawStraightEdgeLabel));

    const labelThreshold = inputToStateThreshold(graphAppearance.nodesLabelSize.density);
    const labelDensity = labelThreshold === 0 ? Infinity : DEFAULT_SETTINGS.labelDensity;
    sigma.setSetting("labelRenderedSizeThreshold", labelThreshold);
    sigma.setSetting("labelDensity", labelDensity);

    setIsReady();
  }, [graphAppearance, graphDataset, setIsReady, sigma, theme]);

  return null;
};
