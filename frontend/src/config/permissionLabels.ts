/**
 * Rótulos amigáveis para chaves de permissão (fallback quando não há entrada explícita).
 */
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
