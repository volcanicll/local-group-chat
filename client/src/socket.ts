import { io, Socket } from "socket.io-client";
import { FileMessage, Message, WelcomeResponse } from "./types";

class SocketService {
  private socket: Socket | null = null;
  private messageHandlers: ((message: Message) => void)[] = [];
  private fileHandlers: ((file: FileMessage) => void)[] = [];
  private userListHandlers: ((users: string[]) => void)[] = [];
  private userId: string | null = null;

  connect(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.socket = io("/");

      this.socket.on("connect", () => {
        console.log("Connected to server");
      });

      this.socket.on("welcome", ({ userId, messages }: WelcomeResponse) => {
        this.userId = userId;
        messages.forEach((msg) => {
          this.messageHandlers.forEach((handler) => handler(msg));
        });
        resolve(userId);
      });

      this.socket.on("message", (message: Message) => {
        this.messageHandlers.forEach((handler) => handler(message));
      });

      this.socket.on("file-shared", (file: FileMessage) => {
        this.fileHandlers.forEach((handler) => handler(file));
      });

      this.socket.on("user-list", (users: string[]) => {
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

  onUserListUpdate(handler: (users: string[]) => void) {
    this.userListHandlers.push(handler);
    return () => {
      this.userListHandlers = this.userListHandlers.filter(
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
}

export const socketService = new SocketService();
