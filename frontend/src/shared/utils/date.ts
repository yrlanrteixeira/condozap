import {
  format,
  formatDistanceToNow,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  isValid,
  parseISO,
  subDays,
  subHours,
  subMinutes,
  addDays,
  addHours,
  addMinutes,
  startOfDay,
  endOfDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Converts a date-like value to a Date object.
 * Accepts Date, ISO string, or timestamp number.
 */
function toDate(date: Date | string | number): Date {
  if (date instanceof Date) return date;
  if (typeof date === "string") return parseISO(date);
  return new Date(date);
}

/**
 * Formats a date as "dd/MM/yyyy" (e.g. "16/03/2026").
 */
export function formatDate(date: Date | string | number): string {
  return format(toDate(date), "dd/MM/yyyy", { locale: ptBR });
}

/**
 * Formats a date as "dd/MM/yyyy HH:mm" (e.g. "16/03/2026 14:30").
 */
export function formatDateTime(date: Date | string | number): string {
  return format(toDate(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

/**
 * Formats a date as "dd 'de' MMMM 'as' HH:mm" (e.g. "16 de marco as 14:30").
 */
export function formatDateLong(date: Date | string | number): string {
  return format(toDate(date), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
}

/**
 * Returns a human-readable relative time string (e.g. "há 5 minutos").
 */
export function formatRelativeTime(date: Date | string | number): string {
  return formatDistanceToNow(toDate(date), {
    addSuffix: true,
    locale: ptBR,
  });
}

/**
 * Formats a date using a custom pattern with ptBR locale.
 */
export function formatCustom(
  date: Date | string | number,
  pattern: string
): string {
  return format(toDate(date), pattern, { locale: ptBR });
}

/**
 * Returns the difference in days between two dates.
 */
export function daysBetween(
  dateLeft: Date | string | number,
  dateRight: Date | string | number
): number {
  return differenceInDays(toDate(dateLeft), toDate(dateRight));
}

/**
 * Checks whether a given value is a valid date.
 */
export function isValidDate(date: unknown): boolean {
  if (date instanceof Date) return isValid(date);
  if (typeof date === "string") return isValid(parseISO(date));
  if (typeof date === "number") return isValid(new Date(date));
  return false;
}

export {
  subDays,
  subHours,
  subMinutes,
  addDays,
  addHours,
  addMinutes,
  startOfDay,
  endOfDay,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  isValid,
  parseISO,
};
