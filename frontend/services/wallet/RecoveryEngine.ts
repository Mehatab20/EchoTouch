import * as SecureStore from 'expo-secure-store';

const CHECKPOINT_KEY = 'echotouch_transaction_checkpoint';

export interface PaymentCheckpoint {
  step: 'VERIFY_MERCHANT' | 'RECIPIENT' | 'AMOUNT' | 'PIN' | 'CONFIRM';
  recipient: string;
  amount: number;
  timestamp: number;
}

export const RecoveryEngine = {
  /**
   * Saves a checkpoint to secure storage.
   * PINs are explicitly excluded from this checkpoint by design.
   */
  saveCheckpoint: async (checkpoint: Omit<PaymentCheckpoint, 'timestamp'>): Promise<void> => {
    try {
      const data: PaymentCheckpoint = {
        ...checkpoint,
        timestamp: Date.now(),
      };
      await SecureStore.setItemAsync(CHECKPOINT_KEY, JSON.stringify(data));
      console.log("[RecoveryEngine] Checkpoint saved securely:", data.step);
    } catch (e) {
      console.error("[RecoveryEngine] Failed to save checkpoint", e);
    }
  },

  /**
   * Loads the active checkpoint. Returns null if none exists.
   */
  loadCheckpoint: async (): Promise<PaymentCheckpoint | null> => {
    try {
      const data = await SecureStore.getItemAsync(CHECKPOINT_KEY);
      if (data) {
        return JSON.parse(data) as PaymentCheckpoint;
      }
    } catch (e) {
      console.error("[RecoveryEngine] Failed to load checkpoint", e);
    }
    return null;
  },

  /**
   * Clears the checkpoint after successful recovery or payment completion.
   */
  clearCheckpoint: async (): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(CHECKPOINT_KEY);
      console.log("[RecoveryEngine] Checkpoint cleared.");
    } catch (e) {
      console.error("[RecoveryEngine] Failed to clear checkpoint", e);
    }
  }
};
