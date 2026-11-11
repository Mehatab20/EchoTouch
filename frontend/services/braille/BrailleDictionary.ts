// Braille Dictionary mapping standard 6-dot braille to characters and vice-versa
// Standard English Braille Grade 1

export const BrailleToChar: Record<string, string> = {
  '1': 'A',
  '1,2': 'B',
  '1,4': 'C',
  '1,4,5': 'D',
  '1,5': 'E',
  '1,2,4': 'F',
  '1,2,4,5': 'G',
  '1,2,5': 'H',
  '2,4': 'I',
  '2,4,5': 'J',
  '1,3': 'K',
  '1,2,3': 'L',
  '1,3,4': 'M',
  '1,3,4,5': 'N',
  '1,3,5': 'O',
  '1,2,3,4': 'P',
  '1,2,3,4,5': 'Q',
  '1,2,3,5': 'R',
  '2,3,4': 'S',
  '2,3,4,5': 'T',
  '1,3,6': 'U',
  '1,2,3,6': 'V',
  '2,4,5,6': 'W',
  '1,3,4,6': 'X',
  '1,3,4,5,6': 'Y',
  '1,3,5,6': 'Z',
  '3,4,5,6': '#' // Number sign
};

export const CharToBraille: Record<string, number[]> = {
  'A': [1], 'B': [1,2], 'C': [1,4], 'D': [1,4,5], 'E': [1,5],
  'F': [1,2,4], 'G': [1,2,4,5], 'H': [1,2,5], 'I': [2,4], 'J': [2,4,5],
  'K': [1,3], 'L': [1,2,3], 'M': [1,3,4], 'N': [1,3,4,5], 'O': [1,3,5],
  'P': [1,2,3,4], 'Q': [1,2,3,4,5], 'R': [1,2,3,5], 'S': [2,3,4], 'T': [2,3,4,5],
  'U': [1,3,6], 'V': [1,2,3,6], 'W': [2,4,5,6], 'X': [1,3,4,6], 'Y': [1,3,4,5,6], 'Z': [1,3,5,6],
  
  // Numbers use the same dots as A-J, but we map them explicitly for the SBRE
  '1': [1], '2': [1,2], '3': [1,4], '4': [1,4,5], '5': [1,5],
  '6': [1,2,4], '7': [1,2,4,5], '8': [1,2,5], '9': [2,4], '0': [2,4,5],
  
  ' ': []
};

export const NumericBrailleToChar: Record<string, string> = {
  '1': '1',
  '1,2': '2',
  '1,4': '3',
  '1,4,5': '4',
  '1,5': '5',
  '1,2,4': '6',
  '1,2,4,5': '7',
  '1,2,5': '8',
  '2,4': '9',
  '2,4,5': '0',
};

export class BrailleTranslator {
  static getDotsForChar(char: string): number[] {
    return CharToBraille[char.toUpperCase()] || [];
  }

  static getCharForDots(dots: number[], mode: 'alpha' | 'numeric' = 'alpha'): string | null {
    // Sort dots to ensure consistent key (e.g. [2,1] -> [1,2])
    const sortedDots = [...dots].sort((a, b) => a - b);
    const key = sortedDots.join(',');
    
    if (mode === 'numeric') {
      return NumericBrailleToChar[key] || null;
    }
    return BrailleToChar[key] || null;
  }
}
