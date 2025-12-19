"use client";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Facebook, Mail } from "lucide-react";
import SplitText from "@/components/ui/split-text";
import TextPressure from "@/components/ui/text-pressure";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const validateEmail = (value: string) => {
    if (!value) {
      setEmailError("邮箱不能为空");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError("邮箱格式不正确");
      return false;
    }
    setEmailError("");
    return true;
  };

  const validateUsername = (value: string) => {
    if (!value) {
      setUsernameError("用户名不能为空");
      return false;
    }
    if (value.length < 2 || value.length > 20) {
      setUsernameError("用户名长度需在2-20个字符之间");
      return false;
    }
    setUsernameError("");
    return true;
  };

  const validatePassword = (value: string) => {
    if (!value) {
      setPasswordError("密码不能为空");
      return false;
    }
    if (value.length < 8) {
      setPasswordError("密码至少需要8个字符");
      return false;
    }
    setPasswordError("");
    return true;
  };

  const onSubmit = async () => {
    // Validate all fields
    const isEmailValid = validateEmail(email);
    const isUsernameValid = validateUsername(username);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isUsernameValid || !isPasswordValid) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "注册失败");
        setLoading(false);
        return;
      }
      router.replace("/monitor");
    } catch {
      setError("网络错误");
      setLoading(false);
    }
  };

  return (
    <>
      <div className="h-screen w-full overflow-y-auto bg-background">
        <div className="min-h-full w-full flex items-center justify-center px-6 py-12">
          <div className="grid w-full max-w-6xl grid-cols-1 gap-8 md:grid-cols-2">
        <div className="flex items-center justify-center">
          <Card className="w-full max-w-md border border-[#CFDFE2] shadow-none bg-white relative z-20">
            <CardHeader className="space-y-3">
              <SplitText
                tag="h1"
                text="注册 👋"
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
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) validateEmail(e.target.value);
                  }}
                  onBlur={(e) => validateEmail(e.target.value)}
                />
                {emailError && <p className="text-sm text-red-600">{emailError}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="username" className="text-[#0C1421]">用户名</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="请输入用户名(2-20个字符)"
                  className="h-12 rounded-xl bg-[#F7FBFF] placeholder:text-[#8897AD] border-[#D4D7E3]"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (usernameError) validateUsername(e.target.value);
                  }}
                  onBlur={(e) => validateUsername(e.target.value)}
                />
                {usernameError && <p className="text-sm text-red-600">{usernameError}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#0C1421]">密码</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="请输入密码(至少8个字符)"
                  className="h-12 rounded-xl bg-[#F7FBFF] placeholder:text-[#8897AD] border-[#D4D7E3]"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) validatePassword(e.target.value);
                  }}
                  onBlur={(e) => validatePassword(e.target.value)}
                />
                {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
              </div>
              <TurnstileWidget onVerify={setTurnstileToken} />
              <Button className="w-full h-12 rounded-xl bg-[#162D3A] text-white" onClick={onSubmit} disabled={loading}>
                {loading ? "注册中…" : "注册"}
              </Button>
              {error ? (
                <div className="text-red-600 text-sm">{error}</div>
              ) : null}
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-[#CFDFE2]" />
                <span className="text-[16px] text-[#294957]">或者</span>
                <div className="h-px flex-1 bg-[#CFDFE2]" />
              </div>
              <div className="space-y-4">
                <Button variant="secondary" className="w-full justify-center gap-3 rounded-xl bg-[#F3F9FA] text-[#313957] hover:bg-[#E7F1F2]">
                  <Mail className="h-6 w-6 text-[#4285F4]" />
                  <span className="text-[16px]">使用微信注册</span>
                </Button>
                <Button variant="secondary" className="w-full justify-center gap-3 rounded-xl bg-[#F3F9FA] text-[#313957] hover:bg-[#E7F1F2]">
                  <Facebook className="h-6 w-6 text-[#1877F2]" />
                  <span className="text-[16px]">使用企业微信注册</span>
                </Button>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col items-center gap-2">
              <p className="text-[12px] leading-[1.6] tracking-[0.01em] text-[#122B31] text-center">
                已有账户？ <Link href="/login" className="underline">登录</Link>
              </p>
              <p className="text-[8px] text-[#959CB6]">© 2025 Stravision ALL RIGHTS RESERVED</p>
            </CardFooter>
          </Card>
        </div>
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