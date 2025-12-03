"use client"

import { useState, useEffect } from "react"
import { CalendarClock, CheckCircle2, XCircle, Loader2, ArrowRight, Timer, X } from "lucide-react"
import { toast } from "sonner"

interface ScheduleData {
  title: string
  cron?: string
  execute_at?: number
  delay_seconds?: number
  task_action: string
  device: number
  value: number
  params?: any
}

function CountdownToast({ id, targetTime, title }: { id: string | number, targetTime: number, title: string }) {
  const [remaining, setRemaining] = useState(Math.max(0, Math.ceil((targetTime - Date.now()) / 1000)))
  const totalDuration = useState(remaining)[0] // Store initial duration for progress bar

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.ceil((targetTime - Date.now()) / 1000)
      if (diff <= 0) {
        setRemaining(0)
        clearInterval(interval)
        toast.dismiss(id)
        toast.success("任务已执行", { description: title })
      } else {
        setRemaining(diff)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [targetTime, id, title])

  const progress = Math.max(0, Math.min(100, (remaining / totalDuration) * 100))

  return (
    <div className="w-[356px] bg-white rounded-xl shadow-lg border border-gray-200 p-4 flex flex-col gap-3 pointer-events-auto relative overflow-hidden">
      <div className="flex items-start justify-between gap-2 relative z-10">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 animate-pulse">
            <Timer size={18} />
          </div>
          <div>
            <div className="font-semibold text-gray-900">任务倒计时</div>
            <div className="text-xs text-gray-500 max-w-[200px] truncate">{title}</div>
          </div>
        </div>
        <div className="text-xl font-bold text-blue-600 font-mono w-12 text-right">{remaining}s</div>
      </div>
      
      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden relative z-10">
        <div 
          className="h-full bg-blue-500 transition-all duration-1000 ease-linear" 
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Close Button */}
      <button 
        onClick={() => toast.dismiss(id)} 
        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors z-20"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function ScheduleCard({ data }: { data: ScheduleData }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleConfirm = async () => {
    setStatus('loading')
    try {
      // Calculate final execution time
      let finalExecuteAt = data.execute_at
      
      if (data.delay_seconds) {
        finalExecuteAt = Date.now() + (data.delay_seconds * 1000)
      }

      const getParams = () => {
        if (data.params && Object.keys(data.params).length > 0) return data.params
        
        if (data.task_action === 'toggle_relay') {
          return { value: data.value }
        }
        
        if (data.task_action === 'set_led') {
          const d = data as any
          return { 
            r: d.r ?? 0,
            g: d.g ?? 0,
            b: d.b ?? 0,
            w: d.w ?? 0
          }
        }
        return {}
      }

      const res = await fetch('/api/scheduler/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          cron_expression: data.cron,
          execute_at: finalExecuteAt,
          action_type: data.task_action === 'toggle_relay' ? 'relay' : 'led',
          device_id: data.device,
          params: getParams()
        })
      })
      
      if (!res.ok) throw new Error("Failed to create task")
      
      setStatus('success')
      
      // Check if it's a short-term one-time task (e.g., within 5 minutes)
      if (finalExecuteAt && !data.cron) {
        const delay = finalExecuteAt - Date.now()
        // Show countdown for tasks within 5 minutes (300000ms)
        if (delay > 0 && delay <= 300000) {
           toast.custom((id) => (
             <CountdownToast id={id} targetTime={finalExecuteAt!} title={data.title} />
           ), { duration: Infinity }) // Keep open until manually closed or timer ends
        } else {
           toast.success("定时任务已创建")
        }
      } else {
        toast.success("定时任务已创建")
      }
      
    } catch (e) {
      setStatus('error')
      toast.error("创建失败")
    }
  }

  if (status === 'success') {
    return (
      <div className="my-4 p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3">
        <div className="size-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
           <CheckCircle2 size={20} />
        </div>
        <div>
           <div className="font-semibold text-green-900">任务已设定</div>
           <div className="text-xs text-green-700">{data.title}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="my-4 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
       <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-blue-100 flex items-center gap-2">
          <CalendarClock size={18} className="text-blue-600" />
          <span className="font-semibold text-blue-900 text-sm">建议定时任务</span>
       </div>
       
       <div className="p-4 space-y-3">
          <div>
             <div className="text-lg font-bold text-gray-900">{data.title}</div>
             <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">
                   {data.cron 
                     ? `Cron: ${data.cron}` 
                     : data.delay_seconds 
                       ? `${data.delay_seconds}s Later` 
                       : `Time: ${new Date(data.execute_at!).toLocaleString()}`
                   }
                </span>
                <ArrowRight size={14} />
                <span className="text-gray-700 font-medium">
                   {data.task_action === 'toggle_relay' ? `设备 ${data.device} -> ${data.value ? '开' : '关'}` : '调节灯光'}
                </span>
             </div>
          </div>
          
          <button 
            onClick={handleConfirm}
            disabled={status === 'loading'}
            className="w-full flex items-center justify-center gap-2 bg-black text-white py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-all active:scale-[0.98] font-medium text-sm"
          >
             {status === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
             确认创建任务
          </button>
       </div>
    </div>
  )
}
