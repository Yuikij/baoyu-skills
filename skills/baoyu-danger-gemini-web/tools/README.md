# Gemini Cookie 工具

这个目录包含两个小工具，用来从浏览器提取 Cookie，并保存给 `baoyu-danger-gemini-web` 使用。

## 目录说明

- `chrome-cookie-uploader-extension/`：Chrome 插件，读取 `google.com` 相关 Cookie 并上传。
- `cookie-json-receiver/`：本地 HTTP 服务，接收上传并保存为 `cookie.json`。

## 快速开始（Windows / PowerShell）

### 1) 启动 Cookie 接收服务

在仓库根目录执行：

```powershell
cd e:\code\baoyu-skills-1\skills\baoyu-danger-gemini-web\tools\cookie-json-receiver
node src\index.js ..\..\scripts\cookie.json
```

如需自定义端口（例如 `3010`）：

```powershell
node src\index.js ..\..\scripts\cookie.json --port 3010
```

说明：
- 服务监听地址：`http://localhost:3000/upload`
- 上面命令会将 Cookie 保存到：`skills/baoyu-danger-gemini-web/scripts/cookie.json`

如果你不传路径：

```powershell
node src\index.js
```

则默认保存到当前目录下的 `cookie.json`。

### 2) 安装 Chrome 插件

1. 打开 `chrome://extensions/`
2. 打开右上角「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择目录：`chrome-cookie-uploader-extension`

### 3) 上传 Cookie

1. 先登录 [Google Gemini](https://gemini.google.com/)
2. 点击插件图标 `Gemini Cookie Uploader`
3. 确认接收地址为：`http://localhost:3000/upload`
4. 点击 `Upload Cookies`
5. 成功后，接收服务终端会打印保存日志

### 4) Cookie 变化自动同步

插件已启用后台监听：当 `google.com` / `.google.com` 下 Cookie 发生变化时，会自动触发同步（带短暂去抖，避免频繁请求）。

注意：
- 自动同步使用你在插件中保存的 `Receiver Server URL`
- 可以在插件弹窗中通过 `Cookie changed -> auto sync` 开关启用/禁用自动同步
- 建议先手动点一次 `Upload Cookies`，确保地址正确后再依赖自动同步

## 与 `baoyu-danger-gemini-web` 联动

在 `scripts/` 目录里可直接验证 Cookie 可用性：

```powershell
cd e:\code\baoyu-skills-1\skills\baoyu-danger-gemini-web\scripts
npx -y bun main.ts --login --cookie-path .\cookie.json
```

如果 `--login` 成功，说明 Cookie 文件已经能被当前 skill 正常读取。

## 常见问题

- 上传时报错 `No cookies found`：请先在 Chrome 中登录 Google/Gemini。
- 插件请求失败：确认接收服务正在运行，且 URL 为 `http://localhost:3000/upload`。
- 想保存到别处：修改 `node src\index.js <输出路径>` 的 `<输出路径>` 即可。

## Linux 后台服务（推荐）

如果你主要在 Linux 上跑，建议用 `systemd --user` 管理，支持开机自启、状态查看、日志追踪。

### 目录

- 服务模板：`cookie-json-receiver/scripts/cookie-json-receiver.service`
- 安装脚本：`cookie-json-receiver/scripts/install-systemd.sh`
- 管理脚本：`cookie-json-receiver/scripts/manage-service.sh`
- 环境变量模板：`cookie-json-receiver/scripts/env.example`

### 安装并后台启动

在 Linux 上执行：

```bash
cd skills/baoyu-danger-gemini-web/tools/cookie-json-receiver
chmod +x scripts/install-systemd.sh scripts/manage-service.sh
./scripts/install-systemd.sh
```

安装脚本会自动：
- 创建用户级服务 `cookie-json-receiver@<你的用户名>.service`
- 复制配置到 `~/.config/cookie-json-receiver/env`
- 启动服务并设置 `enable`

### 常用管理命令

```bash
cd skills/baoyu-danger-gemini-web/tools/cookie-json-receiver
./scripts/manage-service.sh status
./scripts/manage-service.sh restart
./scripts/manage-service.sh logs
./scripts/manage-service.sh stop
```

也可以直接用 `systemctl --user`：

```bash
systemctl --user status cookie-json-receiver@${USER}.service
journalctl --user -u cookie-json-receiver@${USER}.service -f
```

### 环境变量配置

编辑 `~/.config/cookie-json-receiver/env`：

```bash
COOKIE_RECEIVER_HOST=127.0.0.1
COOKIE_RECEIVER_PORT=3000
COOKIE_RECEIVER_MAX_BODY_BYTES=1048576
COOKIE_OUTPUT_PATH=/home/<你的用户名>/.local/share/baoyu-skills/gemini-web/cookie.json
```

也可以临时通过启动参数覆盖：

```bash
node src/index.js --output /home/<你的用户名>/.local/share/baoyu-skills/gemini-web/cookie.json --port 3010 --host 127.0.0.1
```

修改后重启服务：

```bash
systemctl --user restart cookie-json-receiver@${USER}.service
```

### 健康检查

```bash
curl http://127.0.0.1:3000/health
```

如果要让用户级服务在重启后自动拉起（即使未登录图形会话）：

```bash
sudo loginctl enable-linger $USER
```
