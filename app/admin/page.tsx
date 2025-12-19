"use client"

import { useEffect, useState } from "react"
import { UserPublic } from "@/lib/db/user-service"
import { Button } from "@/components/ui/button"
import { UserDialog } from "@/components/admin/user-dialog"
import { toast } from "sonner"
import { Loader2, Pencil, Plus } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table" // Assuming table exists now or I will use standard HTML if it fails
import { BannedIPsManager } from "@/components/admin/banned-ips-manager"
import { AccessLogsViewer } from "@/components/admin/access-logs-viewer"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function AdminPage() {
  const [users, setUsers] = useState<UserPublic[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserPublic | null>(null)
  const [currentUser, setCurrentUser] = useState<UserPublic | null>(null)

  // ... existing fetch functions ...
  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users")
      if (!res.ok) throw new Error("Failed to fetch users")
      const data = await res.json()
      setUsers(data)
    } catch (error) {
      console.error(error)
      toast.error("Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/auth/me")
      const data = await res.json()
      if (data.authenticated) {
        setCurrentUser(data.user)
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchCurrentUser()
    fetchUsers()
  }, [])

  const handleEdit = (user: UserPublic) => {
    setSelectedUser(user)
    setDialogOpen(true)
  }

  const handleCreate = () => {
    setSelectedUser(null)
    setDialogOpen(true)
  }

  const handleSuccess = () => {
    fetchUsers()
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 md:py-10 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            System management and security controls.
          </p>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="security">Security & Bans</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-end">
             <Button onClick={handleCreate}>
               <Plus className="mr-2 h-4 w-4" />
               Add User
             </Button>
          </div>

          {/* Mobile View: Cards */}
          <div className="grid gap-4 md:hidden overflow-y-auto max-h-[calc(100vh-250px)]">
            {users.map((user) => (
              <Card key={user.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-medium leading-none">
                      {user.username}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {user.email}
                    </p>
                  </div>
                  <Badge variant={user.role === 'super_admin' ? 'default' : user.role === 'admin' ? 'secondary' : 'outline'}>
                    {user.role}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
                    <span className="font-medium text-foreground">Permissions: </span>
                    {user.permissions?.allowedControls?.length 
                      ? `${user.permissions.allowedControls.length} devices allowed` 
                      : 'No device permissions'}
                  </div>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => handleEdit(user)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit User
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden md:block rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'super_admin' ? 'default' : user.role === 'admin' ? 'secondary' : 'outline'}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.permissions?.allowedControls?.length 
                        ? `${user.permissions.allowedControls.length} controls` 
                        : 'None'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(user)}>
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <div className="col-span-4">
              <AccessLogsViewer />
            </div>
            <div className="col-span-3">
              <BannedIPsManager />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {currentUser && (
        <UserDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          user={selectedUser}
          currentUserRole={currentUser.role}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
