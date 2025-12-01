const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const multer = require("multer");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "DELETE"],
  },
});

app.use(cors());
app.use(express.json());

// 内存存储文件
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 存储文件、消息和用户
const files = new Map();
const messages = [];
const users = new Map(); // key: userId, value: {connections: Set<socket.id>, nickname: string}

// 更新用户昵称
app.post("/api/users/nickname", express.json(), (req, res) => {
  const { userId, nickname } = req.body;

  if (!userId || !nickname) {
    return res.status(400).json({ error: "Missing userId or nickname" });
  }

  const userData = users.get(userId);
  if (!userData) {
    return res.status(404).json({ error: "User not found" });
  }

  userData.nickname = nickname;
  users.set(userId, userData);

  // 更新历史消息中的用户昵称
  messages.forEach((msg) => {
    if (msg.userId === userId) {
      msg.user = nickname;
    }
  });

  // 广播昵称更新
  io.emit("user-updated", { userId, nickname });

  // 广播更新后的用户列表
  const usersList = Array.from(users.entries()).map(([id, data]) => ({
    userId: id,
    nickname: data.nickname,
  }));
  io.emit("user-list", usersList);

  res.json({ userId, nickname, success: true });
});

// 生成随机的用户ID
const generateUserId = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `访客#${timestamp % 10000}-${random}`;
};

// 获取或创建用户ID
const getUserId = (socket) => {
  const existingUserId = socket.handshake.auth.userId;
  if (existingUserId && users.has(existingUserId)) {
    return existingUserId;
  }
  return generateUserId();
};

// 文件上传处理
app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const fileId = crypto.randomUUID();
  files.set(fileId, {
    name: req.file.originalname,
    data: req.file.buffer,
    type: req.file.mimetype,
    size: req.file.size,
  });

  // 广播新文件消息
  io.emit("file-shared", {
    id: fileId,
    name: req.file.originalname,
    size: req.file.size,
    sender: req.body.sender,
    timestamp: new Date().toISOString(),
  });

  res.json({
    fileId,
    name: req.file.originalname,
    size: req.file.size,
  });
});

// 文件下载处理
app.get("/api/download/:fileId", (req, res) => {
  const file = files.get(req.params.fileId);
  if (!file) {
    return res.status(404).json({ error: "File not found" });
  }

  res.setHeader("Content-Type", file.type);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=${encodeURIComponent(file.name)}`
  );
  res.send(file.data);
});

// 文件删除处理
app.delete("/api/upload/:fileId", (req, res) => {
  const file = files.get(req.params.fileId);
  if (!file) {
    return res.status(404).json({ error: "File not found" });
  }

  files.delete(req.params.fileId);
  io.emit("file-deleted", req.params.fileId);
  res.status(200).json({ message: "File deleted" });
});

// WebSocket 连接处理
io.on("connection", (socket) => {
  const userId = getUserId(socket);
  let userData = users.get(userId) || {
    connections: new Set(),
    nickname: `访客${Math.floor(Math.random() * 10000)}`,
  };

  // 更新用户数据
  users.set(userId, userData);
  userData.connections.add(socket.id);

  // 发送欢迎消息和历史消息（确保所有消息都包含userId）
  const messagesWithUserInfo = messages.slice(-50).map((msg) => ({
    ...msg,
    userId: msg.userId || userId,
  }));

  socket.emit("welcome", {
    userId,
    nickname: userData.nickname,
    messages: messagesWithUserInfo,
  });

  // 广播更新用户列表
  const usersList = Array.from(users.entries()).map(([id, data]) => ({
    userId: id,
    nickname: data.nickname,
  }));
  io.emit("user-list", usersList);

  // 处理新消息
  socket.on("message", (msg) => {
    // 检查是否是代码消息
    const codeBlockRegex = /^```(\w*)\n([\s\S]*?)```$/;
    const match = msg.match(codeBlockRegex);

    const message = {
      id: crypto.randomUUID(),
      user: userData.nickname,
      userId: userId,
      text: match ? match[2].trim() : msg,
      timestamp: new Date().toISOString(),
      isCode: !!match,
      language: match ? match[1] || "plaintext" : undefined,
    };
    messages.push(message);
    if (messages.length > 100) messages.shift(); // 保持最新的100条消息
    io.emit("message", message);
  });

  // 处理断开连接
  socket.on("disconnect", () => {
    if (userData) {
      userData.connections.delete(socket.id);
      // 只有当用户的所有连接都断开时才移除用户
      if (userData.connections.size === 0) {
        users.delete(userId);
        // 广播更新后的用户列表
        const usersList = Array.from(users.entries()).map(([id, data]) => ({
          userId: id,
          nickname: data.nickname,
        }));
        io.emit("user-list", usersList);
      }
    }
  });
});

// 获取本地IP地址
const getLocalIP = () => {
  const { networkInterfaces } = require("os");
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost";
};

const PORT = 4000;
const localIP = getLocalIP();

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at:`);
  console.log(`- Local: http://localhost:${PORT}`);
  console.log(`- Network: http://${localIP}:${PORT}`);
});
