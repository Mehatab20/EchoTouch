export const HapticLogger = {
  log: (eventName: string, details?: any) => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    console.log(`[${timestamp}] [HAPTIC] ${eventName}`, details ? details : '');
  }
};
