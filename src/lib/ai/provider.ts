import { GoogleGenAI } from '@google/genai';

export interface AICompletionOptions {
  systemPrompt?: string;
  temperature?: number;
  responseFormat?: 'json' | 'text';
}

/**
 * Checks if any AI provider is configured in the environment
 */
export function isAIConfigured(): boolean {
  return Boolean(
    process.env.GEMINI_API_KEY ||
    process.env.OPENAI_API_KEY
  );
}

/**
 * Extracts and parses JSON from text, handling markdown code fences if present.
 */
export function extractJsonFromText<T = unknown>(text: string): T {
  let cleaned = text.trim();
  
  // Remove markdown code block fences if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }

  // Find first { or [ and last } or ]
  const firstBrace = cleaned.search(/[\{\[]/);
  const lastBrace = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch (error) {
    console.error('Failed to parse JSON from AI response:', text);
    throw new Error(`AI generated malformed JSON: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
  }
}

/**
 * Executes an AI completion query using Google Gemini or OpenAI compatible endpoints.
 */
export async function generateAICompletion(
  prompt: string,
  options: AICompletionOptions = {}
): Promise<string> {
  const { systemPrompt, temperature = 0.2, responseFormat = 'json' } = options;

  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!geminiKey && !openaiKey) {
    throw new Error(
      'No AI Provider configured. Please configure GEMINI_API_KEY or OPENAI_API_KEY in your .env.local file to enable AI career analysis.'
    );
  }

  // 1. Prefer Google Gemini if configured
  if (geminiKey) {
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const configuredModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
    const candidateModels = Array.from(
      new Set([configuredModel, 'gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-3.6-flash'])
    );

    let lastError: unknown = null;

    for (const modelName of candidateModels) {
      try {
        const contents = systemPrompt
          ? `${systemPrompt}\n\nTask:\n${prompt}`
          : prompt;

        const response = await ai.models.generateContent({
          model: modelName,
          contents: contents,
          config: {
            temperature: temperature,
            responseMimeType: responseFormat === 'json' ? 'application/json' : 'text/plain',
          },
        });

        const responseText = response.text;
        if (responseText) {
          return responseText;
        }
      } catch (err: unknown) {
        lastError = err;
        console.warn(`Gemini model ${modelName} call failed, trying fallback:`, err instanceof Error ? err.message : err);
        // Continue to the next candidate model in case of 503 (high demand) or other model-specific transient errors
      }
    }

    if (lastError && !openaiKey) {
      let friendlyMessage = 'Failed to call Gemini API';
      if (lastError instanceof Error) {
        try {
          const parsed = JSON.parse(lastError.message);
          if (parsed.error?.message) {
            friendlyMessage = parsed.error.message;
          } else {
            friendlyMessage = lastError.message;
          }
        } catch {
          friendlyMessage = lastError.message;
        }
      }
      throw new Error(`Gemini AI Error: ${friendlyMessage}`);
    }
  }

  // 2. OpenAI / Compatible endpoint
  if (openaiKey) {
    try {
      const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
      const model = process.env.AI_MODEL || 'gpt-4o-mini';

      const messages: Array<{ role: string; content: string }> = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const body: Record<string, unknown> = {
        model,
        messages,
        temperature,
      };

      if (responseFormat === 'json') {
        body.response_format = { type: 'json_object' };
      }

      const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`OpenAI API returned status ${res.status}: ${errorBody}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('OpenAI returned an empty response.');
      }
      return content;
    } catch (err: unknown) {
      console.error('OpenAI API call failed:', err);
      throw new Error(`AI Provider Error: ${err instanceof Error ? err.message : 'Failed to call OpenAI API'}`);
    }
  }

  throw new Error('Failed to generate AI completion from configured providers.');
}
