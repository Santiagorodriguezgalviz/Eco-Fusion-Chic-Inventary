import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { RegisterForm } from "@/components/auth/register-form"

export default async function RegisterPage() {
  const cookieStore = cookies()
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    redirect("/")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <RegisterForm />
    </div>
  )
}
