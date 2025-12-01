import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, User, Building, Shield, Bell } from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { UserRoles } from "@/config/permissions";

export function SettingsPage() {
  const { userRole } = useRole();

  const sections = [
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
    },
    {
      icon: Settings,
      title: "Sistema",
      description: "Configurações avançadas do sistema",
      roles: [UserRoles.SUPER_ADMIN],
    },
  ];

  const visibleSections = sections.filter((section) =>
    section.roles.includes(userRole!)
  );

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie suas preferências e configurações do sistema
        </p>
      </div>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleSections.map((section) => {
          const Icon = section.icon;
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

