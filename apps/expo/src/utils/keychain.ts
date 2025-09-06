import * as Keychain from "react-native-keychain";

import { logError } from "~/utils/errorLogging";

export interface KeychainOptions {
  accessGroup?: string;
  keychainAccessible?: Keychain.ACCESSIBLE;
}

/**
 * Secure storage utility using react-native-keychain
 * Provides a compatible interface with expo-secure-store
 */
export const SecureKeychain = {
  /**
   * Get an item from the keychain
   */
  async getItemAsync(key: string, options?: KeychainOptions): Promise<string | null> {
    try {
      const result = await Keychain.getInternetCredentials(key, {
        accessGroup: options?.accessGroup,
        accessible: options?.keychainAccessible || Keychain.ACCESSIBLE.WHEN_UNLOCKED,
      });
      
      if (result && result.password) {
        return result.password;
      }
      return null;
    } catch (error) {
      logError(`Error getting keychain item for key: ${key}`, error);
      return null;
    }
  },

  /**
   * Set an item in the keychain
   */
  async setItemAsync(key: string, value: string, options?: KeychainOptions): Promise<void> {
    try {
      await Keychain.setInternetCredentials(key, key, value, {
        accessGroup: options?.accessGroup,
        accessible: options?.keychainAccessible || Keychain.ACCESSIBLE.WHEN_UNLOCKED,
      });
    } catch (error) {
      logError(`Error setting keychain item for key: ${key}`, error);
      throw error;
    }
  },

  /**
   * Delete an item from the keychain
   */
  async deleteItemAsync(key: string, options?: KeychainOptions): Promise<void> {
    try {
      await Keychain.resetInternetCredentials(key, {
        accessGroup: options?.accessGroup,
      });
    } catch (error) {
      logError(`Error deleting keychain item for key: ${key}`, error);
      throw error;
    }
  },
};

// Export constants for compatibility
export const WHEN_UNLOCKED = Keychain.ACCESSIBLE.WHEN_UNLOCKED;
export const WHEN_UNLOCKED_THIS_DEVICE_ONLY = Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY;
export const AFTER_FIRST_UNLOCK = Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK;
export const AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY = Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY;
