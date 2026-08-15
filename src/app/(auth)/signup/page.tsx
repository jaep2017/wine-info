import { AuthForm } from "@/components/auth/auth-form";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata = {
  title: "Create account",
};

export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <p className="font-serif text-3xl tracking-tight">Cellar Notes</p>
      <h1 className="mt-10 font-serif text-4xl tracking-tight">Create an account</h1>
      <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
        Notes, consumptions, and recommendations stay scoped to you.
      </p>
      {!isSupabaseConfigured() ? (
        <p className="mt-8 text-sm leading-6 text-muted-foreground">
          Supabase is not configured. Add the environment variables from{" "}
          <code>.env.example</code> before creating an account.
        </p>
      ) : (
        <AuthForm mode="signup" />
      )}
    </main>
  );
}
