import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShieldX, Home, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { auditLogger } from "@/lib/audit-logger";
import { useEffect } from "react";

/**
 * Página de Acesso Negado (403)
 * Exibida quando o usuário tenta acessar uma rota/recurso sem permissão adequada
 */
export const AccessDeniedPage = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();

  useEffect(() => {
    auditLogger.logAccessDeniedPage(
      user?.id,
      user?.name,
      userRole,
      window.location.pathname
    );
  }, [user, userRole]);

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-6">
              <ShieldX className="h-16 w-16 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <div>
            <CardTitle className="text-3xl font-bold text-red-600 dark:text-red-400">
              Acesso Negado
            </CardTitle>
            <p className="text-6xl font-bold text-slate-300 dark:text-slate-700 mt-2">
              403
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 text-center">
          <CardDescription className="text-base">
            Você não tem permissão para acessar este recurso ou página.
          </CardDescription>

          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 space-y-2 text-sm">
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              O que isso significa?
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              Seu perfil de usuário ({user?.name || "Não identificado"}) não
              possui as permissões necessárias para acessar esta funcionalidade.
            </p>
          </div>

          <div className="space-y-2 text-left text-sm text-slate-600 dark:text-slate-400">
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              Possíveis soluções:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Verifique se você está usando o perfil correto</li>
              <li>Entre em contato com o administrador do sistema</li>
              <li>Solicite as permissões adequadas para sua função</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={handleGoBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button className="flex-1" onClick={handleGoHome}>
              <Home className="mr-2 h-4 w-4" />
              Ir para Início
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessDeniedPage;
