const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

// 内存存储文件
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 存储文件和消息
const files = new Map();
const messages = [];
const users = new Map();

// 文件上传处理
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const fileId = uuidv4();
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
  });

  res.json({
    fileId,
    name: req.file.originalname,
    size: req.file.size,
  });
});

// 文件下载处理
app.get("/download/:fileId", (req, res) => {
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

// WebSocket 连接处理
io.on("connection", (socket) => {
  // 生成匿名用户ID
  const userId = `访客#${Math.floor(Math.random() * 10000)}`;
  users.set(socket.id, userId);

  // 发送欢迎消息和历史消息
  socket.emit("welcome", { userId, messages: messages.slice(-50) });
  io.emit("user-list", Array.from(users.values()));

  // 处理新消息
  socket.on("message", (msg) => {
    const message = {
      id: uuidv4(),
      user: users.get(socket.id),
      text: msg,
      timestamp: new Date().toISOString(),
    };
    messages.push(message);
    if (messages.length > 100) messages.shift(); // 保持最新的100条消息
    io.emit("message", message);
  });

  // 处理断开连接
  socket.on("disconnect", () => {
    users.delete(socket.id);
    io.emit("user-list", Array.from(users.values()));
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
