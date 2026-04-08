/**
 * Types - Core Types
 * Exports apenas tipos essenciais (user e api)
 * Tipos específicos de features devem estar dentro de /features
 */

// User & Authentication Types
export * from "./user";

// API Types
export * from "./api";

// UI Types
export * from "./ui";

// Re-export feature types that are used globally
export type { Resident } from "@/features/residents/types";
export type { ComplaintPriority } from "@/features/complaints/types";

// Inline type for urgent feed items (matches UnifiedDashboardMetrics.urgentFeed)
export interface UrgentFeedItem {
  id: string;
  title: string;
  description: string;
  priority: ComplaintPriority;
  timestamp: string;
  condominiumId: string;
  condominiumName: string;
}
