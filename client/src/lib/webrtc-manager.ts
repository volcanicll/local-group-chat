import SimplePeer from "simple-peer";
import { socketService } from "../socket";
import "webrtc-adapter";

interface PeerConnection {
  peer: SimplePeer.Instance;
  userId: string;
  type: "file" | "video";
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  sender: string;
}

interface SignalData {
  type: string;
  sdp?: string;
  candidate?: RTCIceCandidate;
}

type TransferProgress = {
  sent: number;
  total: number;
  fileName: string;
};

class EventEmitter {
  private events: { [key: string]: Function[] } = {};

  on(event: string, callback: Function): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  emit(event: string, ...args: any[]): void {
    const callbacks = this.events[event];
    if (callbacks) {
      callbacks.forEach((callback) => callback(...args));
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }
}

export class WebRTCManager extends EventEmitter {
  private connections: Map<string, PeerConnection> = new Map();
  private chunksBuffer: Map<string, Blob[]> = new Map();
  private mediaStream: MediaStream | null = null;
  private isInitialized: boolean = false;

  constructor() {
    super();
    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    socketService.onWebRTCSignal(async ({ from, signal, type }) => {
      console.log("Received WebRTC signal:", { from, type, signal });
      let connection = this.connections.get(from);

      if (!connection) {
        connection = await this.createPeerConnection(from, false, type);
        this.connections.set(from, connection);
      }

      try {
        connection.peer.signal(signal);
      } catch (err) {
        console.error("Error processing signal:", err);
        this.destroyConnection(from);
      }
    });
  }

  private async createPeerConnection(
    userId: string,
    initiator: boolean,
    type: "file" | "video"
  ): Promise<PeerConnection> {
    if (!window.RTCPeerConnection) {
      throw new Error("WebRTC is not supported in this browser");
    }

    console.log("Creating peer connection:", { userId, initiator, type });

    const peerOptions: SimplePeer.Options = {
      initiator,
      trickle: true,
      config: {
        iceServers: [
          {
            urls: [
              "stun:stun.l.google.com:19302",
              "stun:global.stun.twilio.com:3478",
            ],
          },
          {
            urls: "turn:numb.viagenie.ca",
            username: "webrtc@live.com",
            credential: "muazkh",
          },
        ],
        iceTransportPolicy: "all",
      },
      stream:
        type === "video" && this.mediaStream ? this.mediaStream : undefined,
      objectMode: type === "file",
      sdpTransform: (sdp: string) => {
        // Ensure audio and video codecs are properly negotiated
        if (type === "video") {
          sdp = sdp.replace(/(m=video.*\r\n)/g, "$1b=AS:2000\r\n");
          sdp = sdp.replace(/(m=audio.*\r\n)/g, "$1b=AS:128\r\n");
        }
        return sdp;
      },
    };

    console.log("Creating SimplePeer instance with options:", peerOptions);

    const peer = new SimplePeer(peerOptions);

    peer.on("signal", (signal: SignalData) => {
      console.log("Local peer signaling:", { userId, signal });
      socketService.sendWebRTCSignal({
        to: userId,
        signal,
        type,
      });
    });

    peer.on("connect", () => {
      console.log("Peer connection established:", userId);
      this.emit("peer-connected", userId);
    });

    peer.on("close", () => {
      console.log("Peer connection closed:", userId);
      this.destroyConnection(userId);
      this.emit("peer-disconnected", userId);
    });

    peer.on("error", (error: Error) => {
      console.error("Peer connection error:", { userId, error });
      this.destroyConnection(userId);
    });

    if (type === "video") {
      peer.on("stream", (remoteStream: MediaStream) => {
        console.log("Received remote stream");
        this.emit("remote-stream", { userId, stream: remoteStream });
      });
    }

    peer.on("data", (chunk: Uint8Array) => {
      this.handleIncomingData(userId, chunk);
    });

    return { peer, userId, type };
  }

  private async handleIncomingData(userId: string, data: Uint8Array) {
    try {
      const message = JSON.parse(new TextDecoder().decode(data));

      if (message.type === "file-metadata") {
        console.log("Received file metadata:", message.metadata);
        this.chunksBuffer.set(message.fileId, []);
        this.emit("file-start", message.metadata);
      } else if (message.type === "file-chunk") {
        const chunks = this.chunksBuffer.get(message.fileId);
        if (chunks) {
          chunks.push(new Blob([message.chunk]));
          this.emit("transfer-progress", {
            sent: message.chunkIndex * message.chunkSize,
            total: message.fileSize,
            fileName: message.fileName,
          });

          if (chunks.length === message.totalChunks) {
            const file = new Blob(chunks);
            this.emit("file-received", {
              file,
              metadata: message.metadata,
            });
            this.chunksBuffer.delete(message.fileId);
          }
        }
      }
    } catch (err) {
      console.error("Error handling incoming data:", err);
    }
  }

  private destroyConnection(userId: string) {
    console.log("Destroying connection:", userId);
    const connection = this.connections.get(userId);
    if (connection) {
      connection.peer.destroy();
      this.connections.delete(userId);
    }
  }

  async startVideoCall(targetUserId: string): Promise<void> {
    console.log("Starting video call with:", targetUserId);
    try {
      if (!this.mediaStream) {
        throw new Error("No media stream available");
      }
      const connection = await this.createPeerConnection(
        targetUserId,
        true,
        "video"
      );
      this.connections.set(targetUserId, connection);
      this.emit("local-stream", this.mediaStream);
    } catch (err) {
      console.error("Error starting video call:", err);
      throw err;
    }
  }

  async acceptVideoCall(fromUserId: string): Promise<void> {
    console.log("Accepting video call from:", fromUserId);
    try {
      if (!this.mediaStream) {
        throw new Error("No media stream available");
      }
      const connection = await this.createPeerConnection(
        fromUserId,
        false,
        "video"
      );
      this.connections.set(fromUserId, connection);
      this.emit("local-stream", this.mediaStream);
    } catch (err) {
      console.error("Error accepting video call:", err);
      throw err;
    }
  }

  endCall(userId: string): void {
    console.log("Ending call with:", userId);
    this.destroyConnection(userId);
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    this.emit("call-ended", userId);
  }

  toggleMute(type: "audio" | "video"): boolean {
    if (!this.mediaStream) return false;

    const tracks =
      type === "audio"
        ? this.mediaStream.getAudioTracks()
        : this.mediaStream.getVideoTracks();

    const enabled = !tracks[0]?.enabled;
    tracks.forEach((track) => (track.enabled = enabled));

    return enabled;
  }

  async setMediaStream(stream: MediaStream | null) {
    console.log("Setting media stream:", stream ? "stream available" : "null");
    this.mediaStream = stream;
  }

  // File transfer methods
  async sendFile(targetUserId: string, file: File): Promise<void> {
    const connection =
      this.connections.get(targetUserId) ||
      (await this.createPeerConnection(targetUserId, true, "file"));

    this.connections.set(targetUserId, connection);

    const chunkSize = 16 * 1024; // 16KB chunks
    const fileId = Math.random().toString(36).substring(7);
    const totalChunks = Math.ceil(file.size / chunkSize);

    const metadata: FileMetadata = {
      name: file.name,
      size: file.size,
      type: file.type,
      sender: socketService.getUserId() || "unknown",
    };

    connection.peer.send(
      JSON.stringify({
        type: "file-metadata",
        fileId,
        metadata,
      })
    );

    for (let i = 0; i < totalChunks; i++) {
      const chunk = file.slice(i * chunkSize, (i + 1) * chunkSize);
      const arrayBuffer = await chunk.arrayBuffer();

      connection.peer.send(
        JSON.stringify({
          type: "file-chunk",
          fileId,
          chunkIndex: i,
          chunkSize,
          totalChunks,
          fileSize: file.size,
          fileName: file.name,
          metadata,
          chunk: Array.from(new Uint8Array(arrayBuffer)),
        })
      );

      this.emit("transfer-progress", {
        sent: (i + 1) * chunkSize,
        total: file.size,
        fileName: file.name,
      });
    }
  }
}

export const webRTCManager = new WebRTCManager();
