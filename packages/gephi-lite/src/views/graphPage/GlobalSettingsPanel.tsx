import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { SettingsIcon } from "../../components/common-icons";
import { globalStorage } from "../../core/storage/globalStorage";

interface StorageStatus {
  isOnline: boolean;
  baseUrl: string;
  pendingRetries: number;
}

export const GlobalSettingsPanel: FC = () => {
  const { t } = useTranslation();
  const [storageStatus, setStorageStatus] = useState<StorageStatus>({
    isOnline: false,
    baseUrl: "",
    pendingRetries: 0,
  });
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    // Update storage status
    const updateStatus = () => {
      setStorageStatus(globalStorage.getStorageStatus());
    };

    updateStatus();
    
    // Update status every 30 seconds
    const interval = setInterval(updateStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleResetSettings = async () => {
    if (!confirm(t("settings.global-storage.reset-confirm"))) {
      return;
    }

    setIsResetting(true);
    try {
      await globalStorage.resetAllSettings();
      
      // Reload the page to reinitialize all settings
      window.location.reload();
    } catch (error) {
      console.error("Failed to reset global settings:", error);
      alert(t("settings.global-storage.reset-error"));
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      <div className="panel-block">
        <h3 className="fs-5">
          <SettingsIcon className="me-1" /> {t("settings.global-storage.title")}
        </h3>
      </div>

      <hr className="m-0" />

      <div className="panel-block-grow">
        <div className="mb-3">
          <p className="small mb-2">{t("settings.global-storage.description")}</p>
          
          <div className="d-flex align-items-center mb-2">
            <SettingsIcon className={`me-2 ${storageStatus.isOnline ? "text-success" : "text-warning"}`} />
            <span className="small">
              <strong>{t("settings.global-storage.status")}:</strong>{" "}
              {storageStatus.isOnline ? (
                <span className="text-success">{t("settings.global-storage.online")}</span>
              ) : (
                <span className="text-warning">{t("settings.global-storage.offline")}</span>
              )}
            </span>
          </div>

          <div className="small text-muted mb-2">
            <strong>{t("settings.global-storage.server-url")}:</strong> {storageStatus.baseUrl}
          </div>

          {storageStatus.pendingRetries > 0 && (
            <div className="small text-info mb-2">
              <strong>{t("settings.global-storage.pending-retries")}:</strong> {storageStatus.pendingRetries}
            </div>
          )}

          {!storageStatus.isOnline && (
            <div className="alert alert-warning small py-2 mb-3">
              {t("settings.global-storage.offline-message")}
            </div>
          )}
        </div>

        <hr className="m-0" />

        <div className="mt-3">
          <h4 className="fs-6">{t("settings.global-storage.danger-zone")}</h4>
          <p className="small text-muted mb-2">
            {t("settings.global-storage.reset-description")}
          </p>
          
          <button
            className="btn btn-sm btn-outline-danger"
            onClick={handleResetSettings}
            disabled={isResetting}
          >
            <SettingsIcon className="me-1" />
            {isResetting 
              ? t("settings.global-storage.resetting") 
              : t("settings.global-storage.reset-all")
            }
          </button>
        </div>
      </div>
    </>
  );
};
