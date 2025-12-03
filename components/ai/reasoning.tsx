"use client"

import * as React from "react"
import { ChevronDown, Loader2, Sparkles } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

interface ReasoningProps extends React.ComponentProps<typeof Collapsible> {
  isStreaming?: boolean
}

const Reasoning = React.forwardRef<React.ElementRef<typeof Collapsible>, ReasoningProps>(
  ({ className, children, isStreaming, defaultOpen = true, ...props }, ref) => {
    const [open, setOpen] = React.useState(defaultOpen)

    // Auto-open when streaming starts, close when stops
    React.useEffect(() => {
      setOpen(!!isStreaming)
    }, [isStreaming])

    return (
      <Collapsible
        ref={ref}
        open={open}
        onOpenChange={setOpen}
        className={cn("border-l-2 border-muted pl-4", className)}
        {...props}
      >
        {children}
      </Collapsible>
    )
  }
)
Reasoning.displayName = "Reasoning"

const ReasoningTrigger = React.forwardRef<
  React.ElementRef<typeof CollapsibleTrigger>,
  React.ComponentProps<typeof CollapsibleTrigger>
>(({ className, children, ...props }, ref) => (
  <CollapsibleTrigger
    ref={ref}
    className={cn(
      "flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2",
      className
    )}
    {...props}
  >
    {children || (
      <>
        <Sparkles className="h-4 w-4" />
        <span>Thinking Process</span>
        <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </>
    )}
  </CollapsibleTrigger>
))
ReasoningTrigger.displayName = "ReasoningTrigger"

const ReasoningContent = React.forwardRef<
  React.ElementRef<typeof CollapsibleContent>,
  React.ComponentProps<typeof CollapsibleContent>
>(({ className, children, ...props }, ref) => (
  <CollapsibleContent
    ref={ref}
    className={cn("text-sm text-muted-foreground/80 overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down", className)}
    {...props}
  >
    <div className="pb-2">{children}</div>
  </CollapsibleContent>
))
ReasoningContent.displayName = "ReasoningContent"

export { Reasoning, ReasoningTrigger, ReasoningContent }
