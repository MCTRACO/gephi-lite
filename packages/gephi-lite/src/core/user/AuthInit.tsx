import { FC, useEffect } from "react";
import { useTranslation } from "react-i18next";

import { ghProviderDeserialize } from "../cloud/github/provider";
import { useNotifications } from "../notifications";
import { useConnectedUser } from "./index";
import { loadSlice } from "../persistence/client";

/**
 * Sync user saved in localstorage with the atom.
 * Used when the application is loaded.
 */
export const AuthInit: FC = () => {
  const { t } = useTranslation();
  const { notify } = useNotifications();
  const [, setUser] = useConnectedUser();

  type SerializedUser = { id: string; name: string; avatar?: string; provider: string };

  useEffect(() => {
    loadSlice("user")
      .then((u: unknown) => {
        const su = u as Partial<SerializedUser> | null;
        if (su && typeof su.id === "string" && typeof su.name === "string" && typeof su.provider === "string") {
          setUser({ id: su.id, name: su.name, avatar: su.avatar, provider: ghProviderDeserialize(su.provider) });
        }
      })
      .catch((e) => {
        console.error("Failed to load user from backend", e);
        notify({ type: "warning", title: `${t("gephi-lite.title")}`, message: "User not loaded" });
        setUser(null);
      });
  }, [setUser, notify, t]);

  return null;
};
