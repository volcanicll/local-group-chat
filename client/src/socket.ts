import { io, Socket } from "socket.io-client";
import { FileMessage, Message, WelcomeResponse, UserInfo } from "./types";

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
  private userId: string | null = null;

  connect(): Promise<string> {
    return new Promise((resolve, reject) => {
      const savedUserId = localStorage.getItem("userId");

      this.socket = io("/", {
        auth: {
          userId: savedUserId,
        },
      });

      this.socket.on("connect", () => {
        console.log("Connected to server");
      });

      this.socket.on(
        "welcome",
        ({ userId, nickname, messages }: WelcomeResponse) => {
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
        if (userId === this.userId) {
          localStorage.setItem("nickname", nickname);
        }
      });

      this.socket.on("message", (message: Message) => {
        this.messageHandlers.forEach((handler) => handler(message));
      });

      this.socket.on("file-shared", (file: FileMessage) => {
        this.fileHandlers.forEach((handler) =>
          handler({
            ...file,
            timestamp: new Date().toISOString(),
          })
        );
      });

      this.socket.on("file-deleted", (fileId: string) => {
        this.fileDeleteHandlers.forEach((handler) => handler(fileId));
      });

      this.socket.on("user-list", (users: UserInfo[]) => {
        this.userListHandlers.forEach((handler) => handler(users));
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
    if (this.socket) {
      this.socket.on("user-updated", (data) => {
        this.userUpdateHandlers.forEach((h) => h(data));
      });
    }
    return () => {
      this.userUpdateHandlers = this.userUpdateHandlers.filter(
        (h) => h !== handler
      );
      if (this.socket) {
        this.socket.off("user-updated");
      }
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
}

export const socketService = new SocketService();
