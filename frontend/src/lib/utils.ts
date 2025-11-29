/**
 * Utility Functions
 * Single Responsibility: Provide reusable utility functions
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Class Name Merger
 * Merges Tailwind CSS classes with proper conflict resolution
 *
 * @param inputs - Class values to merge
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
