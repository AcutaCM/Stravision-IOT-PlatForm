import { createUser, getUserByEmail } from "@/lib/db/user-service";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, username, secret } = body;

    // 安全检查：验证密钥
    // 如果环境变量中没有设置 ADMIN_SETUP_SECRET，则使用默认的紧急密钥
    // 建议在创建完管理员后，删除此文件或设置复杂的环境变量
    const expectedSecret = process.env.ADMIN_SETUP_SECRET || "Stravision2025Setup!";

    if (secret !== expectedSecret) {
      return NextResponse.json({ error: "Invalid setup secret" }, { status: 403 });
    }

    if (!email || !password || !username) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 检查用户是否已存在
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json({ error: `User ${email} already exists` }, { status: 409 });
    }

    // 创建超级管理员
    const user = await createUser({
      email,
      password,
      username,
      role: 'super_admin',
      permissions: {
        allowedControls: ['*']
      }
    });

    return NextResponse.json({ 
        success: true, 
        message: "Super admin created successfully",
        user: {
            id: user.id,
            email: user.email,
            role: user.role
        }
    });

  } catch (error: any) {
    console.error("Setup admin failed:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
