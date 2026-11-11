export interface ParsedIntent {
  action: 'SEND_MONEY' | 'CHECK_BALANCE' | 'TOP_UP' | 'TRANSACTION_HISTORY' | 'UNKNOWN';
  amount?: string;
  recipient?: string;
  count?: number;
}

export const NLPEngine = {
  parseCommand: async (command: string): Promise<ParsedIntent> => {
    try {
      const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
      if (!apiKey) {
        console.error("Groq API key is missing");
        return { action: 'UNKNOWN' };
      }

      const systemPrompt = `You are an intent extraction engine for a financial app.
Extract the user's intent into a JSON object matching this exact interface:
{
  "action": "SEND_MONEY" | "CHECK_BALANCE" | "TOP_UP" | "TRANSACTION_HISTORY" | "UNKNOWN",
  "amount"?: string (numeric only, no symbols, e.g. "50"),
  "recipient"?: string (capitalized name),
  "count"?: number (for history requests, e.g. "last 3 payments" -> 3)
}
Only output the raw JSON object, no markdown formatting, no explanations.`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: command }
          ],
          temperature: 0,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        console.error("Groq API Error:", await response.text());
        return { action: 'UNKNOWN' };
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      return JSON.parse(content) as ParsedIntent;

    } catch (e) {
      console.error("NLP Engine Error:", e);
      return { action: 'UNKNOWN' };
    }
  },

  transcribeAudio: async (fileUri: string): Promise<string> => {
    try {
      const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
      if (!apiKey) return "";

      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        name: 'audio.m4a',
        type: 'audio/m4a'
      } as any);
      formData.append('model', 'whisper-large-v3');
      formData.append('response_format', 'text');

      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        console.error("Groq Whisper API Error:", await response.text());
        return "";
      }

      const text = await response.text();
      return text.trim();
    } catch (e) {
      console.error("Transcribe Error:", e);
      return "";
    }
  },

  analyzeTone: async (text: string): Promise<'Joy' | 'Frustration' | 'Urgency' | 'Neutral'> => {
    try {
      const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
      if (!apiKey) return "Neutral";

      const systemPrompt = `Analyze the emotional tone of the given text. 
Classify it into exactly one of these four categories: "Joy", "Frustration", "Urgency", or "Neutral".
Respond with only the category name, nothing else.`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
          ],
          temperature: 0.3,
          max_tokens: 10
        })
      });

      if (!response.ok) return "Neutral";

      const data = await response.json();
      const content = data.choices[0].message.content.trim() as string;
      
      if (['Joy', 'Frustration', 'Urgency', 'Neutral'].includes(content)) {
        return content as 'Joy' | 'Frustration' | 'Urgency' | 'Neutral';
      }
      return "Neutral";
    } catch (e) {
      console.error("Tone Analysis Error:", e);
      return "Neutral";
    }
  },

  deEscalateText: async (text: string): Promise<string> => {
    try {
      const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
      if (!apiKey) return text; // Fallback to raw text if no API key

      const systemPrompt = `You are an 'Emotional Shield' for a deaf user. Your job is to read raw transcribed audio.
If the text contains insults, anger, aggression, or toxicity, you must filter it out completely.
Rephrase the core message into a polite, calm, and strictly action-oriented summary.
For example, if the input is: "Why you didn't pay me? Just pay me the amount. Why are you doing these things? Just pay me. You can't even listen. What should I do? Pay me 100 rupees or not I'll get you to police. Okay?"
Your output should be: "The person is frustrated and is requesting a payment of 100 rupees immediately to avoid police involvement."
If the text is already neutral and polite, just return it as is or slightly polished.
Do not include any introductions, just output the filtered text.`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
          ],
          temperature: 0.3,
        })
      });

      if (!response.ok) return text;

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (e) {
      console.error("De-Escalation Error:", e);
      return text;
    }
  }
};
