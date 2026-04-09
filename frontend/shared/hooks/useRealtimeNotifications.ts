import { useSSENotifications } from "./useSSENotifications";

// Hook wrapper para ser usado no App root
export function useRealtimeNotifications() {
  useSSENotifications();
  return null;
}