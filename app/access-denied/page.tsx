import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="size-24 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <ShieldAlert className="size-12 text-red-600 dark:text-red-500" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            访问被拒绝
          </h1>
          <p className="text-muted-foreground">
            Access Denied
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-6 text-left space-y-4 border border-border/50">
          <div className="space-y-1">
            <h3 className="font-semibold text-foreground">为什么会看到这个页面？</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              系统检测到您的 IP 地址存在可疑的访问行为（如频繁请求、恶意扫描或尝试暴力破解），为了保障平台安全，已自动暂时封禁您的访问权限。
            </p>
          </div>
          
          <div className="space-y-1">
            <h3 className="font-semibold text-foreground">如何解除？</h3>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>封禁通常会在 24 小时后自动解除。</li>
              <li>如果您认为这是误判，请联系系统管理员。</li>
            </ul>
          </div>

          <div className="pt-2 text-xs text-muted-foreground font-mono bg-background/50 p-2 rounded border border-border/30">
            Error Code: 403_SUSPICIOUS_ACTIVITY
          </div>
        </div>

        <div className="pt-4">
           <p className="text-xs text-muted-foreground mb-4">
             如果您是管理员，请通过受信任的网络环境访问控制台进行解封。
           </p>
           <Button variant="outline" asChild>
             <Link href="/">返回首页</Link>
           </Button>
        </div>
      </div>
    </div>
  );
}
