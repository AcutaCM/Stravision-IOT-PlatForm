"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Send, UserPlus, Check, X, MessageSquare, User as UserIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface User {
  id: number
  username: string
  email: string
  avatar_url: string | null
}

interface FriendRequest {
  id: number
  requester: User
  status: string
  created_at: number
}

interface Message {
  id: number
  sender_id: number
  receiver_id: number
  content: string
  created_at: number
  type: 'text' | 'image' | 'file'
}

export default function ChatPage() {
  const [friends, setFriends] = useState<User[]>([])
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [activeFriend, setActiveFriend] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [addFriendEmail, setAddFriendEmail] = useState("")
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)

  // Fetch current user
  useEffect(() => {
    fetch('/api/auth/me').then(res => res.json()).then(data => {
      if (data.user) setCurrentUserId(data.user.id)
    })
  }, [])

  // Fetch friends and requests
  const fetchData = async () => {
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        fetch('/api/friends'),
        fetch('/api/friends/requests')
      ])
      
      const friendsData = await friendsRes.json()
      const requestsData = await requestsRes.json()

      if (friendsData.friends) setFriends(friendsData.friends)
      if (requestsData.requests) setRequests(requestsData.requests)
    } catch (error) {
      console.error("Failed to fetch data", error)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000) // Poll every 10s
    return () => clearInterval(interval)
  }, [])

  // Fetch messages when active friend changes
  useEffect(() => {
    if (!activeFriend) return

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/direct-messages?friendId=${activeFriend.id}`)
        const data = await res.json()
        if (data.messages) setMessages(data.messages)
      } catch (error) {
        console.error("Failed to fetch messages", error)
      }
    }

    fetchMessages()
    const interval = setInterval(fetchMessages, 3000) // Poll messages every 3s
    return () => clearInterval(interval)
  }, [activeFriend])

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

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !activeFriend) return

    try {
      const res = await fetch('/api/direct-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          friendId: activeFriend.id,
          content: inputValue
        })
      })
      const data = await res.json()
      
      if (res.ok) {
        setMessages([...messages, data.message])
        setInputValue("")
      }
    } catch (error) {
      console.error("Failed to send message", error)
    }
  }

  return (
    <div className="flex h-[calc(100vh-80px)] w-full gap-4 p-4 md:p-6 bg-slate-50 dark:bg-black/20">
      {/* Sidebar */}
      <Card className="w-80 flex flex-col h-full border-none shadow-md bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl">
        <CardHeader className="px-4 py-3 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-medium">Chat</CardTitle>
          <Dialog open={isAddFriendOpen} onOpenChange={setIsAddFriendOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <UserPlus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Friend</DialogTitle>
              </DialogHeader>
              <div className="flex gap-2 mt-4">
                <Input 
                  placeholder="Enter email..." 
                  value={addFriendEmail}
                  onChange={(e) => setAddFriendEmail(e.target.value)}
                />
                <Button onClick={handleSendRequest}>Add</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <Tabs defaultValue="friends" className="flex-1 flex flex-col">
          <div className="px-4 py-2">
            <TabsList className="w-full">
              <TabsTrigger value="friends" className="flex-1">Friends</TabsTrigger>
              <TabsTrigger value="requests" className="flex-1 relative">
                Requests
                {requests.length > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                    {requests.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="friends" className="flex-1 mt-0">
            <ScrollArea className="h-[calc(100vh-220px)]">
              <div className="flex flex-col gap-1 p-2">
                {friends.map(friend => (
                  <button
                    key={friend.id}
                    onClick={() => setActiveFriend(friend)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:bg-slate-100 dark:hover:bg-zinc-800",
                      activeFriend?.id === friend.id && "bg-slate-100 dark:bg-zinc-800"
                    )}
                  >
                    <Avatar>
                      <AvatarImage src={friend.avatar_url || undefined} />
                      <AvatarFallback>{friend.username[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <div className="font-medium truncate">{friend.username}</div>
                      <div className="text-xs text-muted-foreground truncate">{friend.email}</div>
                    </div>
                  </button>
                ))}
                {friends.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    No friends yet
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="requests" className="flex-1 mt-0">
            <ScrollArea className="h-[calc(100vh-220px)]">
              <div className="flex flex-col gap-2 p-2">
                {requests.map(req => (
                  <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border bg-white dark:bg-zinc-900">
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
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500" onClick={() => handleRespondRequest(req.id, 'accept')}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => handleRespondRequest(req.id, 'reject')}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {requests.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    No pending requests
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col border-none shadow-md bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl">
        {activeFriend ? (
          <>
            <CardHeader className="px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={activeFriend.avatar_url || undefined} />
                  <AvatarFallback>{activeFriend.username[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base">{activeFriend.username}</CardTitle>
                  <div className="text-xs text-muted-foreground">{activeFriend.email}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
              <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
                <div className="flex flex-col gap-4 min-h-0" ref={scrollRef}>
                   {messages.map((msg) => {
                     const isMe = msg.sender_id === currentUserId
                     return (
                       <div key={msg.id} className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                         <div className={cn(
                           "max-w-[70%] px-4 py-2 rounded-2xl text-sm",
                           isMe 
                             ? "bg-blue-600 text-white rounded-tr-sm" 
                             : "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-slate-100 rounded-tl-sm"
                         )}>
                           {msg.content}
                         </div>
                       </div>
                     )
                   })}
                </div>
              </ScrollArea>
              <div className="p-4 border-t mt-auto">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                  className="flex gap-2"
                >
                  <Input 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" disabled={!inputValue.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </CardContent>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <div className="h-16 w-16 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="h-8 w-8 text-slate-400" />
            </div>
            <p>Select a friend to start chatting</p>
          </div>
        )}
      </Card>
    </div>
  )
}
