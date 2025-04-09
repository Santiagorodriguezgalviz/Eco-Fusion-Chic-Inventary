import { PasswordResetRequestForm } from "@/components/auth/password-reset-request-form"

export default function ForgotPasswordPage() {
  return (
    <div className="container flex h-screen items-center justify-center">
      <div className="mx-auto w-full max-w-md">
        <h1 className="mb-6 text-center text-2xl font-bold">Recuperar contraseña</h1>
        <PasswordResetRequestForm />
      </div>
    </div>
  )
}
