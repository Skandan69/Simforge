"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { CheckIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;
export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
export const DropdownMenuSub = DropdownMenuPrimitive.Sub;
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

export function DropdownMenuContent({ className, sideOffset = 6, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        className={cn("z-50 min-w-48 overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out", className)}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({ className, inset, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & { inset?: boolean }) {
  return <DropdownMenuPrimitive.Item className={cn("relative flex cursor-default select-none items-center gap-2 rounded-md px-2 py-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", inset && "pl-8", className)} {...props} />;
}

export function DropdownMenuLabel({ className, inset, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & { inset?: boolean }) {
  return <DropdownMenuPrimitive.Label className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return <DropdownMenuPrimitive.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
}

export function DropdownMenuSubTrigger({ className, inset, children, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & { inset?: boolean }) {
  return <DropdownMenuPrimitive.SubTrigger className={cn("flex cursor-default select-none items-center rounded-md px-2 py-2 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent", inset && "pl-8", className)} {...props}>{children}<ChevronRightIcon className="ml-auto size-4" /></DropdownMenuPrimitive.SubTrigger>;
}

export function DropdownMenuCheckboxItem({ className, children, checked, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return <DropdownMenuPrimitive.CheckboxItem className={cn("relative flex cursor-default select-none items-center rounded-md py-2 pl-8 pr-2 text-sm outline-none focus:bg-accent", className)} checked={checked} {...props}><span className="absolute left-2 flex size-4 items-center justify-center"><DropdownMenuPrimitive.ItemIndicator><CheckIcon className="size-4" /></DropdownMenuPrimitive.ItemIndicator></span>{children}</DropdownMenuPrimitive.CheckboxItem>;
}
