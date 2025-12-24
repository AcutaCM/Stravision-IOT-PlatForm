"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Send, UserPlus, Check, CheckCheck, X, MessageSquare, User as UserIcon, ChevronLeft, Users, MoreVertical, Shield, ShieldOff, Volume2, VolumeX, Plus, LogOut, Edit, Search, Phone, Video, MapPin, Image as ImageIcon, Smile, Mic, Paperclip, Bell, MessageCircle, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { PageNavigation } from "@/components/page-navigation"
import { ModeToggle } from "@/components/mode-toggle"
import { UserAvatarMenu } from "@/components/user-avatar-menu"
import Image from "next/image"
import { UpdateAnnouncement } from "@/components/update-announcement"

interface User {
  id: number
  username: string
  email: string
  avatar_url: string | null
  role?: string
  is_blocked?: boolean
  last_message?: Message
  unread_count?: number
}

interface FriendRequest {
  id: number
  requester: User
  status: string
  created_at: number
}

interface Group {
  id: number
  name: string
  owner_id: number
  avatar_url: string | null
  created_at: number
  last_message?: Message
  unread_count?: number
}

interface GroupMember {
  group_id: number
  user_id: number
  role: 'owner' | 'admin' | 'member'
  is_muted: boolean
  user: User
}

interface Message {
  id: number
  sender_id: number
  receiver_id: number | null
  group_id: number | null
  content: string
  type?: string
  file_url?: string | null
  created_at: number
  read_at: number | null
}

const formatTime = (timestamp: number) => {
  if (!timestamp) return ""
  const date = new Date(timestamp)
  const now = new Date()
  
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString()
}

export default function ChatPage() {
  const [friends, setFriends] = useState<User[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [requests, setRequests] = useState<FriendRequest[]>([])
  
  const [activeFriend, setActiveFriend] = useState<User | null>(null)
  const [activeGroup, setActiveGroup] = useState<Group | null>(null)
  
  const [isTyping, setIsTyping] = useState(false)
  
  // Debounce typing status
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value)
      
      // Send typing status
      if (activeFriend || activeGroup) {
          // Throttle sending every 1s
          if (!typingTimeoutRef.current) {
              fetch('/api/chat/typing', {
                  method: 'POST',
                  body: JSON.stringify({
                      targetId: activeFriend?.id,
                      groupId: activeGroup?.id
                  })
              })
              typingTimeoutRef.current = setTimeout(() => {
                  typingTimeoutRef.current = null
              }, 1000)
          }
      }
  }

  // Poll for typing status of other user
  useEffect(() => {
      if (!activeFriend && !activeGroup) return
      
      const checkTyping = async () => {
          try {
              const params = new URLSearchParams()
              if (activeFriend) params.append('targetId', activeFriend.id.toString())
              if (activeGroup) params.append('groupId', activeGroup.id.toString())
              
              const res = await fetch(`/api/chat/typing?${params.toString()}`)
              const data = await res.json()
              setIsTyping(data.isTyping)
          } catch (e) {
              console.error(e)
          }
      }

      checkTyping() // Check immediately
      const interval = setInterval(checkTyping, 2000) // Poll every 2s
      
      return () => clearInterval(interval)
  }, [activeFriend, activeGroup])

  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const emojis = ["👍", "❤️", "😂", "😮", "😢", "😡", "🎉", "🔥", "🤝", "👀"]

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
        const res = await fetch('/api/chat/upload', {
            method: 'POST',
            body: formData
        })
        const data = await res.json()
        if (data.success) {
             const type = file.type.startsWith('image/') ? 'image' : 'audio'
             const content = type === 'image' ? '[图片]' : '[语音]'
             await handleSendMessage(content, type, data.url)
        } else {
            console.error("Upload error:", data.error)
            toast.error(data.error || "Upload failed")
        }
    } catch (error) {
        console.error("Upload exception:", error)
        toast.error("Upload failed")
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const recorder = new MediaRecorder(stream)
        const chunks: Blob[] = []
        
        recorder.ondataavailable = (e) => chunks.push(e.data)
        recorder.onstop = async () => {
            const blob = new Blob(chunks, { type: 'audio/webm' })
            const file = new File([blob], "recording.webm", { type: 'audio/webm' })
            
            const formData = new FormData()
            formData.append('file', file)
            
            try {
                const res = await fetch('/api/chat/upload', { method: 'POST', body: formData })
                const data = await res.json()
                if (data.success) {
                    await handleSendMessage('[语音]', 'audio', data.url)
                }
            } catch (e) {
                toast.error("Audio upload failed")
            }
        }
        
        recorder.start()
        setMediaRecorder(recorder)
        setIsRecording(true)
    } catch (err) {
        console.error(err)
        toast.error("Could not access microphone")
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop()
        mediaRecorder.stream.getTracks().forEach(track => track.stop())
        setIsRecording(false)
        setMediaRecorder(null)
    }
  }

  const filteredFriends = friends.filter(f => 
    f.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
    f.email.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const [addFriendEmail, setAddFriendEmail] = useState("")
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false)
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false)
  const [showChatDetails, setShowChatDetails] = useState(false)
  
  // Group creation state
  const [newGroupName, setNewGroupName] = useState("")
  const [selectedFriends, setSelectedFriends] = useState<number[]>([])

  // Group info state
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([])

  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [viewMode, setViewMode] = useState<'messages' | 'groups'>('messages')

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch current user
  useEffect(() => {
    fetch('/api/auth/me').then(res => res.json()).then(data => {
      if (data.user) setCurrentUser(data.user)
    })
  }, [])

  // Fetch friends
  const fetchFriends = async () => {
      try {
        const res = await fetch('/api/friends')
        const data = await res.json()
        if (data.friends) setFriends(data.friends)
      } catch (error) { console.error(error) }
  }

  // Fetch groups
  const fetchUserGroups = async () => {
      try {
        const res = await fetch('/api/groups')
        const data = await res.json()
        if (data.groups) setGroups(data.groups)
      } catch (error) { console.error(error) }
  }

  // Fetch requests
  const fetchRequests = async () => {
      try {
          const res = await fetch('/api/friends/requests')
          const data = await res.json()
          if (data.requests) setRequests(data.requests)
      } catch (error) { console.error(error) }
  }

  // Fetch all data
  const fetchData = async () => {
    await Promise.all([fetchFriends(), fetchRequests(), fetchUserGroups()])
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000) // Poll every 10s
    return () => clearInterval(interval)
  }, [])

  // Fetch messages when active chat changes
  const fetchMessages = useCallback(async () => {
    if (!activeFriend && !activeGroup) return

    try {
      let url = ''
      if (activeFriend) {
        url = `/api/direct-messages?friendId=${activeFriend.id}`
      } else if (activeGroup) {
        url = `/api/groups/messages?groupId=${activeGroup.id}`
      }

      const res = await fetch(url)
      const data = await res.json()
      if (data.messages) setMessages(data.messages)
    } catch (error) {
      console.error("Failed to fetch messages", error)
    }
  }, [activeFriend, activeGroup])

  useEffect(() => {
    fetchMessages()
    const interval = setInterval(fetchMessages, 3000) // Poll messages every 3s
    return () => clearInterval(interval)
  }, [fetchMessages])

  // Fetch group members when viewing group info
  useEffect(() => {
    if (activeGroup && showChatDetails) {
      fetch(`/api/groups/members?groupId=${activeGroup.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.members) setGroupMembers(data.members)
        })
    }
  }, [activeGroup, showChatDetails])

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendRequest = async () => {
    try {
      const res = await fetch('/api/friends/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: addFriendEmail })
      })
      const data = await res.json()
      
      if (res.ok) {
        toast.success(data.message || "请求已发送")
        setAddFriendEmail("")
        setIsAddFriendOpen(false)
        fetchData()
      } else {
        toast.error(data.error || "发送请求失败")
      }
    } catch (error) {
      toast.error("发送请求失败")
    }
  }

  const handleRespondRequest = async (requestId: number, action: 'accept' | 'reject') => {
    try {
      const res = await fetch('/api/friends/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action })
      })
      
      if (res.ok) {
        toast.success(action === 'accept' ? "已接受好友请求" : "已拒绝好友请求")
        fetchData()
      }
    } catch (error) {
      console.error("Failed to respond", error)
    }
  }

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error("请输入群组名称")
      return
    }

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newGroupName,
          members: selectedFriends
        })
      })
      const data = await res.json()

      if (res.ok) {
        toast.success("群组创建成功")
        setNewGroupName("")
        setSelectedFriends([])
        setIsCreateGroupOpen(false)
        fetchData()
      } else {
        toast.error(data.error || "创建群组失败")
      }
    } catch (error) {
      toast.error("创建群组失败")
    }
  }

  const handleSendMessage = async (contentOverride?: string, type: 'text' | 'image' | 'audio' | 'file' = 'text', fileUrl?: string) => {
    const contentToSend = contentOverride || inputValue
    if (!contentToSend.trim() && type === 'text') return
    if (!activeFriend && !activeGroup) return

    try {
      let url = ''
      let body: any = {}

      if (activeFriend) {
        url = '/api/direct-messages'
        body = { friendId: activeFriend.id, content: contentToSend, type, fileUrl }
      } else if (activeGroup) {
        url = '/api/groups/messages'
        body = { groupId: activeGroup.id, content: contentToSend, type, fileUrl }
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        if (type === 'text') setInputValue("")
        await fetchMessages()
        // Refresh lists to show new message in sidebar
        fetchFriends()
        fetchUserGroups()
      } else {
        toast.error("Failed to send message")
      }
    } catch (error) {
      toast.error("Error sending message")
    }
  }

  const handleBlockUser = async (userId: number, block: boolean) => {
    try {
      const res = await fetch('/api/users/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId: userId, block })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message)
      } else {
        toast.error(data.error || "更新拉黑状态失败")
      }
    } catch (error) {
      toast.error("拉黑/取消拉黑用户失败")
    }
  }

  const handleToggleMute = async (groupId: number, userId: number, mute: boolean) => {
    try {
      const res = await fetch('/api/groups/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          groupId, 
          userId, 
          action: mute ? 'mute' : 'unmute' 
        })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message)
        // Refresh members
        const membersRes = await fetch(`/api/groups/members?groupId=${groupId}`)
        const membersData = await membersRes.json()
        if (membersData.members) setGroupMembers(membersData.members)
      } else {
        toast.error(data.error || "更新禁言状态失败")
      }
    } catch (error) {
      toast.error("更新禁言状态失败")
    }
  }

  const toggleFriendSelection = (friendId: number) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    )
  }

  const switchToFriend = (friend: User) => {
    setActiveFriend(friend)
    setActiveGroup(null)
  }

  const switchToGroup = (group: Group) => {
    setActiveGroup(group)
    setActiveFriend(null)
  }

  return (
    <div className="min-h-screen w-screen h-screen bg-background text-foreground transition-colors duration-500 overflow-hidden">
      <UpdateAnnouncement />
      {/* Background Gradients */}
      {/* Removed for cleaner look */}

      <div className="relative z-10 flex flex-col h-full w-full">
        {/* Header - Kept global header but made it white/clean */}
        {!isMobile && (
        <div className="relative flex items-center px-8 border-b border-border/10 bg-background z-20 h-[72px] shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative size-12">
              <Image src="/logo.svg" alt="logo" fill className="object-contain" />
            </div>
            <div className="leading-tight">
              <div className="text-base font-bold tracking-wide">STRAVISION</div>
              <div className="text-xs text-muted-foreground">莓界 · 智慧农业平台</div>
            </div>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
            <PageNavigation />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <ModeToggle />
            {currentUser && <UserAvatarMenu user={currentUser as any} />}
          </div>
        </div>
        )}

        {/* Main Content - 3 Column Layout Simulation */}
        <div className="flex-1 overflow-hidden bg-background relative">
          <div className="flex h-full w-full max-w-[1600px] mx-auto">
            
            {/* Middle Column: Message List */}
            <div className={cn(
              "w-full md:w-[400px] flex flex-col h-full border-r border-border/10 bg-background",
              isMobile && (activeFriend || activeGroup) ? "hidden" : "flex"
            )}>
              {isMobile ? (
                 <div className="px-4 py-3 flex flex-col gap-3 border-b border-border/5 bg-background sticky top-0 z-10">
                    <div className="flex items-center justify-between">
                        <Avatar className="h-9 w-9">
                            <AvatarImage src={currentUser?.avatar_url || undefined} />
                            <AvatarFallback>{currentUser?.username?.[0]}</AvatarFallback>
                        </Avatar>
                        
                        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-full p-1 relative scale-90">
                            <button 
                                onClick={() => setViewMode('messages')}
                                className={cn(
                                    "px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 z-10",
                                    viewMode === 'messages' ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                Message
                            </button>
                            <button 
                                onClick={() => setViewMode('groups')}
                                className={cn(
                                    "px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 z-10",
                                    viewMode === 'groups' ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                Group
                            </button>
                        </div>

                        <div className="flex items-center gap-1">
                            <Dialog open={isAddFriendOpen} onOpenChange={setIsAddFriendOpen}>
                                <DialogTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full">
                                        <Plus className="h-5 w-5 text-slate-600" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>添加好友</DialogTitle>
                                    </DialogHeader>
                                    <div className="flex gap-2 mt-4">
                                        <Input 
                                            placeholder="邮箱..." 
                                            value={addFriendEmail}
                                            onChange={(e) => setAddFriendEmail(e.target.value)}
                                        />
                                        <Button onClick={handleSendRequest}>发送请求</Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                            <Button size="icon" variant="ghost" className="rounded-full h-9 w-9">
                                <Bell className="h-5 w-5 text-slate-600" />
                            </Button>
                        </div>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="搜索好友或群组" 
                            className="pl-9 bg-slate-100 dark:bg-slate-800 border-none rounded-xl h-10" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                 </div>
              ) : (
              <div className="px-6 py-6 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">消息</h1>
                    <div className="flex gap-2">
                         <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
                            <DialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                                    <Edit className="h-5 w-5" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>创建群组</DialogTitle>
                                </DialogHeader>
                                <div className="flex flex-col gap-4 mt-4">
                                    <div className="space-y-2">
                                        <Label>群组名称</Label>
                                        <Input 
                                            placeholder="群组名称..." 
                                            value={newGroupName}
                                            onChange={(e) => setNewGroupName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>选择成员</Label>
                                        <ScrollArea className="h-48 border rounded-md p-2">
                                            <div className="space-y-2">
                                                {friends.map(friend => (
                                                    <div key={friend.id} className="flex items-center space-x-2">
                                                        <Checkbox 
                                                            id={`friend-${friend.id}`} 
                                                            checked={selectedFriends.includes(friend.id)}
                                                            onCheckedChange={() => toggleFriendSelection(friend.id)}
                                                        />
                                                        <Label htmlFor={`friend-${friend.id}`} className="flex-1 cursor-pointer flex items-center gap-2">
                                                            <Avatar className="h-6 w-6">
                                                                <AvatarImage src={friend.avatar_url || undefined} />
                                                                <AvatarFallback>{friend.username[0]}</AvatarFallback>
                                                            </Avatar>
                                                            {friend.username}
                                                        </Label>
                                                    </div>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                    <Button onClick={handleCreateGroup}>创建</Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                        <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500" onClick={() => document.getElementById('search-input')?.focus()}>
                            <Search className="h-5 w-5" />
                        </Button>
                        <Dialog open={isAddFriendOpen} onOpenChange={setIsAddFriendOpen}>
                            <DialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                                    <Plus className="h-5 w-5" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>添加好友</DialogTitle>
                                </DialogHeader>
                                <div className="flex gap-2 mt-4">
                                    <Input 
                                        placeholder="邮箱..." 
                                        value={addFriendEmail}
                                        onChange={(e) => setAddFriendEmail(e.target.value)}
                                    />
                                    <Button onClick={handleSendRequest}>发送请求</Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                        id="search-input"
                        placeholder="搜索好友或群组" 
                        className="pl-9 bg-slate-100 dark:bg-slate-800 border-none rounded-full" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
              </div>
              )}

              <ScrollArea className="flex-1 px-4">
                <div className="space-y-6 pb-4">
                    {/* Groups Section */}
                    {(!isMobile || viewMode === 'groups') && filteredGroups.length > 0 && (
                        <div className="space-y-2">
                            {!isMobile && (
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">
                                <MapPin className="h-3 w-3" /> 群组
                            </div>
                            )}
                            <div className="space-y-1">
                                {filteredGroups.map(group => (
                                    <button
                                        key={group.id}
                                        onClick={() => switchToGroup(group)}
                                        className={cn(
                                            "w-full flex items-center gap-4 p-3 rounded-2xl text-left transition-all duration-200",
                                            isMobile 
                                              ? "bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 mb-3" 
                                              : (activeGroup?.id === group.id ? "bg-slate-100 dark:bg-slate-800" : "hover:bg-slate-50 dark:hover:bg-slate-900")
                                        )}
                                    >
                                        <div className="relative">
                                            <Avatar className="h-12 w-12 border border-slate-100 dark:border-slate-800">
                                                <AvatarImage src={group.avatar_url || undefined} />
                                                <AvatarFallback className="bg-orange-100 text-orange-600 font-bold">
                                                    {group.name[0].toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline mb-1">
                                                <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{group.name}</span>
                                                <span className="text-xs text-slate-400">
                                                    {group.last_message ? formatTime(group.last_message.created_at) : ''}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-slate-500 truncate block max-w-[180px]">
                                                    {group.last_message ? group.last_message.content : "暂无消息"}
                                                </span>
                                                {group.unread_count ? (
                                                    <Badge variant="destructive" className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                                                        {group.unread_count}
                                                    </Badge>
                                                ) : null}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Friend Requests Section */}
                    {(!isMobile || viewMode === 'messages') && requests.length > 0 && (
                        <div className="space-y-2 mb-6">
                            {!isMobile && (
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">
                                <UserPlus className="h-3 w-3" /> 好友请求
                            </div>
                            )}
                            <div className="space-y-1">
                                {requests.map(req => (
                                    <div key={req.id} className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                        <Avatar className="h-10 w-10 border border-slate-200 dark:border-slate-700">
                                            <AvatarImage src={req.requester.avatar_url || undefined} />
                                            <AvatarFallback>{req.requester.username[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{req.requester.username}</div>
                                            <div className="text-xs text-slate-500">请求添加好友</div>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-green-500 hover:bg-green-100 dark:hover:bg-green-900/20" onClick={() => handleRespondRequest(req.id, 'accept')}>
                                                <Check className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20" onClick={() => handleRespondRequest(req.id, 'reject')}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* All Messages Section (Friends) */}
                    {(!isMobile || viewMode === 'messages') && (
                    <div className="space-y-2">
                        {!isMobile && (
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">
                            <MessageSquare className="h-3 w-3" /> 全部消息
                        </div>
                        )}
                        <div className="space-y-1">
                            {filteredFriends.map(friend => (
                                <button
                                    key={friend.id}
                                    onClick={() => switchToFriend(friend)}
                                    className={cn(
                                        "w-full flex items-center gap-4 p-3 rounded-2xl text-left transition-all duration-200",
                                        isMobile 
                                          ? "bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 mb-3" 
                                          : (activeFriend?.id === friend.id ? "bg-slate-100 dark:bg-slate-800" : "hover:bg-slate-50 dark:hover:bg-slate-900")
                                    )}
                                >
                                    <div className="relative">
                                        <Avatar className="h-12 w-12 border border-slate-100 dark:border-slate-800">
                                            <AvatarImage src={friend.avatar_url || undefined} />
                                            <AvatarFallback className="bg-blue-100 text-blue-600 font-bold">
                                                {friend.username[0].toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{friend.username}</span>
                                            <span className="text-xs text-slate-400">
                                                {friend.last_message ? formatTime(friend.last_message.created_at) : ''}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-500 truncate block max-w-[180px]">
                                                {friend.last_message ? friend.last_message.content : friend.email}
                                            </span>
                                            {friend.unread_count ? (
                                                <Badge variant="destructive" className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                                                    {friend.unread_count}
                                                </Badge>
                                            ) : null}
                                        </div>
                                    </div>
                                </button>
                            ))}
                            {filteredFriends.length === 0 && (
                                <div className="text-center text-sm text-muted-foreground py-8">
                                    暂无好友
                                </div>
                            )}
                        </div>
                    </div>
                    )}
                    
                    {/* Bottom Encryption Note for Mobile */}
                    {isMobile && (
                        <div className="text-center text-[10px] text-slate-400 mt-8 mb-4">
                            Your personal messages are <span className="text-blue-500 font-medium">end-to-end-encrypted</span>
                        </div>
                    )}
                </div>
              </ScrollArea>
            </div>



            {/* Chat Area */}
            <div className={cn(
              "flex-1 flex flex-col bg-background transition-all duration-300",
              isMobile && (!activeFriend && !activeGroup) ? "hidden" : "flex"
            )}>
              {(activeFriend || activeGroup) ? (
                <>
                  <div className={cn(
                    "px-6 py-4 border-b border-border/10 flex items-center justify-between bg-background sticky top-0 z-10",
                    isMobile ? "px-4 py-2 border-none shadow-sm" : ""
                  )}>
                    <div className="flex items-center gap-4">
                      {isMobile && (
                        <Button variant="ghost" size="icon" className="-ml-2 h-8 w-8" onClick={() => { setActiveFriend(null); setActiveGroup(null); }}>
                          <ChevronLeft className="h-6 w-6" />
                        </Button>
                      )}
                      <Avatar className="h-10 w-10">
                        {activeFriend ? (
                          <>
                            <AvatarImage src={activeFriend.avatar_url || undefined} />
                            <AvatarFallback className="bg-blue-100 text-blue-600 font-bold">{activeFriend.username[0]}</AvatarFallback>
                          </>
                        ) : (
                          <>
                            <AvatarImage src={activeGroup?.avatar_url || undefined} />
                            <AvatarFallback className="bg-orange-100 text-orange-600 font-bold">
                              {activeGroup?.name[0]}
                            </AvatarFallback>
                          </>
                        )}
                      </Avatar>
                      <div>
                        <div className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
                          {activeFriend ? activeFriend.username : activeGroup?.name}
                        </div>
                        <div className="text-xs text-slate-500 font-medium animate-pulse">
                          {isTyping ? '正在输入...' : (
                              activeFriend ? <span className="text-green-500">Online</span> : `${groupMembers.length} 成员`
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-slate-400">
                       <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => toast.info("Video call coming soon!")}>
                          <Video className="h-5 w-5" />
                       </Button>
                       <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => toast.info("Voice call coming soon!")}>
                          <Phone className="h-5 w-5" />
                       </Button>
                       {!isMobile && (
                       <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setShowChatDetails(!showChatDetails)}>
                          <MoreVertical className="h-5 w-5" />
                       </Button>
                       )}
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col overflow-hidden relative">
                    <ScrollArea className="flex-1 p-6">
                      <div className="flex flex-col gap-6 min-h-0">
                         {messages.map((msg, index) => {
                           const isMe = msg.sender_id === currentUser?.id
                           const sender = isMe ? currentUser : (activeFriend || groupMembers.find(m => m.user_id === msg.sender_id)?.user)
                           
                           // Date separator logic
                           const showDateSeparator = index === 0 || new Date(msg.created_at).toDateString() !== new Date(messages[index - 1].created_at).toDateString()

                           return (
                             <div key={msg.id} className="flex flex-col gap-4">
                                {showDateSeparator && (
                                    <div className="flex justify-center my-2">
                                        <span className="text-xs text-slate-400 font-medium bg-slate-50 dark:bg-slate-900 px-3 py-1 rounded-full">
                                            {new Date(msg.created_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                )}
                                <div className={cn("flex w-full gap-3", isMe ? "flex-row-reverse" : "flex-row")}>
                                   {!isMe && (
                                       <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                                          <AvatarImage src={sender?.avatar_url || undefined} />
                                          <AvatarFallback>{sender?.username?.[0]}</AvatarFallback>
                                       </Avatar>
                                   )}
                                   <div className={cn("flex flex-col max-w-[75%]", isMe ? "items-end" : "items-start")}>
                                     {!isMe && activeGroup && <span className="text-xs text-slate-500 ml-1 mb-1">{sender?.username}</span>}
                                     <div className={cn(
                                      "relative px-4 py-3 text-[15px] leading-relaxed shadow-sm min-w-[80px]",
                                      isMe 
                                        ? "bg-blue-600 text-white rounded-2xl rounded-tr-sm" 
                                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-tl-sm"
                                    )}>
                                      {msg.type === 'image' ? (
                                          <img src={msg.file_url || msg.content} alt="Image" className="max-w-full rounded-lg" />
                                      ) : msg.type === 'audio' ? (
                                          <audio controls src={msg.file_url || msg.content} className="max-w-full" />
                                      ) : (
                                          <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                                      )}
                                      
                                      <div className={cn("flex items-center gap-1 mt-1 text-[10px]", isMe ? "text-blue-100 justify-end" : "text-slate-400")}>
                                          <span>{formatTime(msg.created_at)}</span>
                                          {isMe && <CheckCheck className="h-3 w-3" />}
                                      </div>
                                    </div>
                                   </div>
                                 </div>
                             </div>
                           )
                         })}
                         <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>
                    
                    <div className={cn("bg-background sticky bottom-0 z-10", isMobile ? "p-3" : "p-6")}>
                      <form 
                        onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                        className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-2 rounded-full shadow-sm"
                      >
                        <Button 
                            type="button" 
                            size="icon" 
                            variant="ghost" 
                            onClick={isRecording ? stopRecording : startRecording}
                            className={cn(
                                "h-10 w-10 rounded-full transition-colors",
                                isRecording ? "text-red-500 bg-red-50 hover:bg-red-100 animate-pulse" : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
                            )}
                        >
                            <Mic className="h-5 w-5" />
                        </Button>
                        <Input 
                          value={inputValue}
                        onChange={handleInputChange}
                        placeholder={isRecording ? "正在录音..." : "输入消息..."}
                          disabled={isRecording}
                          className="flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 text-base"
                        />
                        
                        <input 
                            type="file" 
                            accept="image/*,audio/*" 
                            className="hidden" 
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                        />
                        
                        <Button 
                            type="button" 
                            size="icon" 
                            variant="ghost" 
                            className="h-10 w-10 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <ImageIcon className="h-5 w-5" />
                        </Button>
                        
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button type="button" size="icon" variant="ghost" className="h-10 w-10 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/50">
                                    <Smile className="h-5 w-5" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-2" align="end">
                                <div className="grid grid-cols-5 gap-2">
                                    {emojis.map(emoji => (
                                        <button
                                            key={emoji}
                                            type="button"
                                            className="text-2xl hover:bg-slate-100 p-2 rounded"
                                            onClick={() => setInputValue(prev => prev + emoji)}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                        
                        <Button type="submit" size="icon" disabled={!inputValue.trim() && !isRecording} className="h-10 w-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all duration-300 hover:scale-105 active:scale-95 ml-1">
                          <Send className="h-4 w-4" />
                        </Button>
                      </form>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                  <div className="h-24 w-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 animate-[pulse_4s_ease-in-out_infinite]">
                    <MessageSquare className="h-12 w-12 text-blue-500" />
                  </div>
                  <p className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">欢迎使用消息</p>
                  <p className="text-slate-500">选择一个聊天开始发送消息</p>
                </div>
              )}
            </div>

            {/* Right Sidebar - Info Panel */}
            <div className={cn(
              "w-80 flex-col h-full bg-background border-l border-border/10 transition-all duration-300 hidden md:flex",
              showChatDetails ? "w-80 opacity-100" : "w-0 opacity-0 overflow-hidden"
            )}>
               <div className="px-6 py-6 border-b border-border/10 min-w-[320px]">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">详情</h2>
               </div>
               <ScrollArea className="flex-1 p-6 min-w-[320px]">
                  {activeFriend && (
                    <div className="flex flex-col items-center gap-4 py-8">
                       <Avatar className="h-24 w-24 border-4 border-slate-50 dark:border-slate-800">
                          <AvatarImage src={activeFriend.avatar_url || undefined} />
                          <AvatarFallback className="text-2xl bg-blue-100 text-blue-600 font-bold">{activeFriend.username[0].toUpperCase()}</AvatarFallback>
                       </Avatar>
                       <div className="text-center">
                          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{activeFriend.username}</h3>
                          <p className="text-sm text-slate-500">{activeFriend.email}</p>
                       </div>
                       
                       <div className="w-full mt-8 space-y-3">
                          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">选项</h4>
                            <Button variant="ghost" className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 h-12 rounded-xl" onClick={() => handleBlockUser(activeFriend.id, true)}>
                              <Shield className="mr-3 h-5 w-5" />
                              拉黑用户
                            </Button>
                          </div>
                       </div>
                    </div>
                  )}

                  {activeGroup && (
                    <div className="space-y-6">
                       <div className="flex flex-col items-center gap-4 py-6">
                          <Avatar className="h-24 w-24 border-4 border-slate-50 dark:border-slate-800">
                             <AvatarImage src={activeGroup.avatar_url || undefined} />
                             <AvatarFallback className="text-2xl bg-orange-100 text-orange-600 font-bold">{activeGroup.name[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="text-center">
                             <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{activeGroup.name}</h3>
                             <p className="text-sm text-slate-500">{groupMembers.length} 成员</p>
                          </div>
                       </div>

                       <div>
                          <div className="flex items-center justify-between mb-4">
                              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">成员</h4>
                              <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">{groupMembers.length}</span>
                          </div>
                          <div className="space-y-2">
                              {groupMembers.map(member => {
                                const isMe = member.user_id === currentUser?.id
                                const isSystemAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin'
                                const myMemberRecord = groupMembers.find(m => m.user_id === currentUser?.id)
                                const isGroupAdmin = myMemberRecord?.role === 'owner' || myMemberRecord?.role === 'admin'
                                const canManage = isSystemAdmin || isGroupAdmin
                                const targetIsAdmin = member.user.role === 'admin' || member.user.role === 'super_admin'
                                const showMuteButton = canManage && !isMe && !targetIsAdmin

                                return (
                                  <div key={member.user_id} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                      <Avatar className="h-10 w-10 shrink-0">
                                        <AvatarImage src={member.user.avatar_url || undefined} />
                                        <AvatarFallback className="bg-slate-200 text-slate-600 font-bold">{member.user.username[0]}</AvatarFallback>
                                      </Avatar>
                                      <div className="overflow-hidden">
                                        <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1">
                                          {member.user.username}
                                          {member.role === 'owner' && <Badge variant="secondary" className="h-5 px-2 text-[10px] bg-orange-100 text-orange-600 hover:bg-orange-200">群主</Badge>}
                                        </div>
                                      </div>
                                    </div>
                                    {showMuteButton && (
                                       <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className={cn("h-8 w-8 rounded-full", member.is_muted ? "text-red-500 bg-red-50" : "text-slate-400 hover:text-slate-600")}
                                          onClick={() => handleToggleMute(activeGroup.id, member.user_id, !member.is_muted)}
                                       >
                                          {member.is_muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                                       </Button>
                                    )}
                                  </div>
                                )
                              })}
                          </div>
                       </div>
                       
                       <Button variant="outline" className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 border-red-200 dark:border-red-900/30 h-12 rounded-xl font-medium">
                          <LogOut className="mr-3 h-5 w-5" />
                          退出群组
                       </Button>
                    </div>
                  )}
               </ScrollArea>
            </div>
          </div>
        </div>
        {isMobile && !activeFriend && !activeGroup && (
           <div className="h-16 shrink-0 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 grid grid-cols-4 items-center justify-items-center z-50">
              <Button variant="ghost" className="flex flex-col items-center justify-center gap-1 h-full w-full rounded-none hover:bg-slate-50 dark:hover:bg-slate-900 text-blue-600">
                 <MessageCircle className="h-6 w-6" />
                 <span className="text-[10px] font-medium">Chats</span>
              </Button>
              <Button variant="ghost" className="flex flex-col items-center justify-center gap-1 h-full w-full rounded-none hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-400 hover:text-slate-600">
                 <Phone className="h-6 w-6" />
                 <span className="text-[10px] font-medium">Calls</span>
              </Button>
              <Button variant="ghost" className="flex flex-col items-center justify-center gap-1 h-full w-full rounded-none hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-400 hover:text-slate-600">
                 <Users className="h-6 w-6" />
                 <span className="text-[10px] font-medium">People</span>
              </Button>
              <Button variant="ghost" className="flex flex-col items-center justify-center gap-1 h-full w-full rounded-none hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-400 hover:text-slate-600">
                 <Settings className="h-6 w-6" />
                 <span className="text-[10px] font-medium">Settings</span>
              </Button>
           </div>
        )}
      </div>
    </div>
  )
}
