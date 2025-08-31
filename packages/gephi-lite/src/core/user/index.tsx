import { Producer, atom, producerToAction, useAtom } from "@ouestware/atoms";
import { isNil } from "lodash";

import { globalStorage } from "../storage/globalStorage";
import { User } from "./types";

export const LS_USER_KEY = "user";
type UserState = User | null;

export function useConnectedUser() {
  return useAtom(userAtom);
}

export const reset: Producer<UserState> = () => {
  return () => null;
};

/**
 * Public API:
 * ***********
 */
export const userAtom = atom<UserState>(null);

export const userActions = {
  reset: producerToAction(reset, userAtom),
};

/**
 * Sync. user atom in the global storage
 */
userAtom.bind(async (user) => {
  try {
    if (!isNil(user)) {
      await globalStorage.setItem(LS_USER_KEY, JSON.stringify({ ...user, provider: user.provider.serialize() }));
    } else {
      await globalStorage.removeItem(LS_USER_KEY);
    }
  } catch (error) {
    console.warn("Failed to save user to global storage:", error);
  }
});
