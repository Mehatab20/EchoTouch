import * as Haptics from 'expo-haptics';
import { HapticLogger } from './HapticLogger';

class HapticQueue {
  private queue: Promise<void> = Promise.resolve();
  private isEnabled: boolean = true;

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  public getEnabled(): boolean {
    return this.isEnabled;
  }

  public clearQueue() {
    this.queue = Promise.resolve();
  }

  // Enqueue a completely custom asynchronous tactile action
  public enqueue(action: () => Promise<void>, eventName: string): Promise<void> {
    if (!this.isEnabled) return Promise.resolve();

    this.queue = this.queue.then(async () => {
      HapticLogger.log(`Executing: ${eventName}`);
      await action();
    }).catch(error => {
      HapticLogger.log(`[ERROR] ${eventName} failed`, error);
    });

    return this.queue;
  }

  // Helper for a single vibration with an optional pause AFTER it
  public async playFeedback(
    style: Haptics.ImpactFeedbackStyle | Haptics.NotificationFeedbackType,
    delayAfterMs: number = 0
  ) {
    if (Object.values(Haptics.ImpactFeedbackStyle).includes(style as Haptics.ImpactFeedbackStyle)) {
      await Haptics.impactAsync(style as Haptics.ImpactFeedbackStyle);
    } else {
      await HapticLogger.log("notification async", style);
      await Haptics.notificationAsync(style as Haptics.NotificationFeedbackType);
    }

    if (delayAfterMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayAfterMs));
    }
  }

  // Standard Interactions queued sequentially
  public tap() {
    this.enqueue(async () => {
      await this.playFeedback(Haptics.ImpactFeedbackStyle.Light);
    }, 'tap');
  }

  public pause(ms: number) {
    this.enqueue(async () => {
      await new Promise(resolve => setTimeout(resolve, ms));
    }, `pause_${ms}`);
  }

  // Unique haptic signatures for the 6 Braille Dots when tapped directly
  public dotTap(dot: number) {
    this.enqueue(async () => {
      if (dot === 1) {
        await this.playFeedback(Haptics.ImpactFeedbackStyle.Light);
      } else if (dot === 2) {
        await this.playFeedback(Haptics.ImpactFeedbackStyle.Medium);
      } else if (dot === 3) {
        await this.playFeedback(Haptics.ImpactFeedbackStyle.Heavy);
      } else if (dot === 4) {
        await this.playFeedback(Haptics.ImpactFeedbackStyle.Light, 250);
        await this.playFeedback(Haptics.ImpactFeedbackStyle.Light);
      } else if (dot === 5) {
        await this.playFeedback(Haptics.ImpactFeedbackStyle.Medium, 250);
        await this.playFeedback(Haptics.ImpactFeedbackStyle.Medium);
      } else if (dot === 6) {
        await this.playFeedback(Haptics.ImpactFeedbackStyle.Heavy, 250);
        await this.playFeedback(Haptics.ImpactFeedbackStyle.Heavy);
      }
    }, `dotTap_${dot}`);
  }

  public error() {
    this.enqueue(async () => {
      await this.playFeedback(Haptics.NotificationFeedbackType.Error);
    }, 'error');
  }

  public confirmPulse() {
    this.enqueue(async () => {
      await this.playFeedback(Haptics.ImpactFeedbackStyle.Heavy, 150);
      await this.playFeedback(Haptics.ImpactFeedbackStyle.Heavy, 300);
      await this.playFeedback(Haptics.ImpactFeedbackStyle.Heavy);
    }, 'confirmPulse');
  }

  public signatureSuccess() {
    this.enqueue(async () => {
      await this.playFeedback(Haptics.ImpactFeedbackStyle.Heavy, 400); // Buzz
      await this.playFeedback(Haptics.ImpactFeedbackStyle.Medium, 600); // Buzz
      await this.playFeedback(Haptics.NotificationFeedbackType.Success); // Long Buzz
    }, 'signatureSuccess');
  }

  public successMelody() {
    this.enqueue(async () => {
      await this.playFeedback(Haptics.ImpactFeedbackStyle.Heavy, 200); // Buzz
      await new Promise(resolve => setTimeout(resolve, 200)); // Pause
      await this.playFeedback(Haptics.ImpactFeedbackStyle.Medium, 150); // Buzz
      await this.playFeedback(Haptics.ImpactFeedbackStyle.Medium, 200); // Buzz
      await this.playFeedback(Haptics.NotificationFeedbackType.Success); // Long Buzz
    }, 'successMelody');
  }

  public longError() {
    this.enqueue(async () => {
      await this.playFeedback(Haptics.NotificationFeedbackType.Error, 300);
      await this.playFeedback(Haptics.NotificationFeedbackType.Error);
    }, 'longError');
  }

  public playPinPositionReminder(count: number) {
    this.enqueue(async () => {
      for (let i = 0; i < count; i++) {
        await this.playFeedback(Haptics.ImpactFeedbackStyle.Medium);
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    }, 'playPinPositionReminder');
  }

  public heartbeat() {
    this.enqueue(async () => {
      await this.playFeedback(Haptics.ImpactFeedbackStyle.Heavy, 200);
      await this.playFeedback(Haptics.ImpactFeedbackStyle.Medium, 800);
      await this.playFeedback(Haptics.ImpactFeedbackStyle.Heavy, 200);
      await this.playFeedback(Haptics.ImpactFeedbackStyle.Medium);
    }, 'heartbeat');
  }

  public playSecureModeEntry() {
    this.enqueue(async () => {
      // 3 ascending clicks
      await this.playFeedback(Haptics.ImpactFeedbackStyle.Light, 150);
      await this.playFeedback(Haptics.ImpactFeedbackStyle.Medium, 150);
      await this.playFeedback(Haptics.ImpactFeedbackStyle.Heavy);
    }, 'playSecureModeEntry');
  }

  public playSecureModeExit() {
    this.enqueue(async () => {
      // 3 descending clicks
      await this.playFeedback(Haptics.ImpactFeedbackStyle.Heavy, 150);
      await this.playFeedback(Haptics.ImpactFeedbackStyle.Medium, 150);
      await this.playFeedback(Haptics.ImpactFeedbackStyle.Light);
    }, 'playSecureModeExit');
  }
}

export const HapticEngine = new HapticQueue();
