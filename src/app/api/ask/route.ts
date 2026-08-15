import { NextResponse } from "next/server";
import { z } from "zod";
import { answerWineQuestion } from "@/lib/ai/ask";
import { buildAskContext } from "@/lib/ask/context";
import { getCurrentUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const bodySchema = z.object({
  question: z.string().min(3),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .optional(),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const json: unknown = await request.json();
    const body = bodySchema.parse(json);
    const supabase = await createServerSupabaseClient();
    const personalContext = await buildAskContext(supabase, user.id, body.question);
    const answer = await answerWineQuestion({
      question: body.question,
      history: body.history ?? [],
      personalContext,
    });

    return NextResponse.json({ answer });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ask a more complete question." }, { status: 400 });
    }

    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The question could not be answered." },
      { status: 500 },
    );
  }
}
