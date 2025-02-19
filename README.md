# 局域网聊天和文件传输应用

一个基于 React 和 Node.js 的局域网聊天应用，支持实时消息和文件共享功能。

## 功能特点

- 📱 实时聊天功能
- 📁 文件上传和下载
- 👥 在线用户列表
- 🌓 深色模式支持
- 📊 文件上传进度显示
- 🔒 匿名聊天（自动生成用户 ID）
- 💻 响应式设计

## 技术栈

### 前端

- React
- TypeScript
- Material-UI
- Socket.io Client
- Vite

### 后端

- Node.js
- Express
- Socket.io
- Multer（文件处理）

## 快速开始

### 环境要求

- Node.js >= 14.0.0
- npm >= 6.0.0

### 安装和运行

1. 克隆项目到本地：

   ```bash
   git clone [repository-url]
   cd local-group-send
   ```

2. Windows 系统：

   - 双击运行 `start.cmd`

   Linux/Mac 系统：

   ```bash
   chmod +x start.sh
   ./start.sh
   ```

3. 打开浏览器访问：
   - 本地访问：http://localhost:3000
   - 局域网访问：http://[your-ip]:3000

## 使用说明

1. 首次进入可以设置自定义昵称，或使用自动分配的匿名用户 ID
2. 在输入框中输入消息并按回车或点击发送按钮
3. 支持拖拽文件到聊天区域或点击"选择文件"按钮上传文件
4. 在右侧面板可以看到在线用户列表和共享文件列表
5. 图片文件支持预览功能
6. 点击文件旁的下载图标可以下载文件
7. 点击右上角的主题切换按钮可以切换深色/浅色模式
8. 离开页面时会有未读消息通知提醒

## 注意事项

- 消息记录会保存在本地数据库中
- 文件暂时保存在服务器临时目录，定期清理
- 建议在有线网络环境下使用文件传输功能
- 大文件传输可能受限于网络带宽
- 所有服务都在本地运行，不需要互联网连接

## 开发

1. 前端开发：

   ```bash
   cd client
   npm install
   npm run dev
   ```

2. 后端开发：
   ```bash
   cd server
   npm install
   npm run dev
   ```

## 项目结构

```
.
├── client/                 # 前端代码
│   ├── src/
│   │   ├── components/    # React组件
│   │   ├── types/        # TypeScript类型定义
│   │   └── ...
│   └── package.json
├── server/                # 后端代码
│   ├── server.js         # Express服务器
│   └── package.json
├── start.cmd             # Windows启动脚本
└── start.sh             # Unix启动脚本
```

## License

MIT
