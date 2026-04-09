/**
 * Rótulos amigáveis para chaves de permissão, organizados por categoria.
 */
export const PERMISSION_CATEGORIES = {
  OCCURRENCES: {
    label: "Ocorrências",
    permissions: {
      "view:complaints": "Ver ocorrências do setor",
      "view:all_complaints": "Ver todas as ocorrências do condomínio",
      "create:complaint": "Criar ocorrência",
      "edit:complaint": "Editar ocorrência",
      "update:complaint_status": "Alterar status da ocorrência",
      "update:complaint_priority": "Alterar prioridade",
      "comment:complaint": "Comentar na ocorrência",
      "resolve:complaint": "Marcar como resolvida",
      "return:complaint": "Devolver ao morador",
      "reassign:complaint": "Reatribuir a outro setor/membro",
      "delete:complaint": "Excluir ocorrência",
      "view:anonymous_complaints": "Ver ocorrências anônimas",
    },
  },
  RESIDENTS: {
    label: "Moradores",
    permissions: {
      "view:residents": "Ver moradores",
      "view:all_residents": "Ver todos os moradores",
      "create:resident": "Cadastrar morador",
      "edit:resident": "Editar dados do morador",
      "manage:residents": "Gerenciar moradores e aprovações",
      "manage:consent": "Gerenciar consentimentos",
    },
  },
  MESSAGES: {
    label: "Mensagens",
    permissions: {
      "view:messages": "Ver mensagens",
      "view:message_history": "Ver histórico de mensagens",
      "send:message": "Enviar mensagens",
      "send:bulk_message": "Enviar mensagens em massa",
      "send:to_all": "Enviar para todos",
      "send:to_tower": "Enviar por torre",
      "send:to_floor": "Enviar por andar",
      "send:to_unit": "Enviar por unidade",
    },
  },
  SECTOR: {
    label: "Setores",
    permissions: {
      "view:structure": "Ver estrutura e setores",
      "manage:structure": "Gerenciar setores e membros",
    },
  },
  DASHBOARD: {
    label: "Painel",
    permissions: {
      "view:dashboard": "Ver painel do condomínio",
      "view:unified_dashboard": "Ver painel unificado",
      "view:metrics": "Ver métricas",
      "view:all_metrics": "Ver métricas de todos os condomínios",
      "view_sector_dashboard": "Ver painel do setor",
      "view_sector_complaints": "Ver ocorrências do setor",
    },
  },
  REPORTS: {
    label: "Relatórios",
    permissions: {
      "view:reports": "Ver relatórios",
      "export:reports": "Exportar relatórios",
      "export:residents": "Exportar moradores",
    },
  },
  TEAM: {
    label: "Equipe",
    permissions: {
      "view:users": "Ver usuários da equipe",
      "manage:team": "Gerenciar equipe e acessos",
    },
  },
  HISTORY: {
    label: "Histórico",
    permissions: {
      "view:history": "Ver histórico",
      "view:all_history": "Ver todo o histórico",
    },
  },
  ANNOUNCEMENTS: {
    label: "Comunicados",
    permissions: {
      "view:announcements": "Ver comunicados",
      "create:announcement": "Criar comunicado",
    },
  },
  SETTINGS: {
    label: "Configurações",
    permissions: {
      "view:settings": "Ver configurações",
      "edit:settings": "Editar configurações",
    },
  },
  WHATSAPP: {
    label: "WhatsApp",
    permissions: {
      "view:whatsapp_status": "Ver status do WhatsApp",
      "manage:whatsapp": "Gerenciar WhatsApp",
    },
  },
  BILLING: {
    label: "Cobrança",
    permissions: {
      "view:billing": "Ver assinatura e cobrança",
    },
  },
  PROFILE: {
    label: "Perfil",
    permissions: {
      "view:own_profile": "Ver próprio perfil",
    },
  },
  SURVEY: {
    label: "Avaliação",
    permissions: {
      "submit:csat": "Avaliar ocorrência resolvida",
    },
  },
} as const;

const EXPLICIT: Record<string, string> = {
  "view:dashboard": "Ver painel",
  "view:unified_dashboard": "Ver painel unificado",
  "view:metrics": "Ver métricas",
  "view:all_metrics": "Ver métricas de todos os condomínios",
  "view:condominiums": "Ver condomínios",
  "view:structure": "Ver estrutura",
  "manage:structure": "Gerenciar estrutura e setores",
  "view:residents": "Ver moradores",
  "view:all_residents": "Ver todos os moradores",
  "create:resident": "Cadastrar morador",
  "edit:resident": "Editar morador",
  "manage:residents": "Gerenciar moradores e aprovações",
  "manage:team": "Gerenciar equipe e acessos",
  "view:complaints": "Ver ocorrências",
  "view:all_complaints": "Ver todas as ocorrências",
  "comment:complaint": "Comentar em ocorrência",
  "update:complaint_status": "Alterar status da ocorrência",
  "resolve:complaint": "Resolver ocorrência",
  "return:complaint": "Devolver ocorrência ao morador",
  "reassign:complaint": "Reatribuir ocorrência",
  "view:messages": "Ver mensagens",
  "send:message": "Enviar mensagens",
  "send:bulk_message": "Enviar mensagens em massa",
  "view:reports": "Ver relatórios",
  "export:reports": "Exportar relatórios",
  "export:residents": "Exportar moradores",
  "view:announcements": "Ver comunicados",
  "create:announcement": "Criar comunicado",
  "view:settings": "Ver configurações",
  "edit:settings": "Editar configurações",
  "view:whatsapp_status": "Ver status do WhatsApp",
  "manage:whatsapp": "Gerenciar WhatsApp",
  "view:history": "Ver histórico",
  "view:users": "Ver usuários da equipe",
  "view:billing": "Ver assinatura / cobrança",
  "view_sector_dashboard": "Painel do setor",
  "view_sector_complaints": "Ocorrências do setor",
};

export function permissionLabel(key: string): string {
  return EXPLICIT[key] ?? key.replace(/:/g, " · ");
}
