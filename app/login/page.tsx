"use client";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Facebook, Building2, QrCode, MessageCircle } from "lucide-react";
import SplitText from "@/components/ui/split-text";
import TextPressure from "@/components/ui/text-pressure";

function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data?.authenticated) router.replace("/monitor");
      } catch {}
    };
    check();
  }, [router]);

  const onSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "登录失败");
        setLoading(false);
        return;
      }
      
      // 登录成功后，手动刷新页面或跳转
      window.location.href = "/monitor";
    } catch (e) {
      console.error("Login error:", e);
      setError("网络错误");
      setLoading(false);
    }
  };

  return (
    <>
      <div className="h-screen w-full overflow-y-auto bg-background">
        <div className="min-h-full w-full flex items-center justify-center px-6 py-12">
          <div className="grid w-full max-w-6xl grid-cols-1 gap-8 md:grid-cols-2">
        {/* Left: Form */}
        <div className="flex items-center justify-center">
          <Card className="w-full max-w-md border border-[#CFDFE2] shadow-none bg-white relative z-20">
            <CardHeader className="space-y-3">
              <SplitText
                tag="h1"
                text="欢迎回来 👋"
                className="text-[24px] leading-[1] tracking-[0.01em] text-[#0C1421] font-thin text-center"
                delay={70}
                duration={1}
                ease="power3.out"
                splitType="chars"
              />
              <div className="space-y-1 text-center">
                <div className="flex items-center justify-center">
                  <TextPressure
                    text="STRAVISION"
                    className="text-[32px] font-thin"
                    textColor="#0C1421"
                    alpha
                    scale={false}
                    stroke={false}
                    minFontSize={32}
                  />
                </div>
                <div className="text-[32px] font-bold text-[#0C1421]">莓界</div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#0C1421]">账户</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="请输入登录邮箱"
                  className="h-12 rounded-xl bg-[#F7FBFF] placeholder:text-[#8897AD] border-[#D4D7E3]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#0C1421]">密码</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="请输入密码"
                  className="h-12 rounded-xl bg-[#F7FBFF] placeholder:text-[#8897AD] border-[#D4D7E3]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <Link href="#" className="text-[12px] text-[#1E4AE9]">忘记密码？</Link>
              </div>
              <Button className="w-full h-12 rounded-xl bg-[#162D3A] text-white" onClick={onSubmit} disabled={loading}>
                {loading ? "登录中…" : "登录"}
              </Button>
              {error ? (
                <div className="text-red-600 text-sm">{error}</div>
              ) : null}
              {/* Or divider */}
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-[#CFDFE2]" />
                <span className="text-[16px] text-[#294957]">或者</span>
                <div className="h-px flex-1 bg-[#CFDFE2]" />
              </div>
              {/* Social buttons */}
              <div className="space-y-4">
                <Button 
                  variant="secondary" 
                  className="w-full justify-center gap-3 rounded-xl bg-[#F3F9FA] text-[#313957] hover:bg-[#E7F1F2]"
                  onClick={() => window.location.href = "/api/auth/wechat/login"}
                >
                  <MessageCircle className="h-6 w-6 text-[#07C160]" />
                  <span className="text-[16px]">微信登录</span>
                </Button>

                <Button variant="secondary" className="w-full justify-center gap-3 rounded-xl bg-[#F3F9FA] text-[#313957] hover:bg-[#E7F1F2]" onClick={() => {
                  window.location.href = "/api/auth/qq/login"
                }}>
                  <svg className="h-6 w-6" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">
                    <path d="M824.8 613.2c-16-51.4-34.4-94.6-62.7-165.3C766.5 262.2 689.3 112 511.5 112 331.7 112 256.2 265.2 261 447.9c-28.4 70.8-46.7 113.7-62.7 165.3-34 109.5-23 154.8-14.6 155.8 18 2.2 70.1-82.4 70.1-82.4 0 49 25.2 112.9 79.8 159-26.4 8.1-85.7 29.9-71.6 53.8 11.4 19.3 196.2 12.3 249.5 6.3 53.3 6 238.1 13 249.5-6.3 14.1-23.8-45.2-45.7-71.6-53.8 54.6-46.2 79.8-110.1 79.8-159 0 0 52.1 84.6 70.1 82.4 8.5-1.1 19.5-46.4-14.5-155.8z" fill="#1296db"></path>
                  </svg>
                  <span className="text-[16px]">QQ登录</span>
                </Button>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col items-center gap-2">
              <p className="text-[12px] leading-[1.6] tracking-[0.01em] text-[#122B31] text-center">
                没有账户？ <Link href="/register" className="underline">注册</Link>
              </p>
              <p className="text-[8px] text-[#959CB6]">© 2025 Stravision ALL RIGHTS RESERVED</p>
            </CardFooter>
          </Card>
        </div>
        {/* Right: Art */}
        <div className="hidden md:block relative w-full h-[500px] md:h-auto overflow-hidden rounded-xl bg-[#111827] z-20">
          <div className="absolute inset-0">
            <div className="absolute right-[-20%] top-[-30%] w-[120%] aspect-square rounded-full bg-[#1F2937]/70" />
            <div className="absolute left-[-25%] bottom-[-40%] w-[90%] aspect-square rounded-full bg-[#1F2937]/60" />
            <div className="absolute left-[6%] top-[12%] w-[96px] h-[96px] rounded-full bg-[#1F2937]/70" />
            <div className="absolute left-[10%] top-[55%] w-[320px] h-[320px] rounded-full bg-[#1F2937]/60" />
            <div className="absolute left-[8%] top-[8%] w-[280px] h-[280px] rounded-full bg-[#1F2937]/50" />
            <div className="absolute left-[20%] top-[68%] w-[520px] h-[520px] rounded-full bg-[#1F2937]/40" />
            <div className="absolute left-[8%] top-[12%] text-white">
              <div className="text-[64px] font-bold">莓界</div>
              <SplitText
                tag="div"
                text="STRAVISION"
                className="text-[42px] leading-none tracking-tight font-semibold"
                delay={70}
                duration={0.6}
                ease="power3.out"
                splitType="chars"
                from={{ opacity: 0, y: -20, css: { filter: "blur(8px)" } }}
                to={{ opacity: 1, y: 0, css: { filter: "blur(0px)" } }}
                textAlign="left"
              />
              <div className="mt-4 text-[20px] max-w-[720px]">AI驱动的物联网草莓种植管理平台</div>
            </div>
            <Image src="/logo.svg" alt="logo" width={512} height={20} className="absolute bottom-2 right-0" />
          </div>
        </div>
      </div>
        </div>
      </div>
    </>
  );
}

export default LoginPage;
