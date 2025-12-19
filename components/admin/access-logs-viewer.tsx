"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { RefreshCcw } from "lucide-react"
import { AccessLog } from "@/lib/db/security-service"
import { format } from "date-fns"

export function AccessLogsViewer() {
  const [logs, setLogs] = useState<AccessLog[]>([])
  const [loading, setLoading] = useState(false)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/access-logs?limit=50")
      if (res.ok) {
        const data = await res.json()
        setLogs(data)
      }
    } catch (error) {
      console.error("Failed to fetch logs", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Access Logs</CardTitle>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border max-h-[400px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Path</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">No logs found</TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(log.created_at), "MM-dd HH:mm:ss")}
                    </TableCell>
                    <TableCell>{log.ip}</TableCell>
                    <TableCell>{log.method}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={log.path}>
                      {log.path}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        log.status >= 400 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {log.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
