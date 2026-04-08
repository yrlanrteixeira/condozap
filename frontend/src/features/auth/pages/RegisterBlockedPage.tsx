import { Link } from "react-router-dom";
import { AuthCard, AuthHeader, AuthFooter } from "../components";

/**
 * Cadastro de morador exige o link com o identificador do condomínio (/auth/register/:slug).
 */
export function RegisterBlockedPage() {
  return (
    <AuthCard maxWidth="md">
      <AuthHeader
        title="Use o link do seu condomínio"
        description="O cadastro de morador só pode ser feito pelo link enviado pelo síndico ou pela administração do seu condomínio. Ele contém o endereço correto para vincular sua conta ao prédio certo."
      />
      <div className="rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        Exemplo de endereço:{" "}
        <span className="font-mono text-foreground">
          …/auth/register/nome-do-condominio
        </span>
      </div>
      <AuthFooter>
        <Link
          to="/auth/login"
          className="text-primary hover:underline transition-colors font-medium"
        >
          Voltar ao login
        </Link>
      </AuthFooter>
    </AuthCard>
  );
}
