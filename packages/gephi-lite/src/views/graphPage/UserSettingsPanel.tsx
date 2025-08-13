import { FC } from "react";
import { useTranslation } from "react-i18next";

import LocalSwitcher from "../../components/LocalSwitcher";
import { ThemeSwicther } from "../../components/ThemeSwitcher";
import { Toggle } from "../../components/Toggle";
import { DangerIcon, GitHubIcon, SettingsIcon, SignOutIcon, SingInIcon } from "../../components/common-icons";
import { SignInModal } from "../../components/user/SignInModal";
import { resetStates, usePreferences, usePreferencesActions } from "../../core/context/dataContexts";
import { useModal } from "../../core/modals";
import { useNotifications } from "../../core/notifications";
import { useConnectedUser } from "../../core/user";
import ConfirmModal from "./modals/ConfirmModal";

export const UserSettingsPanel: FC = () => {
  const { openModal } = useModal();
  const { notify } = useNotifications();
  const [user, setUser] = useConnectedUser();
  const { t } = useTranslation("translation");
  const preferences = usePreferences();
  const { setAutoFillNewAttributes } = usePreferencesActions();

  return (
    <>
      <div className="panel-block">
        <h2 className="fs-4">
          <SettingsIcon className="me-1" /> {t("settings.title")}
        </h2>
      </div>

      <hr className="m-0" />

      <div className="panel-block-grow">
        <div className="d-flex flex-row mb-3 align-items-center">
          <span className="flex-grow-1">{t("github.select_ui_language")}</span>
          <LocalSwitcher />
        </div>
        <hr className="m-0" />
        <div className="d-flex flex-row my-3 align-items-center">
          <span className="flex-grow-1">{t("settings.theme")}</span>
          <ThemeSwicther />
        </div>
        <hr className="m-0" />
        <div className="my-3">
          <div className="d-flex flex-row align-items-center mb-2">
            <span className="flex-grow-1">{t("settings.autoFillNewAttributes.title")}</span>
            <Toggle
              value={preferences.autoFillNewAttributes.enabled}
              onChange={(enabled) => 
                setAutoFillNewAttributes({
                  ...preferences.autoFillNewAttributes,
                  enabled,
                })
              }
              leftLabel={t("common.off")}
              rightLabel={t("common.on")}
            />
          </div>
          {preferences.autoFillNewAttributes.enabled && (
            <div className="d-flex flex-column gap-3">
              {/* Node Attributes Section */}
              <div className="border rounded p-3">
                <h6 className="mb-3">{t("settings.autoFillNewAttributes.nodeAttributes")}</h6>
                <div className="d-flex flex-column gap-2">
                  {(preferences.autoFillNewAttributes.nodeAttributeNames || ["attribute"]).map((name, index) => (
                    <div key={`node-attribute-${index}-${name}`} className="d-flex flex-row align-items-center gap-2">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={name}
                        onChange={(e) => {
                          const currentNames = preferences.autoFillNewAttributes.nodeAttributeNames || ["attribute"];
                          const newNames = [...currentNames];
                          newNames[index] = e.target.value;
                          setAutoFillNewAttributes({
                            ...preferences.autoFillNewAttributes,
                            nodeAttributeNames: newNames,
                          });
                        }}
                        placeholder={t("settings.autoFillNewAttributes.attributeNamePlaceholder")}
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => {
                          const currentNames = preferences.autoFillNewAttributes.nodeAttributeNames || ["attribute"];
                          const newNames = currentNames.filter((_, i) => i !== index);
                          setAutoFillNewAttributes({
                            ...preferences.autoFillNewAttributes,
                            nodeAttributeNames: newNames,
                          });
                        }}
                        disabled={(preferences.autoFillNewAttributes.nodeAttributeNames || ["attribute"]).length <= 1}
                      >
                        {t("common.remove")}
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => {
                      const currentNames = preferences.autoFillNewAttributes.nodeAttributeNames || ["attribute"];
                      setAutoFillNewAttributes({
                        ...preferences.autoFillNewAttributes,
                        nodeAttributeNames: [...currentNames, ""],
                      });
                    }}
                  >
                    {t("settings.autoFillNewAttributes.addNodeAttributeName")}
                  </button>
                </div>
              </div>

              {/* Edge Attributes Section */}
              <div className="border rounded p-3">
                <h6 className="mb-3">{t("settings.autoFillNewAttributes.edgeAttributes")}</h6>
                <div className="d-flex flex-column gap-2">
                  {(preferences.autoFillNewAttributes.edgeAttributeNames || ["attribute"]).map((name, index) => (
                    <div key={`edge-attribute-${index}-${name}`} className="d-flex flex-row align-items-center gap-2">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={name}
                        onChange={(e) => {
                          const currentNames = preferences.autoFillNewAttributes.edgeAttributeNames || ["attribute"];
                          const newNames = [...currentNames];
                          newNames[index] = e.target.value;
                          setAutoFillNewAttributes({
                            ...preferences.autoFillNewAttributes,
                            edgeAttributeNames: newNames,
                          });
                        }}
                        placeholder={t("settings.autoFillNewAttributes.attributeNamePlaceholder")}
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => {
                          const currentNames = preferences.autoFillNewAttributes.edgeAttributeNames || ["attribute"];
                          const newNames = currentNames.filter((_, i) => i !== index);
                          setAutoFillNewAttributes({
                            ...preferences.autoFillNewAttributes,
                            edgeAttributeNames: newNames,
                          });
                        }}
                        disabled={(preferences.autoFillNewAttributes.edgeAttributeNames || ["attribute"]).length <= 1}
                      >
                        {t("common.remove")}
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => {
                      const currentNames = preferences.autoFillNewAttributes.edgeAttributeNames || ["attribute"];
                      setAutoFillNewAttributes({
                        ...preferences.autoFillNewAttributes,
                        edgeAttributeNames: [...currentNames, ""],
                      });
                    }}
                  >
                    {t("settings.autoFillNewAttributes.addEdgeAttributeName")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        <hr className="m-0" />
        <h3 className="fs-5 mt-3">
          <GitHubIcon /> {t("github.title")}
        </h3>
        {!user && (
          <>
            <p className="small">{t("github.description")}</p>
            <div className="text-center">
              <button
                className="btn btn-sm btn-outline-dark"
                title={t("auth.sign_in").toString()}
                onClick={() => openModal({ component: SignInModal, arguments: {} })}
              >
                <SingInIcon className="me-1" />
                {t("auth.sign_in")}
              </button>
            </div>
          </>
        )}
        {user && (
          <>
            <p className="small m-0">{t("github.logged_as", { username: user.name })}</p>
            <div className="text-center">
              <button
                className="btn btn-sm btn-outline-dark"
                title={t("auth.sign_out").toString()}
                onClick={() => {
                  setUser(null);
                  notify({
                    type: "success",
                    message: t("auth.unauth_success").toString(),
                  });
                }}
              >
                <SignOutIcon className="me-1" /> {t("auth.sign_out")}
              </button>
            </div>
          </>
        )}
      </div>
      <div className="d-flex justify-content-center">
        <button
          className="btn btn-danger m-3"
          onClick={() => {
            openModal({
              component: ConfirmModal,
              arguments: {
                title: t("settings.danger-zone.reset-state.title"),
                message: t("settings.danger-zone.reset-state.description"),
                successMsg: t("settings.danger-zone.reset-state.success"),
              },
              beforeSubmit: () => {
                resetStates(true);
              },
            });
          }}
        >
          <DangerIcon />
          &nbsp;
          {t("settings.danger-zone.reset-state.title")}
        </button>
      </div>
    </>
  );
};
