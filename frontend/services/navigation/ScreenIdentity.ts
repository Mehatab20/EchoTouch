import { HapticEngine } from '../braille/HapticEngine';
import { NavigationPatterns } from './NavigationPatterns';

export const ScreenIdentity = {
  announce: (screenName: keyof typeof NavigationPatterns.screen) => {
    HapticEngine.enqueue(async () => {
      const pattern = NavigationPatterns.screen[screenName];
      if (pattern) {
        await pattern();
      }
    }, `ScreenIdentity_${screenName}`);
  }
};
