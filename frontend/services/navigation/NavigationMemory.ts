export const NavigationMemory = {
  memory: {} as Record<string, number>,

  saveFocus: (screenName: string, index: number) => {
    NavigationMemory.memory[screenName] = index;
  },

  getSavedFocus: (screenName: string): number => {
    return NavigationMemory.memory[screenName] || 0;
  },

  clear: (screenName: string) => {
    delete NavigationMemory.memory[screenName];
  }
};
