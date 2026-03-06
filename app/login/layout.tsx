import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * If user is already logged in, redirect to home.
 * Runs in Node runtime where cookies() works.
 */
export default async function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return <>{children}</>;
}
