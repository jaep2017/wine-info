import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { ZodType } from "zod";
import { getOpenAIKey } from "@/lib/env";

export const NOTE_MODEL = "gpt-4o";
export const ENRICH_MODEL = "gpt-4o-mini";

export class AIUnavailableError extends Error {
  constructor(message = "OpenAI is not configured.") {
    super(message);
    this.name = "AIUnavailableError";
  }
}

export function getOpenAIClient(): OpenAI | null {
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    return null;
  }
  return new OpenAI({ apiKey });
}

export function requireOpenAIClient(): OpenAI {
  const client = getOpenAIClient();
  if (!client) {
    throw new AIUnavailableError();
  }
  return client;
}

export async function parseStructuredOutput<T>(
  schema: ZodType<T>,
  name: string,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  model = NOTE_MODEL,
): Promise<T> {
  const client = requireOpenAIClient();

  try {
    const completion = await client.chat.completions.parse({
      model,
      messages,
      response_format: zodResponseFormat(schema, name),
      temperature: 0.4,
    });

    const parsed = completion.choices[0]?.message.parsed;
    if (parsed) {
      return parsed;
    }

    const refusal = completion.choices[0]?.message.refusal;
    throw new Error(refusal || "Model returned an empty structured response.");
  } catch (error) {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        ...messages,
        {
          role: "system",
          content:
            "If you have not already, return only valid JSON matching the requested schema. No markdown fences.",
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message.content;
    if (!content) {
      throw error instanceof Error ? error : new Error("Malformed AI response.");
    }

    const json: unknown = JSON.parse(content);
    return schema.parse(json);
  }
}

export async function generateMarkdown(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  model = NOTE_MODEL,
): Promise<string> {
  const client = requireOpenAIClient();
  const completion = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.5,
  });

  const content = completion.choices[0]?.message.content?.trim();
  if (!content) {
    throw new Error("Model returned empty markdown.");
  }
  return content;
}
