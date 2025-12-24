"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Send, UserPlus, Check, X, MessageSquare, User as UserIcon, ChevronLeft, Users, MoreVertical, Shield, ShieldOff, Volume2, VolumeX, Plus, LogOut, Edit, Search, Phone, Video, MapPin, Image as ImageIcon, Smile, Mic, Paperclip } from "lucide-react"
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
  receiver_id: number
  group_id?: number
  content: string
  created_at: number
  type: 'text' | 'image' | 'file'
}

export default function ChatPage() {
  const [friends, setFriends] = useState<User[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [requests, setRequests] = useState<FriendRequest[]>([])
  
  const [activeFriend, setActiveFriend] = useState<User | null>(null)
  const [activeGroup, setActiveGroup] = useState<Group | null>(null)
  
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [addFriendEmail, setAddFriendEmail] = useState("")
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false)
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false)
  const [showChatDetails, setShowChatDetails] = useState(false)
  
  // Group creation state
  const [newGroupName, setNewGroupName] = useState("")
  const [selectedFriends, setSelectedFriends] = useState<number[]>([])

  // Group info state
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([])

  const scrollRef = useRef<HTMLDivElement>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isMobile, setIsMobile] = useState(false)

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

  // Fetch friends, requests, and groups
  const fetchData = async () => {
    try {
      const [friendsRes, requestsRes, groupsRes] = await Promise.all([
        fetch('/api/friends'),
        fetch('/api/friends/requests'),
        fetch('/api/groups')
      ])
      
      const friendsData = await friendsRes.json()
      const requestsData = await requestsRes.json()
      const groupsData = await groupsRes.json()

      if (friendsData.friends) setFriends(friendsData.friends)
      if (requestsData.requests) setRequests(requestsData.requests)
      if (groupsData.groups) setGroups(groupsData.groups)
    } catch (error) {
      console.error("Failed to fetch data", error)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000) // Poll every 10s
    return () => clearInterval(interval)
  }, [])

  // Fetch messages when active chat changes
  useEffect(() => {
    if (!activeFriend && !activeGroup) return

    const fetchMessages = async () => {
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
    }

    fetchMessages()
    const interval = setInterval(fetchMessages, 3000) // Poll messages every 3s
    return () => clearInterval(interval)
  }, [activeFriend, activeGroup])

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

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
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

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return
    if (!activeFriend && !activeGroup) return

    try {
      let url = ''
      let body = {}

      if (activeFriend) {
        url = '/api/direct-messages'
        body = { friendId: activeFriend.id, content: inputValue }
      } else if (activeGroup) {
        url = '/api/groups/messages'
        body = { groupId: activeGroup.id, content: inputValue }
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      
      if (res.ok) {
        setMessages([...messages, data.message])
        setInputValue("")
      } else {
        toast.error(data.error || "发送消息失败")
      }
    } catch (error) {
      console.error("Failed to send message", error)
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

      <div className="relative z-10 grid grid-rows-[72px_1fr] h-full w-full">
        {/* Header - Kept global header but made it white/clean */}
        <div className="relative flex items-center px-8 border-b border-border/10 bg-background z-20">
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

        {/* Main Content - 3 Column Layout Simulation */}
        <div className="relative p-0 h-full overflow-hidden bg-background">
          <div className="flex h-full w-full max-w-[1600px] mx-auto">
            
            {/* Middle Column: Message List */}
            <div className={cn(
              "w-full md:w-[400px] flex flex-col h-full border-r border-border/10 bg-background",
              isMobile && (activeFriend || activeGroup) ? "hidden" : "flex"
            )}>
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
                        <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
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
                    <Input placeholder="搜索" className="pl-9 bg-slate-100 dark:bg-slate-800 border-none rounded-full" />
                </div>
              </div>

              <ScrollArea className="flex-1 px-4">
                <div className="space-y-6 pb-4">
                    {/* Pinned Section (Using Groups as Pinned for now) */}
                    {groups.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">
                                <MapPin className="h-3 w-3" /> 置顶消息
                            </div>
                            <div className="space-y-1">
                                {groups.map(group => (
                                    <button
                                        key={group.id}
                                        onClick={() => switchToGroup(group)}
                                        className={cn(
                                            "w-full flex items-center gap-4 p-3 rounded-2xl text-left transition-all duration-200",
                                            activeGroup?.id === group.id ? "bg-slate-100 dark:bg-slate-800" : "hover:bg-slate-50 dark:hover:bg-slate-900"
                                        )}
                                    >
                                        <div className="relative">
                                            <Avatar className="h-12 w-12 border border-slate-100 dark:border-slate-800">
                                                <AvatarImage src={group.avatar_url || undefined} />
                                                <AvatarFallback className="bg-orange-100 text-orange-600 font-bold">
                                                    {group.name[0].toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            {/* Online Indicator simulation */}
                                            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white dark:border-black"></span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline mb-1">
                                                <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{group.name}</span>
                                                <span className="text-xs text-slate-400">12:30 PM</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-slate-500 truncate block max-w-[180px]">
                                                    点击查看群组消息...
                                                </span>
                                                {/* Unread Badge Simulation */}
                                                <Badge variant="destructive" className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">2</Badge>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Friend Requests Section */}
                    {requests.length > 0 && (
                        <div className="space-y-2 mb-6">
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">
                                <UserPlus className="h-3 w-3" /> 好友请求
                            </div>
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
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">
                            <MessageSquare className="h-3 w-3" /> 全部消息
                        </div>
                        <div className="space-y-1">
                            {friends.map(friend => (
                                <button
                                    key={friend.id}
                                    onClick={() => switchToFriend(friend)}
                                    className={cn(
                                        "w-full flex items-center gap-4 p-3 rounded-2xl text-left transition-all duration-200",
                                        activeFriend?.id === friend.id ? "bg-slate-100 dark:bg-slate-800" : "hover:bg-slate-50 dark:hover:bg-slate-900"
                                    )}
                                >
                                    <div className="relative">
                                        <Avatar className="h-12 w-12 border border-slate-100 dark:border-slate-800">
                                            <AvatarImage src={friend.avatar_url || undefined} />
                                            <AvatarFallback className="bg-blue-100 text-blue-600 font-bold">
                                                {friend.username[0].toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white dark:border-black"></span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{friend.username}</span>
                                            <span className="text-xs text-slate-400">刚刚</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-500 truncate block max-w-[180px]">
                                                {friend.email}
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                            {friends.length === 0 && (
                                <div className="text-center text-sm text-muted-foreground py-8">
                                    暂无好友
                                </div>
                            )}
                        </div>
                    </div>
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
                  <div className="px-6 py-4 border-b border-border/10 flex items-center justify-between bg-background sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                      {isMobile && (
                        <Button variant="ghost" size="icon" className="-ml-2 h-8 w-8" onClick={() => { setActiveFriend(null); setActiveGroup(null); }}>
                          <ChevronLeft className="h-5 w-5" />
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
                        <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          {activeFriend ? activeFriend.username : activeGroup?.name}
                        </div>
                        <div className="text-xs text-green-500 font-medium">
                          {activeFriend ? '正在输入...' : `${groupMembers.length} 成员`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-slate-400">
                       <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                          <Video className="h-5 w-5" />
                       </Button>
                       <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                          <Phone className="h-5 w-5" />
                       </Button>
                       <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setShowChatDetails(!showChatDetails)}>
                          <MoreVertical className="h-5 w-5" />
                       </Button>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col overflow-hidden relative">
                    <ScrollArea className="flex-1 p-6" ref={scrollRef as any}>
                      <div className="flex justify-center mb-6">
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs px-4 py-1 rounded-full font-medium">
                              今天 12月24日
                          </span>
                      </div>
                      <div className="flex flex-col gap-6 min-h-0" ref={scrollRef}>
                         {messages.map((msg) => {
                           const isMe = msg.sender_id === currentUser?.id
                           const sender = isMe ? currentUser : (activeFriend || groupMembers.find(m => m.user_id === msg.sender_id)?.user)
                           
                           return (
                             <div key={msg.id} className={cn("flex w-full gap-4", isMe ? "flex-row-reverse" : "flex-row")}>
                               <Avatar className="h-10 w-10 mt-1 flex-shrink-0">
                                  <AvatarImage src={sender?.avatar_url || undefined} />
                                  <AvatarFallback>{sender?.username?.[0]}</AvatarFallback>
                               </Avatar>
                               <div className={cn("flex flex-col max-w-[65%]", isMe ? "items-end" : "items-start")}>
                                 <div className={cn(
                                   "px-5 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm",
                                   isMe 
                                     ? "bg-blue-600 text-white rounded-tr-sm" 
                                     : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-sm"
                                 )}>
                                   {msg.content}
                                 </div>
                                 <span className="text-[11px] text-slate-400 mt-1 font-medium">
                                     05:00 PM
                                 </span>
                               </div>
                             </div>
                           )
                         })}
                      </div>
                    </ScrollArea>
                    
                    <div className="p-6 bg-background sticky bottom-0 z-10">
                      <form 
                        onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                        className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-2 rounded-full shadow-sm"
                      >
                        <Button type="button" size="icon" variant="ghost" className="h-10 w-10 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/50">
                            <Mic className="h-5 w-5" />
                        </Button>
                        <Input 
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          placeholder="输入消息..."
                          className="flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 text-base"
                        />
                         <Button type="button" size="icon" variant="ghost" className="h-10 w-10 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/50">
                            <ImageIcon className="h-5 w-5" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" className="h-10 w-10 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/50">
                            <Smile className="h-5 w-5" />
                        </Button>
                        <Button type="submit" size="icon" disabled={!inputValue.trim()} className="h-10 w-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all duration-300 hover:scale-105 active:scale-95 ml-1">
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
      </div>
    </div>
  )
}
