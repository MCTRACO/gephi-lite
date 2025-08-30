/**
 * Global settings storage service that stores settings on the server
 * instead of local/session storage for persistence across browsers and sessions
 */

export interface StorageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

class GlobalStorageService {
  private readonly baseUrl: string;
  private isOnline: boolean = true;
  private retryQueue: Array<{ key: string; data: unknown; timestamp: number }> = [];

  constructor() {
    // Try to detect if storage server is running locally
    this.baseUrl = this.detectStorageServerUrl();
    this.setupOnlineDetection();
    this.setupRetryMechanism();
  }

  private detectStorageServerUrl(): string {
    // Check if we're in development or production
  const isDev = (import.meta as unknown as { env?: Record<string, unknown> }).env?.DEV;
  const customUrl = (import.meta as unknown as { env?: Record<string, unknown> }).env?.VITE_STORAGE_SERVER_URL;
    
    if (typeof customUrl === 'string') {
      return customUrl;
    }
    
    // Default to localhost in development, or try same domain in production
    return isDev ? 'http://localhost:3001' : '/storage-api';
  }

  private setupOnlineDetection() {
    // Check if storage server is available
    this.checkServerHealth();
    
    // Check every 30 seconds
    setInterval(() => {
      this.checkServerHealth();
    }, 30000);
  }

  private async checkServerHealth(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        timeout: 5000,
      } as RequestInit);
      
      this.isOnline = response.ok;
      
      if (this.isOnline && this.retryQueue.length > 0) {
        this.processRetryQueue();
      }
    } catch (error) {
      this.isOnline = false;
      console.warn('Global storage server is offline, falling back to local storage', error);
    }
  }

  private setupRetryMechanism() {
    // Process retry queue every minute
    setInterval(() => {
      if (this.isOnline) {
        this.processRetryQueue();
      }
    }, 60000);
  }

  private async processRetryQueue() {
    const queue = [...this.retryQueue];
    this.retryQueue = [];

    for (const item of queue) {
      try {
        await this.setItem(item.key, item.data);
      } catch (error) {
        // If it fails again, put it back in the queue (but don't retry indefinitely)
        console.warn(`Failed to retry setting "${item.key}":`, error);
        const hourAgo = Date.now() - 60 * 60 * 1000;
        if (item.timestamp > hourAgo) {
          this.retryQueue.push(item);
        }
      }
    }
  }

  /**
   * Get a setting value from global storage
   */
  async getItem<T = unknown>(key: string): Promise<T | null> {
    try {
      if (!this.isOnline) {
        // Fallback to localStorage
        const localValue = localStorage.getItem(`global_${key}`);
        return localValue ? JSON.parse(localValue) : null;
      }

      const response = await fetch(`${this.baseUrl}/api/settings/${encodeURIComponent(key)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: StorageResponse<T> = await response.json();
      
      if (result.success) {
        return result.data ?? null;
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.warn(`Failed to get setting "${key}" from global storage, falling back to localStorage:`, error);
      // Fallback to localStorage
      const localValue = localStorage.getItem(`global_${key}`);
      return localValue ? JSON.parse(localValue) : null;
    }
  }

  /**
   * Set a setting value in global storage
   */
  async setItem(key: string, value: unknown): Promise<void> {
    // Always save to localStorage as backup
    localStorage.setItem(`global_${key}`, JSON.stringify(value));

    if (!this.isOnline) {
      // Queue for retry when back online
      this.retryQueue.push({ key, data: value, timestamp: Date.now() });
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/settings/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: value }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: StorageResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.warn(`Failed to save setting "${key}" to global storage:`, error);
      // Add to retry queue
      this.retryQueue.push({ key, data: value, timestamp: Date.now() });
      throw error;
    }
  }

  /**
   * Remove a setting from global storage
   */
  async removeItem(key: string): Promise<void> {
    // Remove from localStorage backup
    localStorage.removeItem(`global_${key}`);

    if (!this.isOnline) {
      return;
    }

    try {
      await this.setItem(key, null);
    } catch (error) {
      console.warn(`Failed to remove setting "${key}" from global storage:`, error);
    }
  }

  /**
   * Get all settings from localStorage as fallback
   */
  private getLocalStorageSettings(): Record<string, unknown> {
    const settings: Record<string, unknown> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('global_')) {
        const settingKey = key.replace('global_', '');
        const value = localStorage.getItem(key);
        if (value) {
          settings[settingKey] = JSON.parse(value);
        }
      }
    }
    return settings;
  }

  /**
   * Get all settings
   */
  async getAllSettings(): Promise<Record<string, unknown>> {
    try {
      if (!this.isOnline) {
        return this.getLocalStorageSettings();
      }

      const response = await fetch(`${this.baseUrl}/api/settings`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

  const result: StorageResponse<Record<string, unknown>> = await response.json();
      
      if (result.success) {
        return result.data ?? {};
      } else {
        throw new Error(result.error ?? 'Unknown error');
      }
    } catch (error) {
      console.warn('Failed to get all settings from global storage, falling back to localStorage:', error);
      return this.getLocalStorageSettings();
    }
  }

  /**
   * Clear localStorage settings with global_ prefix
   */
  private clearLocalStorageSettings(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('global_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  /**
   * Reset all settings
   */
  async resetAllSettings(): Promise<void> {
    this.clearLocalStorageSettings();

    if (!this.isOnline) {
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/settings`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: StorageResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error ?? 'Unknown error');
      }
    } catch (error) {
      console.warn('Failed to reset settings in global storage:', error);
      throw error;
    }
  }

  /**
   * Check if global storage is online
   */
  isStorageOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Get storage status info
   */
  getStorageStatus() {
    return {
      isOnline: this.isOnline,
      baseUrl: this.baseUrl,
      pendingRetries: this.retryQueue.length,
    };
  }
}

// Export singleton instance
export const globalStorage = new GlobalStorageService();
