/**
 * Sistema de Log de Auditoria
 * Centraliza todos os logs de segurança e tentativas de acesso
 *
 * Funcionalidades:
 * - Log estruturado de eventos de segurança
 * - Diferentes níveis de severidade
 * - Formato padronizado para análise
 * - Preparado para integração com backend
 */

export enum AuditEventType {
  // Autenticação
  LOGIN_SUCCESS = "LOGIN_SUCCESS",
  LOGIN_FAILED = "LOGIN_FAILED",
  LOGOUT = "LOGOUT",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  TOKEN_REFRESH_SUCCESS = "TOKEN_REFRESH_SUCCESS",
  TOKEN_REFRESH_FAILED = "TOKEN_REFRESH_FAILED",

  // Autorização
  ACCESS_DENIED_INVALID_ROLE = "ACCESS_DENIED_INVALID_ROLE",
  ACCESS_DENIED_INSUFFICIENT_ROLE = "ACCESS_DENIED_INSUFFICIENT_ROLE",
  ACCESS_DENIED_INSUFFICIENT_PERMISSION = "ACCESS_DENIED_INSUFFICIENT_PERMISSION",
  ACCESS_DENIED_NO_PERMISSIONS = "ACCESS_DENIED_NO_PERMISSIONS",
  ACCESS_DENIED_PAGE_403 = "ACCESS_DENIED_PAGE_403",

  // Acesso
  ROUTE_ACCESS = "ROUTE_ACCESS",
  RESOURCE_ACCESS = "RESOURCE_ACCESS",
}

export enum AuditSeverity {
  INFO = "INFO",
  WARNING = "WARNING",
  ERROR = "ERROR",
  CRITICAL = "CRITICAL",
}

export interface AuditLogEntry {
  timestamp: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId?: string | number;
  userName?: string;
  userRole?: string | number; // Suporta roles como string (CondoZap) ou number (outros)
  attemptedPath?: string;
  attemptedResource?: string;
  requiredRole?: string | number;
  requiredRoles?: (string | number)[];
  requiredPermission?: string;
  requiredPermissions?: string[];
  tokenExpiresAt?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Classe para gerenciamento de logs de auditoria
 */
class AuditLogger {
  private logs: AuditLogEntry[] = [];
  private maxLogsInMemory = 100; // Máximo de logs em memória
  private isProduction = import.meta.env.PROD;

  /**
   * Adiciona um log de auditoria
   */
  private addLog(entry: AuditLogEntry): void {
    this.logs.push(entry);

    // Limita logs em memória
    if (this.logs.length > this.maxLogsInMemory) {
      this.logs.shift();
    }

    // Em desenvolvimento, sempre mostra no console
    if (!this.isProduction) {
      this.logToConsole(entry);
    }

    // TODO: Enviar para backend quando API estiver disponível
    // this.sendToBackend(entry);
  }

  /**
   * Formata e exibe log no console
   */
  private logToConsole(entry: AuditLogEntry): void {
    const emoji = this.getSeverityEmoji(entry.severity);
    const prefix = `${emoji} [AUDITORIA]`;

    const message = `${prefix} ${entry.eventType}:`;
    const details = {
      timestamp: entry.timestamp,
      userId: entry.userId,
      userName: entry.userName,
      userRole: entry.userRole,
      path: entry.attemptedPath,
      resource: entry.attemptedResource,
      required:
        entry.requiredRole ||
        entry.requiredRoles ||
        entry.requiredPermission ||
        entry.requiredPermissions,
      reason: entry.reason,
      ...entry.metadata,
    };

    // Remove campos undefined
    Object.keys(details).forEach((key) => {
      const typedKey = key as keyof typeof details;
      if (details[typedKey] === undefined) {
        delete details[typedKey];
      }
    });

    switch (entry.severity) {
      case AuditSeverity.CRITICAL:
      case AuditSeverity.ERROR:
        console.error(message, details);
        break;
      case AuditSeverity.WARNING:
        console.warn(message, details);
        break;
      default:
        console.log(message, details);
    }
  }

  /**
   * Retorna emoji baseado na severidade
   */
  private getSeverityEmoji(severity: AuditSeverity): string {
    switch (severity) {
      case AuditSeverity.CRITICAL:
        return "🚨";
      case AuditSeverity.ERROR:
        return "❌";
      case AuditSeverity.WARNING:
        return "⚠️";
      default:
        return "📝";
    }
  }

  /**
   * Log de login bem-sucedido
   */
  logLoginSuccess(
    userId: string | number,
    userName: string,
    userRole: number
  ): void {
    this.addLog({
      timestamp: new Date().toISOString(),
      eventType: AuditEventType.LOGIN_SUCCESS,
      severity: AuditSeverity.INFO,
      userId,
      userName,
      userRole,
    });
  }

  /**
   * Log de falha no login
   */
  logLoginFailed(email: string, reason: string): void {
    this.addLog({
      timestamp: new Date().toISOString(),
      eventType: AuditEventType.LOGIN_FAILED,
      severity: AuditSeverity.WARNING,
      reason,
      metadata: { email },
    });
  }

  /**
   * Log de logout
   */
  logLogout(userId?: string | number, userName?: string): void {
    this.addLog({
      timestamp: new Date().toISOString(),
      eventType: AuditEventType.LOGOUT,
      severity: AuditSeverity.INFO,
      userId,
      userName,
    });
  }

  /**
   * Log de token expirado
   */
  logTokenExpired(
    userId?: string | number,
    userName?: string,
    userRole?: string | number,
    tokenExpiresAt?: number,
    attemptedPath?: string
  ): void {
    this.addLog({
      timestamp: new Date().toISOString(),
      eventType: AuditEventType.TOKEN_EXPIRED,
      severity: AuditSeverity.WARNING,
      userId,
      userName,
      userRole,
      attemptedPath,
      tokenExpiresAt: tokenExpiresAt
        ? new Date(tokenExpiresAt).toISOString()
        : undefined,
    });
  }

  /**
   * Log de renovação de token bem-sucedida
   */
  logTokenRefreshSuccess(userId?: string | number): void {
    this.addLog({
      timestamp: new Date().toISOString(),
      eventType: AuditEventType.TOKEN_REFRESH_SUCCESS,
      severity: AuditSeverity.INFO,
      userId,
    });
  }

  /**
   * Log de falha na renovação de token
   */
  logTokenRefreshFailed(userId?: string | number, reason?: string): void {
    this.addLog({
      timestamp: new Date().toISOString(),
      eventType: AuditEventType.TOKEN_REFRESH_FAILED,
      severity: AuditSeverity.ERROR,
      userId,
      reason,
    });
  }

  /**
   * Log de acesso negado por perfil inválido
   */
  logAccessDeniedInvalidRole(
    userId?: string | number,
    userName?: string,
    userRole?: string | number,
    attemptedPath?: string
  ): void {
    this.addLog({
      timestamp: new Date().toISOString(),
      eventType: AuditEventType.ACCESS_DENIED_INVALID_ROLE,
      severity: AuditSeverity.ERROR,
      userId,
      userName,
      userRole,
      attemptedPath,
      reason: "Perfil de usuário inválido para acesso administrativo",
    });
  }

  /**
   * Log de acesso negado por role insuficiente
   */
  logAccessDeniedInsufficientRole(
    userId?: string | number,
    userName?: string,
    userRole?: string | number,
    requiredRole?: string | number,
    requiredRoles?: (string | number)[],
    attemptedPath?: string
  ): void {
    this.addLog({
      timestamp: new Date().toISOString(),
      eventType: AuditEventType.ACCESS_DENIED_INSUFFICIENT_ROLE,
      severity: AuditSeverity.WARNING,
      userId,
      userName,
      userRole,
      requiredRole,
      requiredRoles,
      attemptedPath,
      reason: "Perfil insuficiente para acessar recurso",
    });
  }

  /**
   * Log de acesso negado por permissão insuficiente
   */
  logAccessDeniedInsufficientPermission(
    userId?: string | number,
    userName?: string,
    userRole?: string | number,
    requiredPermission?: string,
    requiredPermissions?: string[],
    attemptedPath?: string
  ): void {
    this.addLog({
      timestamp: new Date().toISOString(),
      eventType: AuditEventType.ACCESS_DENIED_INSUFFICIENT_PERMISSION,
      severity: AuditSeverity.WARNING,
      userId,
      userName,
      userRole,
      requiredPermission,
      requiredPermissions,
      attemptedPath,
      reason: "Permissões insuficientes para acessar recurso",
    });
  }

  /**
   * Log de acesso à página 403
   */
  logAccessDeniedPage(
    userId?: string | number,
    userName?: string,
    userRole?: string | number,
    attemptedPath?: string
  ): void {
    this.addLog({
      timestamp: new Date().toISOString(),
      eventType: AuditEventType.ACCESS_DENIED_PAGE_403,
      severity: AuditSeverity.WARNING,
      userId,
      userName,
      userRole,
      attemptedPath,
    });
  }

  /**
   * Log de acesso a rota (sucesso)
   */
  logRouteAccess(
    userId: string | number,
    userName: string,
    userRole: string | number,
    path: string
  ): void {
    this.addLog({
      timestamp: new Date().toISOString(),
      eventType: AuditEventType.ROUTE_ACCESS,
      severity: AuditSeverity.INFO,
      userId,
      userName,
      userRole,
      attemptedPath: path,
    });
  }

  /**
   * Retorna todos os logs em memória
   */
  getLogs(): AuditLogEntry[] {
    return [...this.logs];
  }

  /**
   * Limpa logs da memória
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Exporta logs como JSON
   */
  exportLogsAsJSON(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Filtra logs por tipo de evento
   */
  getLogsByEventType(eventType: AuditEventType): AuditLogEntry[] {
    return this.logs.filter((log) => log.eventType === eventType);
  }

  /**
   * Filtra logs por usuário
   */
  getLogsByUser(userId: string | number): AuditLogEntry[] {
    return this.logs.filter((log) => log.userId === userId);
  }

  /**
   * Filtra logs por severidade
   */
  getLogsBySeverity(severity: AuditSeverity): AuditLogEntry[] {
    return this.logs.filter((log) => log.severity === severity);
  }
}

// Instância singleton
export const auditLogger = new AuditLogger();

// Export default para facilitar importação
export default auditLogger;
