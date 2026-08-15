"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { NoteContent } from "@/components/markdown/note-content";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const SUGGESTIONS = [
  "What do I currently understand about Chablis?",
  "What are the biggest gaps in my Burgundy knowledge?",
  "Compare every wine I have had from the same grape.",
  "What five bottles would teach me the most right now?",
];

export function AskInterface() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(nextQuestion: string) {
    const trimmed = nextQuestion.trim();
    if (!trimmed || pending) return;

    const history = messages.slice(-8);
    setMessages((current) => [...current, { role: "user", content: trimmed }]);
    setQuestion("");
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, history }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof payload === "object" && payload && "error" in payload
            ? String((payload as { error: string }).error)
            : "The question could not be answered.",
        );
      }
      const answer = (payload as { answer: string }).answer;
      setMessages((current) => [...current, { role: "assistant", content: answer }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The question could not be answered.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      {messages.length === 0 ? (
        <div className="mb-10">
          <p className="text-[15px] leading-7 text-muted-foreground">
            Questions are answered from your bottles, notes, and structured wine metadata — not from a generic encyclopedia.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            {SUGGESTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => submit(item)}
                className="rounded-md border border-border px-4 py-3 text-left text-sm leading-6 hover:bg-muted/60"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-10 space-y-8">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`}>
              {message.role === "user" ? (
                <p className="font-serif text-2xl tracking-tight">{message.content}</p>
              ) : (
                <NoteContent markdown={message.content} />
              )}
            </div>
          ))}
          {pending ? (
            <p className="text-sm text-muted-foreground">Reading your notes and history…</p>
          ) : null}
        </div>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit(question);
        }}
        className="space-y-3"
      >
        <Textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask from your cellar of knowledge…"
          className="min-h-28"
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={pending || question.trim().length < 3}>
          {pending ? "Thinking…" : "Ask"}
        </Button>
      </form>
    </div>
  );
}
