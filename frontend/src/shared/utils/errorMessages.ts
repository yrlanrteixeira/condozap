/**
 * Error Messages Helper
 *
 * Traduz erros técnicos em mensagens amigáveis para o usuário
 */

/**
 * Extrai texto de erro da API (Fastify: `{ error: { message } }`) ou do Axios
 * (interceptor já define `error.message` em muitos casos).
 * Evita passar `response.data.error` como objeto para toasts — isso quebrava a UI.
 */
export function getApiErrorMessage(error: unknown): string {
  if (error === null || error === undefined) {
    return "Ocorreu um erro inesperado.";
  }

  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "object" && "message" in error) {
    const err = error as {
      message?: string;
      response?: { data?: ApiErrorBody };
    };

    const data = err.response?.data;
    if (data && typeof data === "object") {
      if (typeof data.message === "string" && data.message.trim()) {
        return data.message;
      }
      if (typeof data.error === "string" && data.error.trim()) {
        return data.error;
      }
      if (
        data.error &&
        typeof data.error === "object" &&
        data.error !== null &&
        "message" in data.error &&
        typeof (data.error as { message: unknown }).message === "string"
      ) {
        const nested = (data.error as { message: string }).message;
        if (nested.trim()) return nested;
      }
    }

    if (typeof err.message === "string" && err.message.trim()) {
      return err.message;
    }
  }

  return "Ocorreu um erro inesperado.";
}

type ApiErrorBody = {
  message?: string;
  error?: string | { message?: string };
};

interface ErrorResponse {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
    status?: number;
  };
  message?: string;
  code?: string;
}

interface FriendlyError {
  title: string;
  description: string;
  suggestion?: string;
}

/**
 * Traduz erros de rede/API para mensagens amigáveis
 */
export function getFriendlyErrorMessage(error: unknown): FriendlyError {
  const err = error as ErrorResponse;

  // Erro de rede (sem conexão)
  if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
    return {
      title: 'Sem conexão',
      description: 'Não foi possível conectar ao servidor.',
      suggestion: 'Verifique sua conexão com a internet e tente novamente.',
    };
  }

  // Timeout
  if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
    return {
      title: 'Tempo esgotado',
      description: 'A operação demorou muito para responder.',
      suggestion: 'Tente novamente em alguns instantes.',
    };
  }

  // Status HTTP
  const status = err.response?.status;
  const serverMessage = getApiErrorMessage(error);

  switch (status) {
    case 400:
      return {
        title: 'Dados inválidos',
        description: serverMessage || 'Os dados enviados estão incorretos.',
        suggestion: 'Verifique os campos e tente novamente.',
      };

    case 401:
      return {
        title: 'Não autorizado',
        description: 'Sua sessão expirou ou você não tem permissão.',
        suggestion: 'Faça login novamente para continuar.',
      };

    case 403:
      return {
        title: 'Acesso negado',
        description: serverMessage || 'Você não tem permissão para esta ação.',
        suggestion: 'Entre em contato com o administrador se precisar de acesso.',
      };

    case 404:
      return {
        title: 'Não encontrado',
        description: serverMessage || 'O recurso solicitado não foi encontrado.',
        suggestion: 'Verifique se o item ainda existe e tente novamente.',
      };

    case 409:
      return {
        title: 'Conflito',
        description: serverMessage || 'Este item já existe no sistema.',
        suggestion: 'Use um valor diferente ou edite o item existente.',
      };

    case 422:
      return {
        title: 'Validação falhou',
        description: serverMessage || 'Os dados não passaram na validação.',
        suggestion: 'Corrija os erros destacados e tente novamente.',
      };

    case 429:
      return {
        title: 'Muitas tentativas',
        description: 'Você fez muitas requisições em pouco tempo.',
        suggestion: 'Aguarde alguns minutos antes de tentar novamente.',
      };

    case 500:
    case 502:
    case 503:
    case 504:
      return {
        title: 'Erro no servidor',
        description: 'Ocorreu um problema no servidor.',
        suggestion: 'Tente novamente em alguns instantes. Se o problema persistir, entre em contato com o suporte.',
      };

    default:
      // Mensagem genérica
      return {
        title: 'Erro inesperado',
        description: serverMessage || err.message || 'Ocorreu um erro desconhecido.',
        suggestion: 'Tente novamente. Se o problema persistir, entre em contato com o suporte.',
      };
  }
}

/**
 * Erros específicos de contexto (ex: criação de usuário, envio de mensagem)
 */
export const contextErrors = {
  createUser: {
    emailExists: {
      title: 'Email já cadastrado',
      description: 'Este email já está sendo usado por outro usuário.',
      suggestion: 'Use um email diferente ou recupere a senha da conta existente.',
    },
    weakPassword: {
      title: 'Senha fraca',
      description: 'A senha precisa ter pelo menos 8 caracteres.',
      suggestion: 'Use uma senha mais forte com letras, números e símbolos.',
    },
  },
  sendMessage: {
    noRecipients: {
      title: 'Sem destinatários',
      description: 'Nenhum morador foi encontrado com os filtros selecionados.',
      suggestion: 'Ajuste os filtros ou adicione moradores ao condomínio.',
    },
    emptyMessage: {
      title: 'Mensagem vazia',
      description: 'Digite uma mensagem antes de enviar.',
      suggestion: 'Escreva o conteúdo da mensagem no campo de texto.',
    },
  },
  deleteItem: {
    inUse: {
      title: 'Item em uso',
      description: 'Este item não pode ser removido pois está sendo usado.',
      suggestion: 'Remova as dependências primeiro ou desative o item.',
    },
  },
};

/**
 * Mensagens de sucesso contextuais
 */
export const successMessages = {
  createUser: (name: string) => ({
    title: 'Usuário criado!',
    description: `${name} foi criado com sucesso e já pode acessar o sistema.`,
  }),
  createSyndic: (name: string, condosCount: number) => ({
    title: 'Síndico criado!',
    description: `${name} foi criado e vinculado a ${condosCount} condomínio${condosCount > 1 ? 's' : ''}.`,
  }),
  sendMessage: (count: number) => ({
    title: 'Mensagem enviada!',
    description: `Sua mensagem foi enviada para ${count} morador${count > 1 ? 'es' : ''}.`,
  }),
  updateStatus: (item: string) => ({
    title: 'Atualizado!',
    description: `${item} foi atualizado com sucesso.`,
  }),
  deleteItem: (item: string) => ({
    title: 'Removido!',
    description: `${item} foi removido do sistema.`,
  }),
};
