"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Settings2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"

interface CardManagerProps {
  cards: { id: string; label: string }[]
  visibleCards: string[]
  onToggleCard: (id: string, visible: boolean) => void
}

export function CardManager({ cards, visibleCards, onToggleCard }: CardManagerProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-9 rounded-full px-5 text-muted-foreground hover:text-foreground hover:bg-accent transition-all gap-2">
          <Settings2 className="h-4 w-4" />
          卡片管理
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>仪表盘卡片管理</DialogTitle>
          <DialogDescription>
            选择您想要在仪表盘上显示的卡片。
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="grid gap-4 py-4">
            {cards.map((card) => (
              <div key={card.id} className="flex items-center justify-between space-x-2 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                <Label htmlFor={`card-${card.id}`} className="flex flex-col gap-1 cursor-pointer flex-1">
                  <span className="font-medium">{card.label}</span>
                </Label>
                <Switch
                  id={`card-${card.id}`}
                  checked={visibleCards.includes(card.id)}
                  onCheckedChange={(checked) => onToggleCard(card.id, checked)}
                />
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
