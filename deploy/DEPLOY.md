# 部署指南 — drama.297782.xyz

## 1. 本地构建

```bash
cd web

# 启用 AI 剧本（二选一，通过 VITE_AI_PROVIDER 切换）
cat > .env.production <<'EOF'
VITE_AI_PROVIDER=openai
VITE_OPENAI_API_KEY=你的OpenAI密钥
VITE_OPENAI_MODEL=gpt-5.4-mini
EOF

# 或使用 Agnes：
# VITE_AI_PROVIDER=agnes
# VITE_AGNES_API_KEY=你的Agnes密钥

npm ci
npm run build
```

产物在 `dist/` 目录。

## 2. 上传到服务器

```bash
rsync -avz --delete dist/ user@your-server:/var/www/drama/dist/
```

## 3. 启用 Nginx（HTTP）

```bash
sudo mkdir -p /var/www/drama/dist /var/www/certbot
sudo cp deploy/nginx/drama.297782.xyz.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/drama.297782.xyz.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

访问 http://drama.297782.xyz 验证。

### LLM 代理（OpenAI 兼容）

`VITE_AI_PROVIDER=openai` 时，前端请求同源 `/api/openai/v1/chat/completions`，由 Nginx 转发至 `https://llm.onallways.top`（上游无 CORS，必须走代理）。配置见 `deploy/nginx/drama.297782.xyz.conf` 中 `location /api/openai/`；更新后执行 `sudo nginx -t && sudo systemctl reload nginx`。

`VITE_AI_PROVIDER=agnes` 时直连 `apihub.agnes-ai.com`，无需上述代理。

**若 nginx 报 `redirection cycle` /index.html`**，按顺序排查：

```bash
# A. 文件是否存在
ls -la /var/www/drama/dist/index.html

# B. nginx 进程能否读取（root 目录下最常见！）
sudo -u nginx cat /root/workdir/pwa/drama/dist/index.html
# 若 Permission denied → 见下方「权限修复」
```

`/actuator/env` 等是外网扫描器探测，配置里已直接 404。

### 权限修复（dist 放在 /root 下时必做）

nginx 以 `nginx` 用户运行，**读不了 `/root/`**，`ls` 能看到文件也会 try_files 死循环。

**推荐**：迁到 nginx 可读目录

```bash
sudo mkdir -p /var/www/drama
sudo rsync -a /root/workdir/pwa/drama/dist/ /var/www/drama/dist/
# nginx root 改为 /var/www/drama/dist
```

**或**临时放开路径（安全性较差）：

```bash
chmod 755 /root /root/workdir /root/workdir/pwa /root/workdir/pwa/drama /root/workdir/pwa/drama/dist
chmod -R 644 /root/workdir/pwa/drama/dist/*
find /root/workdir/pwa/drama/dist -type d -exec chmod 755 {} \;
```

### SPA 回落写法

不要用 `try_files $uri $uri/ /index.html`（易循环），改用：

```nginx
location / {
    try_files $uri $uri/ @spa;
}
location @spa {
    try_files /index.html =404;
}
```

### SSL 证书域名

`drama.297782.xyz` 应使用自己的证书，不要复用 `sqg.297782.xyz`（浏览器会报证书不匹配）：

```bash
sudo certbot --nginx -d drama.297782.xyz
```

## 4. 后续加 HTTPS（certbot）

站点跑通后再执行，certbot 会自动改 nginx 配置并加上 443：

```bash
sudo apt install certbot python3-certbot-nginx   # Debian/Ubuntu
sudo certbot --nginx -d drama.297782.xyz
```

按提示选「重定向 HTTP → HTTPS」即可。

> PWA「添加到主屏幕」需要 HTTPS，certbot 配好后才完整可用。

## 5. 更新发布

```bash
npm run build
rsync -avz --delete dist/ user@your-server:/var/www/drama/dist/
```

无需 reload nginx。

## 6. PWA 安装按钮不显示？

Chrome 地址栏安装图标需同时满足：

1. **HTTPS 有效** — 证书域名须为 `drama.297782.xyz`（勿复用其他子域证书）
2. **manifest + Service Worker 可访问** — DevTools → Application → Manifest / Service Workers
3. **图标 192 + 512** — 已提供 `pwa-192.png`、`pwa-512.png`
4. **用户互动** — 有时需访问站点 30 秒或第二次访问才出现

自检：

```bash
curl -I https://drama.297782.xyz/manifest.webmanifest
curl -I https://drama.297782.xyz/sw.js
curl -I https://drama.297782.xyz/pwa-192.png
```

Chrome DevTools → **Application → Manifest** 底部看 **「Installability」** 是否有报错。

手动安装：Chrome 菜单 ⋮ → **「安装让我演一集…」** 或 **「保存并分享」→「安装」**。
