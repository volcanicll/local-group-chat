import { io, Socket } from "socket.io-client";
import { FileMessage, Message, WelcomeResponse, UserInfo } from "./types";

interface WebRTCSignal {
  to: string;
  from: string;
  signal: any;
  type: "file" | "video";
}

class SocketService {
  private socket: Socket | null = null;
  private messageHandlers: ((message: Message) => void)[] = [];
  private fileHandlers: ((file: FileMessage) => void)[] = [];
  private fileDeleteHandlers: ((fileId: string) => void)[] = [];
  private userListHandlers: ((users: UserInfo[]) => void)[] = [];
  private userUpdateHandlers: ((data: {
    userId: string;
    nickname: string;
  }) => void)[] = [];
  private webRTCSignalHandlers: ((signal: WebRTCSignal) => void)[] = [];
  private webRTCErrorHandlers: ((error: {
    message: string;
    error: string;
  }) => void)[] = [];
  private userId: string | null = null;

  connect(): Promise<string> {
    return new Promise((resolve, reject) => {
      const savedUserId = localStorage.getItem("userId");

      this.socket = io("/", {
        auth: {
          userId: savedUserId,
        },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      });

      // 重新连接时发出事件
      this.socket.on("reconnect", () => {
        if (this.socket) {
          this.socket.emit("reconnected");
        }
      });

      this.socket.on("connect", () => {
        console.log("Connected to server with socket id:", this.socket?.id);
      });

      this.socket.on("disconnect", (reason) => {
        console.log("Disconnected from server:", reason);
      });

      this.socket.on("reconnect", (attemptNumber) => {
        console.log("Reconnected to server after", attemptNumber, "attempts");
      });

      this.socket.on("reconnect_error", (error) => {
        console.error("Reconnection error:", error);
      });

      this.socket.on(
        "welcome",
        ({ userId, nickname, messages }: WelcomeResponse) => {
          console.log("Received welcome message:", { userId, nickname });
          this.userId = userId;
          localStorage.setItem("userId", userId);
          localStorage.setItem("nickname", nickname);
          messages.forEach((msg) => {
            this.messageHandlers.forEach((handler) => handler(msg));
          });
          resolve(userId);
        }
      );

      this.socket.on("user-updated", ({ userId, nickname }) => {
        console.log("User updated:", { userId, nickname });
        if (userId === this.userId) {
          localStorage.setItem("nickname", nickname);
        }
        this.userUpdateHandlers.forEach((handler) =>
          handler({ userId, nickname })
        );
      });

      this.socket.on("message", (message: Message) => {
        this.messageHandlers.forEach((handler) => handler(message));
      });

      this.socket.on("file-shared", (file: FileMessage) => {
        const fileWithTimestamp = {
          ...file,
          timestamp: new Date().toISOString(),
        };
        console.log("File shared:", fileWithTimestamp);
        this.fileHandlers.forEach((handler) => handler(fileWithTimestamp));
      });

      this.socket.on("file-deleted", (fileId: string) => {
        console.log("File deleted:", fileId);
        this.fileDeleteHandlers.forEach((handler) => handler(fileId));
      });

      this.socket.on("user-list", (users: UserInfo[]) => {
        console.log("Received user list:", users);
        this.userListHandlers.forEach((handler) => handler(users));
      });

      this.socket.on("webrtc-signal", (signal: WebRTCSignal) => {
        console.log("Received WebRTC signal:", {
          from: signal.from,
          to: signal.to,
          type: signal.type,
          signalType: signal.signal?.type,
        });
        this.webRTCSignalHandlers.forEach((handler) => handler(signal));
      });

      this.socket.on("connect_error", (error) => {
        console.error("Connection error:", error);
        reject(error);
      });
    });
  }

  sendMessage(text: string) {
    if (this.socket) {
      this.socket.emit("message", text);
    }
  }

  onMessage(handler: (message: Message) => void) {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
    };
  }

  onFileShared(handler: (file: FileMessage) => void) {
    this.fileHandlers.push(handler);
    return () => {
      this.fileHandlers = this.fileHandlers.filter((h) => h !== handler);
    };
  }

  onFileDeleted(handler: (fileId: string) => void) {
    this.fileDeleteHandlers.push(handler);
    return () => {
      this.fileDeleteHandlers = this.fileDeleteHandlers.filter(
        (h) => h !== handler
      );
    };
  }

  deleteFile(fileId: string) {
    return fetch(`/api/upload/${fileId}`, {
      method: "DELETE",
    }).then((res) => {
      if (!res.ok) throw new Error("Failed to delete file");
      return res.json();
    });
  }

  updateNickname(nickname: string) {
    return fetch("/api/users/nickname", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: this.userId,
        nickname: nickname,
      }),
    }).then((res) => {
      if (!res.ok) throw new Error("Failed to update nickname");
      return res.json();
    });
  }

  onUserListUpdate(handler: (users: UserInfo[]) => void) {
    this.userListHandlers.push(handler);
    return () => {
      this.userListHandlers = this.userListHandlers.filter(
        (h) => h !== handler
      );
    };
  }

  onUserUpdate(handler: (data: { userId: string; nickname: string }) => void) {
    this.userUpdateHandlers.push(handler);
    return () => {
      this.userUpdateHandlers = this.userUpdateHandlers.filter(
        (h) => h !== handler
      );
    };
  }

  getUserId(): string | null {
    return this.userId;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // WebRTC Signal Methods
  sendWebRTCSignal(signal: Omit<WebRTCSignal, "from">) {
    if (!this.socket?.connected) {
      console.error("Cannot send WebRTC signal: Socket not connected");
      return;
    }

    const fullSignal = { ...signal, from: this.userId };
    console.log("Sending WebRTC signal:", {
      from: fullSignal.from,
      to: fullSignal.to,
      type: fullSignal.type,
      signalType: fullSignal.signal?.type,
    });

    this.socket.emit("webrtc-signal", fullSignal);
  }

  onWebRTCSignal(handler: (signal: WebRTCSignal) => void) {
    this.webRTCSignalHandlers.push(handler);
    return () => {
      this.webRTCSignalHandlers = this.webRTCSignalHandlers.filter(
        (h) => h !== handler
      );
    };
  }

  onWebRTCError(handler: (error: { message: string; error: string }) => void) {
    this.webRTCErrorHandlers.push(handler);
    if (this.socket) {
      this.socket.on("webrtc-error", (error) => {
        console.error("WebRTC Error:", error);
        this.webRTCErrorHandlers.forEach((h) => h(error));
      });
    }
    return () => {
      this.webRTCErrorHandlers = this.webRTCErrorHandlers.filter(
        (h) => h !== handler
      );
      if (this.socket) {
        this.socket.off("webrtc-error");
      }
    };
  }
}

export const socketService = new SocketService();
