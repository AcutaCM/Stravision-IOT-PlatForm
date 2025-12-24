"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Send, UserPlus, Check, X, MessageSquare, User as UserIcon, ChevronLeft, Users, MoreVertical, Shield, ShieldOff, Volume2, VolumeX, Plus, LogOut } from "lucide-react"
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
        toast.success(data.message || "Request sent")
        setAddFriendEmail("")
        setIsAddFriendOpen(false)
        fetchData()
      } else {
        toast.error(data.error || "Failed to send request")
      }
    } catch (error) {
      toast.error("Failed to send request")
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
        toast.success(action === 'accept' ? "Friend accepted" : "Request rejected")
        fetchData()
      }
    } catch (error) {
      console.error("Failed to respond", error)
    }
  }

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error("Group name is required")
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
        toast.success("Group created")
        setNewGroupName("")
        setSelectedFriends([])
        setIsCreateGroupOpen(false)
        fetchData()
      } else {
        toast.error(data.error || "Failed to create group")
      }
    } catch (error) {
      toast.error("Failed to create group")
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
        toast.error(data.error || "Failed to send message")
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
        toast.error(data.error || "Failed to update block status")
      }
    } catch (error) {
      toast.error("Failed to block/unblock user")
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
        toast.error(data.error || "Failed to update mute status")
      }
    } catch (error) {
      toast.error("Failed to update mute status")
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
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] animate-[float_10s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[120px] animate-[float_12s_ease-in-out_infinite_reverse]" />
      </div>

      <div className="relative z-10 grid grid-rows-[72px_1fr] h-full w-full">
        {/* Header */}
        <div className="relative flex items-center px-8 border-b border-border/40 bg-background/60 backdrop-blur-md z-20">
          <div className="flex items-center gap-4">
            <div className="relative size-12 animate-[breathe_4s_ease-in-out_infinite]">
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

        {/* Main Content */}
        <div className="relative p-4 md:p-8 overflow-hidden h-full">
          <div className="flex h-full gap-6 w-full max-w-[1600px] mx-auto">
            
            {/* Sidebar */}
            <Card className={cn(
              "w-full md:w-80 flex flex-col h-full border border-white/10 shadow-2xl bg-white/40 dark:bg-black/40 backdrop-blur-xl transition-all duration-300 rounded-3xl overflow-hidden",
              isMobile && (activeFriend || activeGroup) ? "hidden" : "flex"
            )}>
              <CardHeader className="px-4 py-4 border-b border-white/10 flex flex-row items-center justify-between bg-white/50 dark:bg-black/20">
                <CardTitle className="text-lg font-medium">消息</CardTitle>
                <div className="flex gap-1">
                  <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
                    <DialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/20" title="Create Group">
                        <Users className="h-4 w-4" />
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
                            placeholder="输入群组名称..." 
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

                  <Dialog open={isAddFriendOpen} onOpenChange={setIsAddFriendOpen}>
                    <DialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/20" title="Add Friend">
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>添加好友</DialogTitle>
                      </DialogHeader>
                      <div className="flex gap-2 mt-4">
                        <Input 
                          placeholder="输入邮箱..." 
                          value={addFriendEmail}
                          onChange={(e) => setAddFriendEmail(e.target.value)}
                        />
                        <Button onClick={handleSendRequest}>发送请求</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <Tabs defaultValue="friends" className="flex-1 flex flex-col">
                <div className="px-4 py-2 bg-white/30 dark:bg-black/10">
                  <TabsList className="w-full bg-white/50 dark:bg-black/20">
                    <TabsTrigger value="friends" className="flex-1">好友</TabsTrigger>
                    <TabsTrigger value="groups" className="flex-1">群组</TabsTrigger>
                    <TabsTrigger value="requests" className="flex-1 relative">
                      请求
                      {requests.length > 0 && (
                        <Badge variant="destructive" className="ml-2 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[8px]">
                          {requests.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="friends" className="flex-1 mt-0">
                  <ScrollArea className="h-full">
                    <div className="flex flex-col gap-1 p-2">
                      {friends.map(friend => (
                        <button
                          key={friend.id}
                          onClick={() => switchToFriend(friend)}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 hover:bg-white/40 dark:hover:bg-white/10",
                            activeFriend?.id === friend.id && "bg-primary/10 text-primary dark:bg-primary/20 shadow-sm border-l-4 border-primary pl-2"
                          )}
                        >
                          <Avatar className="border-2 border-white/20">
                            <AvatarImage src={friend.avatar_url || undefined} />
                            <AvatarFallback className={cn(activeFriend?.id === friend.id && "bg-primary text-primary-foreground")}>{friend.username[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 overflow-hidden">
                            <div className="font-medium truncate">{friend.username}</div>
                            <div className="text-xs text-muted-foreground truncate">{friend.email}</div>
                          </div>
                        </button>
                      ))}
                      {friends.length === 0 && (
                        <div className="text-center text-sm text-muted-foreground py-8">
                          暂无好友
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="groups" className="flex-1 mt-0">
                   <ScrollArea className="h-full">
                    <div className="flex flex-col gap-1 p-2">
                      {groups.map(group => (
                        <button
                          key={group.id}
                          onClick={() => switchToGroup(group)}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 hover:bg-white/40 dark:hover:bg-white/10",
                            activeGroup?.id === group.id && "bg-primary/10 text-primary dark:bg-primary/20 shadow-sm border-l-4 border-primary pl-2"
                          )}
                        >
                          <Avatar className="border-2 border-white/20">
                            <AvatarImage src={group.avatar_url || undefined} />
                            <AvatarFallback className={cn("bg-primary/10 text-primary dark:bg-primary/20", activeGroup?.id === group.id && "bg-primary text-primary-foreground")}>
                              {group.name[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 overflow-hidden">
                            <div className="font-medium truncate">{group.name}</div>
                            <div className="text-xs text-muted-foreground truncate">群聊</div>
                          </div>
                        </button>
                      ))}
                      {groups.length === 0 && (
                        <div className="text-center text-sm text-muted-foreground py-8">
                          暂无群组
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="requests" className="flex-1 mt-0">
                  <ScrollArea className="h-full">
                    <div className="flex flex-col gap-2 p-2">
                      {requests.map(req => (
                        <div key={req.id} className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-white/40 dark:bg-black/20">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={req.requester.avatar_url || undefined} />
                              <AvatarFallback>{req.requester.username[0]}</AvatarFallback>
                            </Avatar>
                            <div className="text-sm">
                              <div className="font-medium">{req.requester.username}</div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500 hover:bg-green-500/10" onClick={() => handleRespondRequest(req.id, 'accept')}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:bg-red-500/10" onClick={() => handleRespondRequest(req.id, 'reject')}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {requests.length === 0 && (
                        <div className="text-center text-sm text-muted-foreground py-8">
                          暂无请求
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </Card>

            {/* Chat Area */}
            <Card className={cn(
              "flex-1 flex flex-col border border-white/10 shadow-2xl bg-white/60 dark:bg-black/60 backdrop-blur-xl transition-all duration-300 rounded-3xl overflow-hidden",
              isMobile && (!activeFriend && !activeGroup) ? "hidden" : "flex"
            )}>
              {(activeFriend || activeGroup) ? (
                <>
                  <CardHeader className="px-6 py-4 border-b border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isMobile && (
                          <Button variant="ghost" size="icon" className="-ml-2 h-8 w-8" onClick={() => { setActiveFriend(null); setActiveGroup(null); }}>
                            <ChevronLeft className="h-5 w-5" />
                          </Button>
                        )}
                        <Avatar className="h-10 w-10 border-2 border-white/20 shadow-sm">
                          {activeFriend ? (
                            <>
                              <AvatarImage src={activeFriend.avatar_url || undefined} />
                              <AvatarFallback>{activeFriend.username[0]}</AvatarFallback>
                            </>
                          ) : (
                            <>
                              <AvatarImage src={activeGroup?.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary dark:bg-primary/20">
                                {activeGroup?.name[0]}
                              </AvatarFallback>
                            </>
                          )}
                        </Avatar>
                        <div>
                          <CardTitle className="text-base">
                            {activeFriend ? activeFriend.username : activeGroup?.name}
                          </CardTitle>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            {activeFriend ? (
                              <>
                                <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                                在线
                              </>
                            ) : (
                              <>
                                <Users className="h-3 w-3" />
                                {groupMembers.length} 成员
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="Chat Details"
                          onClick={() => setShowChatDetails(!showChatDetails)}
                          className={cn("transition-colors", showChatDetails && "bg-primary/10 text-primary")}
                        >
                           <MoreVertical className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 p-0 flex flex-col overflow-hidden bg-white/20 dark:bg-black/20">
                    <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
                      <div className="flex flex-col gap-4 min-h-0" ref={scrollRef}>
                         {messages.map((msg) => {
                           const isMe = msg.sender_id === currentUser?.id
                           const getSenderName = (id: number) => {
                             const friend = friends.find(f => f.id === id)
                             if (friend) return friend.username
                             const member = groupMembers.find(m => m.user_id === id)
                             if (member) return member.user.username
                             return `用户 ${id}`
                           }
                           
                           return (
                             <div key={msg.id} className={cn("flex w-full flex-col", isMe ? "items-end" : "items-start")}>
                               {!isMe && activeGroup && (
                                 <span className="text-[10px] text-muted-foreground mb-1 ml-1">
                                   {getSenderName(msg.sender_id)}
                                 </span>
                               )}
                               <div className={cn(
                                 "max-w-[70%] px-4 py-2 rounded-2xl text-sm shadow-sm",
                                 isMe 
                                   ? "bg-blue-600 text-white rounded-tr-sm" 
                                   : "bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 rounded-tl-sm"
                               )}>
                                 {msg.content}
                               </div>
                             </div>
                           )
                         })}
                      </div>
                    </ScrollArea>
                    <div className="p-4 border-t border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-md">
                      <form 
                        onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                        className="flex gap-2"
                      >
                        <Input 
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          placeholder="输入消息..."
                          className="flex-1 bg-white/50 dark:bg-black/50 border-white/10"
                        />
                        <Button type="submit" size="icon" disabled={!inputValue.trim()} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-all duration-300 hover:scale-105 active:scale-95">
                          <Send className="h-4 w-4" />
                        </Button>
                      </form>
                    </div>
                  </CardContent>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                  <div className="h-20 w-20 bg-white/10 dark:bg-white/5 rounded-full flex items-center justify-center mb-4 animate-[pulse_4s_ease-in-out_infinite]">
                    <MessageSquare className="h-10 w-10 text-slate-400" />
                  </div>
                  <p className="text-lg font-medium">选择一个好友或群组开始聊天</p>
                </div>
              )}
            </Card>

            {/* Right Sidebar - Info Panel */}
            <Card className={cn(
              "w-80 flex-col h-full border border-white/10 shadow-2xl bg-white/40 dark:bg-black/40 backdrop-blur-xl transition-all duration-300 rounded-3xl overflow-hidden hidden md:flex",
              showChatDetails ? "w-80 opacity-100 ml-6" : "w-0 opacity-0 border-0 ml-0 p-0"
            )}>
               <CardHeader className="px-6 py-4 border-b border-white/10 bg-white/50 dark:bg-black/20 min-w-[320px]">
                  <CardTitle className="text-base font-medium">详情</CardTitle>
               </CardHeader>
               <ScrollArea className="flex-1 p-4 min-w-[320px]">
                  {activeFriend && (
                    <div className="flex flex-col items-center gap-4 py-8">
                       <Avatar className="h-24 w-24 border-4 border-white/20 shadow-lg">
                          <AvatarImage src={activeFriend.avatar_url || undefined} />
                          <AvatarFallback className="text-2xl">{activeFriend.username[0].toUpperCase()}</AvatarFallback>
                       </Avatar>
                       <div className="text-center">
                          <h3 className="text-xl font-bold">{activeFriend.username}</h3>
                          <p className="text-sm text-muted-foreground">{activeFriend.email}</p>
                       </div>
                       
                       <div className="w-full mt-8 space-y-3">
                          <div className="p-4 rounded-xl bg-white/40 dark:bg-black/20 border border-white/10">
                            <h4 className="text-xs font-medium text-muted-foreground mb-2">操作</h4>
                            <Button variant="ghost" className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 h-10" onClick={() => handleBlockUser(activeFriend.id, true)}>
                              <Shield className="mr-2 h-4 w-4" />
                              拉黑用户
                            </Button>
                          </div>
                       </div>
                    </div>
                  )}

                  {activeGroup && (
                    <div className="space-y-6">
                       <div className="flex flex-col items-center gap-4 py-6">
                          <Avatar className="h-20 w-20 border-4 border-white/20 shadow-lg">
                             <AvatarImage src={activeGroup.avatar_url || undefined} />
                             <AvatarFallback className="text-xl bg-primary/10 text-primary">{activeGroup.name[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="text-center">
                             <h3 className="text-lg font-bold">{activeGroup.name}</h3>
                             <p className="text-sm text-muted-foreground">{groupMembers.length} 成员</p>
                          </div>
                       </div>

                       <div>
                          <h4 className="text-sm font-medium mb-3 px-1">成员列表</h4>
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
                                  <div key={member.user_id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/40 dark:hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                      <Avatar className="h-8 w-8 shrink-0">
                                        <AvatarImage src={member.user.avatar_url || undefined} />
                                        <AvatarFallback>{member.user.username[0]}</AvatarFallback>
                                      </Avatar>
                                      <div className="overflow-hidden">
                                        <div className="text-sm font-medium truncate flex items-center gap-1">
                                          {member.user.username}
                                          {member.role === 'owner' && <Badge variant="secondary" className="h-4 px-1 text-[10px]">群主</Badge>}
                                        </div>
                                      </div>
                                    </div>
                                    {showMuteButton && (
                                       <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className={cn("h-7 w-7", member.is_muted ? "text-red-500" : "text-slate-500")}
                                          onClick={() => handleToggleMute(activeGroup.id, member.user_id, !member.is_muted)}
                                       >
                                          {member.is_muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                                       </Button>
                                    )}
                                  </div>
                                )
                              })}
                          </div>
                       </div>
                       
                       <Button variant="outline" className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 border-red-200 dark:border-red-900/30">
                          <LogOut className="mr-2 h-4 w-4" />
                          退出群组
                       </Button>
                    </div>
                  )}
               </ScrollArea>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
