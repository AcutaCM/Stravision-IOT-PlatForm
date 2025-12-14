# Cloudflare 部署指南 (推荐方案)

针对 Cloudflare 521 错误（宿主机拒绝连接），我们需要配置 Nginx 监听 443 端口并使用 Cloudflare 的源服务器证书。

## 1. Cloudflare 后台设置

1.  **生成证书**：
    *   进入 Cloudflare 后台 -> 你的域名 -> **SSL/TLS** -> **Origin Server**。
    *   点击 **Create Certificate**。
    *   保留默认设置（RSA 2048，有效期 15 年），点击 **Create**。
    *   你将看到 `Origin Certificate` 和 `Private Key` 两段文本。

2.  **设置加密模式**：
    *   进入 **SSL/TLS** -> **Overview**。
    *   将加密模式设置为 **Full (Strict)**。

## 2. 服务器设置

1.  **运行配置脚本**：
    我们在项目里准备了一个脚本，方便你粘贴证书。
    
    ```bash
    chmod +x setup-cloudflare-certs.sh
    ./setup-cloudflare-certs.sh
    ```
    
    *   按照提示粘贴 Cloudflare 生成的 `Origin Certificate` 内容。
    *   按照提示粘贴 Cloudflare 生成的 `Private Key` 内容。

2.  **启动服务**：

    ```bash
    docker-compose down
    docker-compose up -d
    ```

## 3. 验证

*   等待几秒钟。
*   访问 `https://stravision.cheesestrawberry.top`。
*   你应该能看到网站正常加载，且浏览器地址栏有一把锁。

## 常见问题

*   **521 Error**: 说明 Nginx 没有运行，或者没有监听 443 端口。请检查 `docker-compose logs nginx`。
*   **522 Error**: 说明防火墙拦截了 Cloudflare 的 IP。请确保服务器防火墙放行了 80 和 443 端口。
    *   `ufw allow 80`
    *   `ufw allow 443`
