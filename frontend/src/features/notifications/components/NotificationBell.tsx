import { Bell, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
} from "../hooks/useNotificationsApi";
import type { AppNotification } from "../types";

const COMPLAINT_NOTIFICATION_TYPES = new Set([
  "complaint_status",
  "complaint_assigned",
  "complaint_nudge",
  "complaint_comment",
  "sla_warning",
  "sla_escalation",
]);

export function NotificationBell() {
  const navigate = useNavigate();
  const { data: unreadData } = useUnreadCount();
  const { data: notificationsData } = useNotifications(10);
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const unreadCount = unreadData?.unreadCount ?? 0;
  const notifications = notificationsData?.notifications ?? [];

  const badgeLabel = unreadCount > 9 ? "9+" : unreadCount > 0 ? String(unreadCount) : null;

  function handleNotificationClick(notification: AppNotification) {
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }

    const complaintId = notification.data?.complaintId;
    if (
      complaintId &&
      COMPLAINT_NOTIFICATION_TYPES.has(notification.type)
    ) {
      navigate(`/complaints?open=${complaintId}`);
    }
  }

  function handleMarkAllAsRead() {
    markAllAsRead.mutate();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5" />
          {badgeLabel !== null && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
              {badgeLabel}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-sm font-semibold">Notificações</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsRead.isPending}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
            Nenhuma notificação
          </div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={`flex cursor-pointer flex-col items-start gap-0.5 px-3 py-2.5 focus:bg-accent ${
                !notification.read ? "bg-blue-50/60 dark:bg-blue-950/20" : ""
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex w-full items-start gap-2">
                {!notification.read && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                )}
                <div className={`flex flex-col gap-0.5 ${!notification.read ? "" : "pl-4"}`}>
                  <span className="text-sm font-medium leading-snug">
                    {notification.title}
                  </span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">
                    {notification.body}
                  </span>
                  <span className="mt-0.5 text-[11px] text-muted-foreground/70">
                    {formatDistanceToNow(new Date(notification.createdAt), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </div>
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
