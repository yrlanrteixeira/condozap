/**
 * Funções no condomínio (`councilPosition`) — alinhado ao backend e à lista da equipe.
 *
 * Os itens em "Gestão" representam papéis de gestão/administração do
 * condomínio. O label "Gestão" é apenas um cabeçalho de categoria — quem
 * estiver criando o membro deve clicar diretamente em "Síndico",
 * "Conselheiro", "Subsíndico" ou "Auxiliar administrativo".
 */
export const MEMBER_FUNCTION_GROUPS: {
  label: string;
  options: { value: string; label: string }[];
}[] = [
  {
    label: "Gestão",
    options: [
      { value: "Síndico", label: "Síndico" },
      { value: "Conselheiro", label: "Conselheiro" },
      { value: "Subsíndico", label: "Subsíndico" },
      { value: "Auxiliar administrativo", label: "Auxiliar administrativo" },
    ],
  },
  {
    label: "Operação e apoio",
    options: [
      { value: "Porteiro", label: "Porteiro" },
      { value: "Limpeza", label: "Limpeza" },
      { value: "Segurança", label: "Segurança" },
    ],
  },
  {
    label: "Áreas do conselho",
    options: [
      { value: "Obras", label: "Obras" },
      { value: "Financeiro", label: "Financeiro" },
      { value: "Jurídico", label: "Jurídico" },
      { value: "Social", label: "Social" },
      { value: "Comunicação", label: "Comunicação" },
    ],
  },
];

export const KNOWN_MEMBER_FUNCTION_VALUES = new Set(
  MEMBER_FUNCTION_GROUPS.flatMap((g) => g.options.map((o) => o.value))
);
