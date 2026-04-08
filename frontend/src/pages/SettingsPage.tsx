import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Settings, User, Building, Shield, Bell, MessageSquare, FileText } from "lucide-react";
import { useRole } from "@/shared/hooks/useRole";
import { UserRoles } from "@/config/permissions";
import { WhatsAppConnectionStatus } from "@/features/whatsapp";
import {
  SettingsProfileCard,
  SettingsCondominiumCard,
  SettingsNotificationsCard,
  SettingsSecurityCard,
  SyndicProfileCard,
  CannedResponsesManager,
} from "@/features/settings";

export function SettingsPage() {
  const { userRole } = useRole();

  const sections: Array<{
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    roles: string[];
    /** Se true, morador vê esta seção em /settings (demais seções ficam ocultas). */
    residentVisible?: boolean;
    component?: React.ComponentType;
  }> = [
    {
      icon: User,
      title: "Perfil",
      description: "Gerencie suas informações pessoais",
      roles: [
        UserRoles.SUPER_ADMIN,
        UserRoles.PROFESSIONAL_SYNDIC,
        UserRoles.ADMIN,
        UserRoles.SYNDIC,
        UserRoles.RESIDENT,
      ],
      residentVisible: true,
      component: SettingsProfileCard,
    },
    {
      icon: Building,
      title: "Condomínio",
      description: "Configurações do condomínio",
      roles: [
        UserRoles.SUPER_ADMIN,
        UserRoles.PROFESSIONAL_SYNDIC,
        UserRoles.ADMIN,
        UserRoles.SYNDIC,
      ],
      component: SettingsCondominiumCard,
    },
    {
      icon: Bell,
      title: "Notificações",
      description: "Preferências de notificações",
      roles: [
        UserRoles.SUPER_ADMIN,
        UserRoles.PROFESSIONAL_SYNDIC,
        UserRoles.ADMIN,
        UserRoles.SYNDIC,
        UserRoles.RESIDENT,
      ],
      component: SettingsNotificationsCard,
    },
    {
      icon: Shield,
      title: "Privacidade e Segurança",
      description: "Gerenciar senha e autenticação",
      roles: [
        UserRoles.SUPER_ADMIN,
        UserRoles.PROFESSIONAL_SYNDIC,
        UserRoles.ADMIN,
        UserRoles.SYNDIC,
        UserRoles.RESIDENT,
      ],
      residentVisible: true,
      component: SettingsSecurityCard,
    },
    {
      icon: User,
      title: "Seu Síndico",
      description: "Contato do síndico do condomínio",
      roles: [UserRoles.RESIDENT],
      component: SyndicProfileCard,
    },
    {
      icon: MessageSquare,
      title: "WhatsApp",
      description: "Gerenciar conexão com WhatsApp",
      roles: [
        UserRoles.SUPER_ADMIN,
        UserRoles.PROFESSIONAL_SYNDIC,
        UserRoles.ADMIN,
        UserRoles.SYNDIC,
      ],
      component: WhatsAppConnectionStatus,
    },
    {
      icon: FileText,
      title: "Respostas Padrão",
      description: "Modelos de resposta para agilizar o atendimento",
      roles: [UserRoles.SYNDIC, UserRoles.PROFESSIONAL_SYNDIC, UserRoles.ADMIN],
      component: CannedResponsesManager,
    },
    {
      icon: Settings,
      title: "Sistema",
      description: "Configurações avançadas do sistema",
      roles: [UserRoles.SUPER_ADMIN],
    },
  ];

  const visibleSections = sections.filter((section) => {
    if (!userRole) return false;
    if (userRole === UserRoles.RESIDENT) {
      return section.residentVisible === true;
    }
    return section.roles.includes(userRole);
  });

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie suas preferências e configurações do sistema
        </p>
      </div>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleSections.map((section) => {
          const Icon = section.icon;
          
          // Se a seção tem um componente dedicado, renderiza ele
          if (section.component) {
            const Component = section.component;
            return <Component key={section.title} />;
          }
          
          return (
            <Card
              key={section.title}
              className="cursor-pointer hover:shadow-md transition-shadow"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-primary" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {section.description}
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  Em desenvolvimento...
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

