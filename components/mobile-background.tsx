"use client"

export function MobileBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/10 blur-[100px] animate-[float_10s_ease-in-out_infinite]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-500/10 blur-[100px] animate-[float_12s_ease-in-out_infinite_reverse]" />
      <div className="absolute top-[40%] left-[30%] w-[40%] h-[40%] rounded-full bg-cyan-500/5 blur-[80px] animate-[pulse_8s_ease-in-out_infinite]" />
    </div>
  )
}
