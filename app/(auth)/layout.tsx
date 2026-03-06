import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Auth check runs in Node runtime (Server Component), where cookies() works.
 * Middleware runs on Edge where request.cookies can be empty on Vercel,
 * so we do auth redirect here instead.
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/");
  }

  return <>{children}</>;
}
