import { requestPasswordReset } from "../login/actions";
import { AuthForm } from "../login/auth-form";

/** Recuperar la contrasenya: envia un enllaç per correu (01 §1). */
export default function ForgotPage() {
  return <AuthForm mode="forgot" action={requestPasswordReset} />;
}
