import { NextResponse } from "next/server";
import { z } from "zod";
import { enrichWine } from "@/lib/ai/enrich-wine";
import { getCurrentUser } from "@/lib/auth";

export const maxDuration = 30;

const bodySchema = z.object({
  producer: z.string().min(1),
  wine: z.string().min(1),
  vintage: z.union([z.string(), z.number()]).nullable().optional(),
  extraContext: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const json: unknown = await request.json();
    const body = bodySchema.parse(json);
    const result = await enrichWine(body);

    return NextResponse.json({
      ...result.identification,
      usedAI: result.usedAI,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Enter at least a producer and wine name." },
        { status: 400 },
      );
    }

    console.error(error);
    return NextResponse.json(
      { error: "Wine identification failed. You can still save the bottle manually." },
      { status: 500 },
    );
  }
}
