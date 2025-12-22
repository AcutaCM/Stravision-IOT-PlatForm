import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function TooManyRequestsPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-primary">
          429
        </h1>
        <h2 className="text-2xl font-semibold tracking-tight">
          请求过于频繁 (Too Many Requests)
        </h2>
        <p className="text-muted-foreground max-w-[500px]">
          我们检测到您的请求过于频繁。为了系统的稳定，请稍作休息后再试。
          <br />
          Please wait a moment before trying again.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Button asChild variant="outline">
            <Link href="/">返回首页 (Go Home)</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
