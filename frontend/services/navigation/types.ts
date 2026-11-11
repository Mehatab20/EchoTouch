export interface TactileElementData {
  id: string;
  label: string;
  description: string;
  type: 'button' | 'input' | 'listItem' | 'toggle' | 'danger';
  priority?: number;
  onPress: () => void;
  layout?: { x: number; y: number; w: number; h: number };
}

export type NavState = 'IDLE' | 'NAVIGATION' | 'ACTIVATION' | 'INPUT' | 'PROCESSING' | 'SUCCESS';
