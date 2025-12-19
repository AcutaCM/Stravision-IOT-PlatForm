"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Ban, Trash2, ShieldAlert } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { BannedIP } from "@/lib/db/security-service"

export function BannedIPsManager() {
  const [ips, setIps] = useState<BannedIP[]>([])
  const [loading, setLoading] = useState(true)
  const [newIp, setNewIp] = useState("")
  const [reason, setReason] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)

  const fetchIps = async () => {
    try {
      const res = await fetch("/api/admin/banned-ips")
      if (res.ok) {
        const data = await res.json()
        setIps(data)
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to load banned IPs")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIps()
  }, [])

  const handleBan = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch("/api/admin/banned-ips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: newIp, reason }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to ban IP")
      }

      toast.success("IP banned successfully")
      setNewIp("")
      setReason("")
      setDialogOpen(false)
      fetchIps()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Operation failed")
    }
  }

  const handleUnban = async (ip: string) => {
    try {
      const res = await fetch(`/api/admin/banned-ips?ip=${ip}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to unban IP")

      toast.success("IP unbanned successfully")
      fetchIps()
    } catch (error) {
      toast.error("Failed to unban IP")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
           <h2 className="text-lg font-semibold tracking-tight">Security & Banned IPs</h2>
           <p className="text-sm text-muted-foreground">Manage IP blocks and access control.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Ban className="mr-2 h-4 w-4" />
              Ban IP
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ban IP Address</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleBan} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="ip">IP Address</Label>
                <Input
                  id="ip"
                  placeholder="192.168.1.1"
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason (Optional)</Label>
                <Input
                  id="reason"
                  placeholder="Malicious activity"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <Button type="submit" variant="destructive" className="w-full">
                Confirm Ban
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>IP Address</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Banned By</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  No banned IPs found.
                </TableCell>
              </TableRow>
            ) : (
              ips.map((ip) => (
                <TableRow key={ip.id}>
                  <TableCell className="font-mono">{ip.ip}</TableCell>
                  <TableCell>{ip.reason || "-"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{ip.banned_by}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {format(new Date(ip.created_at), "yyyy-MM-dd HH:mm")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnban(ip.ip)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Unban</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
