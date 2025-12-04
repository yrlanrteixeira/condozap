/**
 * Application Constants
 * Constantes globais da aplicação
 */

// =====================================================
// Complaint Categories
// =====================================================

export const COMPLAINT_CATEGORIES = [
  'Barulho',
  'Manutenção',
  'Segurança',
  'Limpeza',
  'Outros',
] as const;

export type ComplaintCategory = typeof COMPLAINT_CATEGORIES[number];

// =====================================================
// Resident Types
// =====================================================

export const RESIDENT_TYPES = ['OWNER', 'TENANT'] as const;
export type ResidentType = typeof RESIDENT_TYPES[number];

// =====================================================
// Message Types
// =====================================================

export const MESSAGE_TYPES = ['TEXT', 'TEMPLATE', 'IMAGE'] as const;
export type MessageType = typeof MESSAGE_TYPES[number];

// =====================================================
// Time Constants
// =====================================================

export const ONE_DAY_MS = 24 * 60 * 60 * 1000;
export const TWO_DAYS_MS = 2 * ONE_DAY_MS;
export const NOTIFICATION_DURATION_MS = 5000;

// =====================================================
// Pagination
// =====================================================

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// =====================================================
// WhatsApp Templates
// =====================================================

export interface Template {
  name: string;
  label: string;
  language: string;
  components: Array<{
    type: string;
    parameters: Array<{ type: string; text: string }>;
  }>;
}

export const TEMPLATES: readonly Template[] = [
  {
    name: 'aviso_encomenda',
    label: 'Chegada de Encomenda',
    language: 'pt_BR',
    components: [{ type: 'body', parameters: [{ type: 'text', text: '{{nome}}' }] }],
  },
  {
    name: 'status_reclamacao',
    label: 'Atualização de Chamado',
    language: 'pt_BR',
    components: [{ type: 'body', parameters: [{ type: 'text', text: '{{numero}}' }] }],
  },
  {
    name: 'manutencao_programada',
    label: 'Manutenção Programada',
    language: 'pt_BR',
    components: [
      { type: 'body', parameters: [{ type: 'text', text: '{{data}}' }] },
    ],
  },
] as const;

