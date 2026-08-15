import { AIUnavailableError, generateMarkdown } from "@/lib/ai/client";
import { ASK_SYSTEM } from "@/lib/ai/prompts";

export type AskInput = {
  question: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  personalContext: string;
};

export async function answerWineQuestion(input: AskInput): Promise<string> {
  try {
    return await generateMarkdown([
      { role: "system", content: ASK_SYSTEM },
      {
        role: "system",
        content: `Personal wine context:\n${input.personalContext}`,
      },
      ...input.history.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      { role: "user", content: input.question },
    ]);
  } catch (error) {
    if (error instanceof AIUnavailableError) {
      return `OpenAI is not configured, so I can only reason from the structured context already in your library.\n\n${summarizeWithoutModel(input)}`;
    }
    console.error("Ask failed.", error);
    throw new Error("The research assistant could not complete that question. Try again.");
  }
}

function summarizeWithoutModel(input: AskInput): string {
  return `Your question:\n\n> ${input.question}\n\nAvailable personal context:\n\n${input.personalContext}\n\nAdd an \`OPENAI_API_KEY\` to receive a full grounded answer.`;
}
