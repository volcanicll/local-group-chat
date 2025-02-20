const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const { networkInterfaces } = require("os");

const app = express();
const server = http.createServer(app);

// Helper Functions
const getLocalIP = () => {
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

// CORS 设置
const localIP = getLocalIP();
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    `http://${localIP}:3000`,
  ],
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  credentials: true,
};

// Socket.IO 设置
const io = new Server(server, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ["websocket", "polling"],
  allowEIO3: true,
});

app.use(cors(corsOptions));
app.use(express.json());

// 内存存储
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

const files = new Map();
const messages = [];
const users = new Map();
const peerConnections = new Map();

// Error Handler
const handleError = (error, socket, userId) => {
  console.error("WebRTC Error:", error);
  if (socket && userId) {
    const userData = users.get(userId);
    if (userData) {
      userData.connections.forEach((connectionId) => {
        if (connectionId !== socket.id) {
          io.to(connectionId).emit("webrtc-error", {
            message: "连接错误，请重试",
            error: error.message,
          });
        }
      });
    }
  }
};

// WebRTC Signal Handler
const handleWebRTCSignal = (socket, userId, { to, signal, type }) => {
  try {
    console.log("WebRTC Signal:", {
      from: userId,
      to,
      type,
      signalType: signal?.type,
    });

    const targetUser = users.get(to);
    if (!targetUser) {
      throw new Error(`Target user not found: ${to}`);
    }

    // Track peer connections for offers
    if (signal?.type === "offer") {
      let peers = peerConnections.get(userId) || new Set();
      peers.add(to);
      peerConnections.set(userId, peers);

      peers = peerConnections.get(to) || new Set();
      peers.add(userId);
      peerConnections.set(to, peers);

      // Track active calls
      const userData = users.get(userId);
      userData.activeCalls.add(to);
      targetUser.activeCalls.add(userId);
    }

    // Send signal to all target user connections
    targetUser.connections.forEach((connectionId) => {
      console.log(`Sending signal to connection ${connectionId}:`, {
        type,
        signalType: signal?.type,
      });
      io.to(connectionId).emit("webrtc-signal", {
        from: userId,
        signal,
        type,
      });
    });
  } catch (error) {
    handleError(error, socket, userId);
  }
};

// User Management
const generateUserId = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `访客#${timestamp % 10000}-${random}`;
};

const getUserId = (socket) => {
  const existingUserId = socket.handshake.auth.userId;
  if (existingUserId && users.has(existingUserId)) {
    return existingUserId;
  }
  return generateUserId();
};

// Cleanup function for disconnections
const cleanup = (socket, userId) => {
  console.log("Cleaning up connection:", { socketId: socket.id, userId });
  const userData = users.get(userId);
  if (userData) {
    userData.connections.delete(socket.id);

    if (userData.connections.size === 0) {
      const peers = peerConnections.get(userId);
      if (peers) {
        peers.forEach((peerId) => {
          const peerUser = users.get(peerId);
          if (peerUser) {
            peerUser.activeCalls.delete(userId);
            peerUser.connections.forEach((connId) => {
              io.to(connId).emit("peer-disconnected", userId);
            });
          }
          const peerPeers = peerConnections.get(peerId);
          if (peerPeers) {
            peerPeers.delete(userId);
            if (peerPeers.size === 0) {
              peerConnections.delete(peerId);
            }
          }
        });
        peerConnections.delete(userId);
      }

      users.delete(userId);
      broadcastUserList();
    }
  }
};

// Broadcast user list
const broadcastUserList = () => {
  const usersList = Array.from(users.entries()).map(([id, data]) => ({
    userId: id,
    nickname: data.nickname,
    isInCall: data.activeCalls.size > 0,
  }));
  io.emit("user-list", usersList);
};

// API Routes
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

  messages.forEach((msg) => {
    if (msg.userId === userId) {
      msg.user = nickname;
    }
  });

  io.emit("user-updated", { userId, nickname });
  broadcastUserList();

  res.json({ userId, nickname, success: true });
});

// File Routes
app.post("/api/upload", upload.single("file"), (req, res) => {
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

app.delete("/api/upload/:fileId", (req, res) => {
  const file = files.get(req.params.fileId);
  if (!file) {
    return res.status(404).json({ error: "File not found" });
  }

  files.delete(req.params.fileId);
  io.emit("file-deleted", req.params.fileId);
  res.status(200).json({ message: "File deleted" });
});

// Socket.IO Connection Handler
io.on("connection", (socket) => {
  console.log("New connection:", socket.id);
  const userId = getUserId(socket);
  let userData = users.get(userId) || {
    connections: new Set(),
    nickname: `访客${Math.floor(Math.random() * 10000)}`,
    activeCalls: new Set(),
  };

  users.set(userId, userData);
  userData.connections.add(socket.id);

  socket.emit("welcome", {
    userId,
    nickname: userData.nickname,
    messages: messages.slice(-50).map((msg) => ({
      ...msg,
      userId: msg.userId || userId,
    })),
  });

  broadcastUserList();

  socket.on("message", (msg) => {
    const codeBlockRegex = /^```(\w*)\n([\s\S]*?)```$/;
    const match = msg.match(codeBlockRegex);

    const message = {
      id: uuidv4(),
      user: userData.nickname,
      userId: userId,
      text: match ? match[2].trim() : msg,
      timestamp: new Date().toISOString(),
      isCode: !!match,
      language: match ? match[1] || "plaintext" : undefined,
    };
    messages.push(message);
    if (messages.length > 100) messages.shift();
    io.emit("message", message);
  });

  socket.on("webrtc-signal", (data) =>
    handleWebRTCSignal(socket, userId, data)
  );
  socket.on("disconnect", () => cleanup(socket, userId));
  socket.on("error", (error) => {
    console.error("Socket error:", error);
    cleanup(socket, userId);
  });
});

// Server Start
const PORT = 4000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at:`);
  console.log(`- Local: http://localhost:${PORT}`);
  console.log(`- Network: http://${localIP}:${PORT}`);
});
