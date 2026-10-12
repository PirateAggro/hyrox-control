import { signUp } from "../login/actions";
import { AuthForm } from "../login/auth-form";

/** Registre d'usuaris nous: només email i contrasenya (01 §1). */
export default function RegisterPage() {
  return <AuthForm mode="register" action={signUp} />;
}
