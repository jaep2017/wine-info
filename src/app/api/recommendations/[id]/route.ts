import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  status: z.enum(["active", "consumed", "dismissed"]),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const { id } = await context.params;
    const json: unknown = await request.json();
    const body = bodySchema.parse(json);
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
      .from("recommendations")
      .update({ status: body.status })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not update recommendation." }, { status: 500 });
  }
}
