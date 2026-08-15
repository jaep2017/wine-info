import { AuthForm } from "@/components/auth/auth-form";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <p className="font-serif text-3xl tracking-tight">Cellar Notes</p>
      <h1 className="mt-10 font-serif text-4xl tracking-tight">Sign in</h1>
      <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
        A private research tool for turning bottles you drink into a cumulative body of wine knowledge.
      </p>
      {!isSupabaseConfigured() ? (
        <p className="mt-8 text-sm leading-6 text-muted-foreground">
          Supabase is not configured. Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code>.env.local</code>.
        </p>
      ) : (
        <AuthForm mode="login" nextPath={next || "/"} />
      )}
    </main>
  );
}
