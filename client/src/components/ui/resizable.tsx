import * as React from "react";
import { GripVerticalIcon } from "lucide-react";
import * as ResizablePrimitive from "react-resizable-panels";

import { cn } from "@/lib/utils";

type ResizablePanelGroupProps = React.ComponentProps<
  typeof ResizablePrimitive.Group
> & {
  /** Backward-compatible alias for the v4 orientation prop. */
  direction?: "horizontal" | "vertical";
};

function ResizablePanelGroup({
  className,
  direction,
  orientation = direction ?? "horizontal",
  ...props
}: ResizablePanelGroupProps) {
  return (
    <ResizablePrimitive.Group
      data-slot="resizable-panel-group"
      className={cn("flex h-full w-full", className)}
      orientation={orientation}
      {...props}
    />
  );
}

type ResizablePanelProps = Omit<
  React.ComponentProps<typeof ResizablePrimitive.Panel>,
  "defaultSize" | "minSize" | "maxSize" | "collapsedSize"
> & {
  /** Numeric sizes retain the percentage semantics of react-resizable-panels v3. */
  defaultSize?: number | string;
  minSize?: number | string;
  maxSize?: number | string;
  collapsedSize?: number | string;
};

function toPanelSize(size: number | string | undefined) {
  return typeof size === "number" ? `${size}%` : size;
}

function ResizablePanel({
  defaultSize,
  minSize,
  maxSize,
  collapsedSize,
  ...props
}: ResizablePanelProps) {
  return (
    <ResizablePrimitive.Panel
      data-slot="resizable-panel"
      defaultSize={toPanelSize(defaultSize)}
      minSize={toPanelSize(minSize)}
      maxSize={toPanelSize(maxSize)}
      collapsedSize={toPanelSize(collapsedSize)}
      {...props}
    />
  );
}

type ResizableHandleProps = React.ComponentProps<
  typeof ResizablePrimitive.Separator
> & {
  withHandle?: boolean;
};

function ResizableHandle({
  withHandle,
  className,
  ...props
}: ResizableHandleProps) {
  return (
    <ResizablePrimitive.Separator
      data-slot="resizable-handle"
      className={cn(
        "bg-border focus-visible:ring-ring relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:after:left-0 aria-[orientation=horizontal]:after:top-1/2 aria-[orientation=horizontal]:after:bottom-auto aria-[orientation=horizontal]:after:h-1 aria-[orientation=horizontal]:after:w-full aria-[orientation=horizontal]:after:translate-x-0 aria-[orientation=horizontal]:after:-translate-y-1/2 [&[aria-orientation=horizontal]>div]:rotate-90",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="bg-border z-10 flex h-4 w-3 items-center justify-center rounded-xs border">
          <GripVerticalIcon className="size-2.5" />
        </div>
      )}
    </ResizablePrimitive.Separator>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
