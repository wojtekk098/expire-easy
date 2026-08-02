import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { ContactActions } from "@/components/ContactActions";
import { formatPL, friendlyMessage, type Item } from "@/lib/deadline-types";


export function ItemRow({
  item,
  onEdit,
  onDelete,
  onOpen,
}: {
  item: Item;
  onEdit: () => void;
  onDelete: () => void;
  onOpen?: () => void;
}) {
  return (
    <li className="panel grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4 transition-shadow hover:shadow-md sm:flex sm:justify-between">
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <p className="truncate font-medium">{friendlyMessage(item)}</p>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {item.category} · {formatPL(item.expiry_date)}
        </p>
        {item.notes ? (
          <p className="mt-1 truncate text-xs text-muted-foreground">{item.notes}</p>
        ) : null}
      </button>
      <div className="flex shrink-0 items-center gap-2">
        <ContactActions item={item} />
        <StatusBadge expiryDate={item.expiry_date} className="hidden sm:inline-flex" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Więcej opcji">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="size-4" />
              Edytuj
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                onDelete();
                toast.success("Pozycja usunięta");
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="size-4" />
              Usuń
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}
