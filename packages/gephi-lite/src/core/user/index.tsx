import { Producer, atom, producerToAction, useAtom } from "@ouestware/atoms";
import { isNil } from "lodash";
import { saveSlice } from "../persistence/client";

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
 * Sync. user atom in the localstorage
 */
userAtom.bind((user) => {
  if (!isNil(user)) saveSlice("user", { ...user, provider: user.provider.serialize() }).catch(() => void 0);
  else saveSlice<null>("user", null).catch(() => void 0);
});
