"use client"

import { useEffect, useState } from "react"
import { Calendar, Clock, Trash2, Repeat, PlayCircle, Power, MoreVertical, Loader2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"

interface ScheduledTask {
  id: number
  title: string
  cron_expression?: string | null
  execute_at?: number | null
  next_run?: number | null
  action_type: 'relay' | 'led'
  device_id?: number
  params: string
  is_active: number
  created_at: number
}

function Countdown({ targetDate }: { targetDate: number }) {
  const [timeLeft, setTimeLeft] = useState<string>("")

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = targetDate - Date.now()
      
      if (difference <= 0) {
        return "执行中..."
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24)
      const minutes = Math.floor((difference / 1000 / 60) % 60)
      const seconds = Math.floor((difference / 1000) % 60)

      if (days > 0) {
        return `${days}天 ${hours}小时`
      }
      if (hours > 0) {
        return `${hours}小时 ${minutes}分`
      }
      return `${minutes}分 ${seconds}秒`
    }

    setTimeLeft(calculateTimeLeft())
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(timer)
  }, [targetDate])

  return <span className="text-blue-600 font-medium">{timeLeft}</span>
}

export function ScheduledTasksList() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/scheduler/tasks')
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
    // Poll for updates every 30s
    const interval = setInterval(fetchTasks, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/scheduler/tasks?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setTasks(prev => prev.filter(t => t.id !== id))
        toast.success("任务已删除")
      } else {
        throw new Error()
      }
    } catch (e) {
      toast.error("删除失败")
    } finally {
      setDeletingId(null)
    }
  }

  const getDeviceName = (id?: number) => {
    switch(id) {
      case 5: return "灌溉水泵"
      case 6: return "通风风扇"
      case 7: return "补光灯"
      case 8: return "白光灯"
      default: return `设备 ${id}`
    }
  }

  const formatTime = (timestamp?: number | null, cron?: string | null) => {
    if (cron) return `Cron: ${cron}`
    if (!timestamp) return "立即执行"
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-400">
        <Loader2 className="animate-spin mr-2" size={20} />
        <span>加载任务列表...</span>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="my-4 bg-gray-50 dark:bg-white/5 rounded-2xl p-8 border border-gray-100 dark:border-white/10 flex flex-col items-center justify-center text-center">
        <div className="size-12 bg-white dark:bg-white/10 rounded-full shadow-sm flex items-center justify-center mb-3 text-gray-300 dark:text-gray-600">
           <Calendar size={24} />
        </div>
        <h3 className="text-gray-900 dark:text-white font-medium mb-1">暂无定时任务</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">您可以让 AI 帮您设定，例如"每天8点开启水泵"</p>
      </div>
    )
  }

  return (
    <div className="my-6 space-y-3">
      <div className="flex items-center justify-between px-1 mb-2">
         <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2">
           <Clock size={14} className="text-blue-500 dark:text-blue-400" />
           定时任务列表 ({tasks.length})
         </h3>
      </div>
      
      <AnimatePresence mode="popLayout">
        {tasks.map((task) => {
          const params = JSON.parse(task.params)
          const isRelay = task.action_type === 'relay'
          const isOn = isRelay && params.value === 1
          
          return (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="group bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md transition-all overflow-hidden relative"
            >
              <div className={cn(
                "absolute left-0 top-0 bottom-0 w-1",
                task.is_active ? "bg-blue-500 dark:bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
              )} />
              
              <div className="p-4 flex items-center gap-4">
                 {/* Icon */}
                 <div className={cn(
                   "size-10 rounded-full flex items-center justify-center shrink-0",
                   task.is_active ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300" : "bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-gray-500"
                 )}>
                    {task.cron_expression ? <Repeat size={18} /> : <PlayCircle size={18} />}
                 </div>

                 {/* Content */}
                 <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                       <h4 className="font-semibold text-gray-900 dark:text-white truncate pr-2">{task.title}</h4>
                       <span className={cn(
                         "text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide shrink-0",
                         task.is_active ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-300" : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400"
                       )}>
                         {task.is_active ? "Active" : "Done"}
                       </span>
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                       <div className="flex items-center gap-1">
                          <Clock size={12} />
                          <span className="font-mono">
                            {task.is_active ? (
                              (task.next_run || task.execute_at) ? (
                                <>
                                  倒计时: <Countdown targetDate={(task.next_run || task.execute_at)!} />
                                </>
                              ) : (
                                formatTime(task.execute_at, task.cron_expression)
                              )
                            ) : (
                              <span className="text-gray-400 dark:text-gray-600">已完成</span>
                            )}
                          </span>
                       </div>
                       <div className="w-px h-3 bg-gray-200 dark:bg-gray-700" />
                       <div className="flex items-center gap-1">
                          <Power size={12} />
                          <span>
                            {getDeviceName(task.device_id)} 
                            <span className={cn("ml-1 font-medium", isOn ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400")}>
                              {isRelay ? (isOn ? "开启" : "关闭") : "调节颜色"}
                            </span>
                          </span>
                       </div>
                    </div>
                 </div>

                 {/* Actions */}
                 <button 
                   onClick={() => handleDelete(task.id)}
                   disabled={deletingId === task.id}
                   className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                 >
                    {deletingId === task.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                 </button>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
