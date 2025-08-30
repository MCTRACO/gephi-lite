/**
 * Camera state persistence for Sigma.js
 */
import { atom } from "@ouestware/atoms";
import { CameraState } from "sigma/types";

import { globalStorage } from "../storage/globalStorage";
import { sigmaAtom } from "./index";

interface CameraStateWithTimestamp extends CameraState {
  timestamp: number;
}

function getEmptyCameraState(): CameraState {
  return { angle: 0, x: 0.5, y: 0.5, ratio: 1 };
}

async function getStoredCameraState(): Promise<CameraState> {
  try {
    const stored = await globalStorage.getItem<CameraStateWithTimestamp>("cameraState");
    if (stored) {
      // Check if the stored state is not too old (e.g., older than 24 hours)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      if (Date.now() - stored.timestamp < maxAge) {
        const { timestamp, ...cameraState } = stored;
        return cameraState;
      }
    }
  } catch (error) {
    console.warn("Failed to load camera state from global storage:", error);
  }
  
  // Fallback to localStorage
  try {
    const localStored = localStorage.getItem("global_cameraState");
    if (localStored) {
      const parsed = JSON.parse(localStored) as CameraStateWithTimestamp;
      if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
        const { timestamp, ...cameraState } = parsed;
        return cameraState;
      }
    }
  } catch (error) {
    console.warn("Failed to load camera state from localStorage:", error);
  }
  
  return getEmptyCameraState();
}

export const cameraStateAtom = atom<CameraState>(getEmptyCameraState());

/**
 * Save camera state to global storage (with debouncing to avoid too many saves)
 */
let saveTimeout: NodeJS.Timeout | null = null;
function saveCameraState(state: CameraState) {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  
  saveTimeout = setTimeout(() => {
    const stateWithTimestamp: CameraStateWithTimestamp = {
      ...state,
      timestamp: Date.now(),
    };
    
    globalStorage.setItem("cameraState", stateWithTimestamp).catch(console.error);
    localStorage.setItem("global_cameraState", JSON.stringify(stateWithTimestamp));
  }, 1000); // Debounce for 1 second
}

/**
 * Initialize camera state from storage
 */
export async function initializeCameraState(): Promise<void> {
  const storedState = await getStoredCameraState();
  cameraStateAtom.set(storedState);
  
  // Apply the stored state to sigma if it exists
  const sigma = sigmaAtom.get();
  if (sigma) {
    sigma.getCamera().setState(storedState);
  }
}

/**
 * Bind camera state changes to save to storage
 */
export function bindCameraStateToStorage(): (() => void) | undefined {
  const sigma = sigmaAtom.get();
  if (!sigma) return undefined;
  
  const camera = sigma.getCamera();
  
  // Listen for camera state changes
  const updateCameraState = () => {
    const currentState = camera.getState();
    cameraStateAtom.set(currentState);
    saveCameraState(currentState);
  };
  
  // Bind to camera events
  camera.on("updated", updateCameraState);
  
  // Return cleanup function
  return () => {
    camera.off("updated", updateCameraState);
  };
}

/**
 * Apply stored camera state to sigma (call this after sigma is initialized)
 */
export function applyCameraState(): void {
  const sigma = sigmaAtom.get();
  const currentState = cameraStateAtom.get();
  
  if (sigma && currentState) {
    sigma.getCamera().setState(currentState);
  }
}
