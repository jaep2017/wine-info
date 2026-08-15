import { NextResponse } from "next/server";
import { z } from "zod";
import { wineIdentificationSchema } from "@/lib/ai/schemas";
import { getCurrentUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { confirmAndLearn } from "@/lib/wines/confirm";

export const maxDuration = 60;

const bodySchema = z.object({
  identification: wineIdentificationSchema,
  personalNotes: z.string().nullable().optional(),
  consumedAt: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  rating: z.number().nullable().optional(),
  pricePaid: z.number().nullable().optional(),
  labelImagePath: z.string().nullable().optional(),
  rawInput: z
    .object({
      producer: z.string(),
      wine: z.string(),
      vintage: z.union([z.string(), z.number()]).nullable(),
    })
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

    const result = await confirmAndLearn(supabase, user.id, body);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "The wine confirmation payload was incomplete." },
        { status: 400 },
      );
    }

    console.error(error);
    return NextResponse.json(
      { error: "The wine could not be saved. Your entered details were not discarded from the form." },
      { status: 500 },
    );
  }
}
