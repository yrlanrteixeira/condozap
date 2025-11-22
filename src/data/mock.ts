import type { Resident, Message, Complaint, Template } from '@/types'

export const INITIAL_RESIDENTS: Resident[] = [
  {
    id: '1',
    name: 'Carlos Silva',
    phone: '5511999990001',
    tower: 'A',
    floor: '1',
    unit: '101',
  },
  {
    id: '2',
    name: 'Ana Souza',
    phone: '5511999990002',
    tower: 'A',
    floor: '1',
    unit: '102',
  },
  {
    id: '3',
    name: 'Roberto Dias',
    phone: '5511999990003',
    tower: 'A',
    floor: '2',
    unit: '201',
  },
  {
    id: '4',
    name: 'Fernanda Lima',
    phone: '5511999990004',
    tower: 'B',
    floor: '5',
    unit: '505',
  },
  {
    id: '5',
    name: 'Paulo Mendes',
    phone: '5511999990005',
    tower: 'B',
    floor: '6',
    unit: '601',
  },
]

export const INITIAL_MESSAGES: Message[] = [
  {
    id: 1,
    timestamp: new Date().toISOString(),
    type: 'template',
    templateName: 'aviso_encomenda',
    scope: 'Unidade',
    target: '101',
    content: 'Template: aviso_encomenda',
    status: 'sent',
  },
  {
    id: 2,
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    type: 'text',
    scope: 'Torre',
    target: 'A',
    content: 'Manutenção no elevador amanhã.',
    status: 'sent',
  },
  {
    id: 3,
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    type: 'template',
    templateName: 'boleto_condominio',
    scope: 'Todos',
    target: 'Todos',
    content: 'Template: boleto_condominio',
    status: 'sent',
  },
]

export const INITIAL_COMPLAINTS: Complaint[] = [
  {
    id: 1,
    residentId: '4',
    category: 'Barulho',
    content: 'Barulho excessivo no andar de cima após as 22h.',
    status: 'open',
    timestamp: new Date().toISOString(),
  },
  {
    id: 2,
    residentId: '2',
    category: 'Manutenção',
    content: 'Lâmpada do corredor queimada.',
    status: 'in_progress',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 3,
    residentId: '3',
    category: 'Segurança',
    content: 'Portão da garagem demorando para fechar.',
    status: 'resolved',
    timestamp: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 4,
    residentId: '1',
    category: 'Barulho',
    content: 'Som alto na piscina.',
    status: 'open',
    timestamp: new Date().toISOString(),
  },
  {
    id: 5,
    residentId: '1',
    category: 'Limpeza',
    content: 'Lixo deixado no hall.',
    status: 'resolved',
    timestamp: new Date(Date.now() - 200000000).toISOString(),
  },
]

export const COMPLAINT_CATEGORIES = [
  'Barulho',
  'Manutenção',
  'Segurança',
  'Limpeza',
  'Outros',
] as const

export const TEMPLATES: Template[] = [
  {
    name: 'aviso_encomenda',
    label: 'Chegada de Encomenda',
    language: 'pt_BR',
    components: [
      { type: 'body', parameters: [{ type: 'text', text: '{{nome}}' }] },
    ],
  },
  {
    name: 'status_reclamacao',
    label: 'Atualização de Chamado',
    language: 'pt_BR',
    components: [
      { type: 'body', parameters: [{ type: 'text', text: '{{status}}' }] },
    ],
  },
  {
    name: 'boleto_condominio',
    label: 'Boleto Disponível',
    language: 'pt_BR',
    components: [
      {
        type: 'header',
        parameters: [{ type: 'document', document: { link: '{{link}}' } }],
      },
    ],
  },
  {
    name: 'aviso_assembleia',
    label: 'Convocação Assembleia',
    language: 'pt_BR',
    components: [
      {
        type: 'body',
        parameters: [{ type: 'date_time', date_time: '{{data}}' }],
      },
    ],
  },
]
