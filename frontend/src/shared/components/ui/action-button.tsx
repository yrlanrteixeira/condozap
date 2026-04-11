import { MoreHorizontal, Pencil, Trash2, Eye, Copy, Download, Share2, ExternalLink } from "lucide-react";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { cn } from "@/lib/utils";

interface ActionItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "destructive";
}

interface ActionButtonProps {
  actions: ActionItem[];
  className?: string;
}

export function ActionButton({ actions, className }: ActionButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", className)}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.id}
            onClick={action.onClick}
            disabled={action.disabled}
            className={cn(
              "cursor-pointer",
              action.variant === "destructive" && "text-destructive"
            )}
          >
            {action.icon && <span className="mr-2">{action.icon}</span>}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const actionIcons = {
  edit: <Pencil className="h-4 w-4" />,
  delete: <Trash2 className="h-4 w-4" />,
  view: <Eye className="h-4 w-4" />,
  copy: <Copy className="h-4 w-4" />,
  download: <Download className="h-4 w-4" />,
  share: <Share2 className="h-4 w-4" />,
  external: <ExternalLink className="h-4 w-4" />,
};

interface IconActionButtonProps {
  icon: keyof typeof actionIcons;
  onClick: () => void;
  tooltip?: string;
  disabled?: boolean;
  variant?: "default" | "destructive";
  className?: string;
}

export function IconActionButton({
  icon,
  onClick,
  tooltip,
  disabled,
  variant = "default",
  className,
}: IconActionButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "h-8 w-8",
        variant === "destructive" && "text-destructive hover:text-destructive",
        className
      )}
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
    >
      {actionIcons[icon]}
    </Button>
  );
}