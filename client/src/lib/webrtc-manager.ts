import SimplePeer from "simple-peer";
import { Socket } from "socket.io-client";
import "webrtc-adapter";

interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
}

interface FileChunk {
  id: string;
  index: number;
  total: number;
  data: ArrayBuffer;
}

export class WebRTCManager {
  private peers = new Map<string, SimplePeer.Instance>();
  private speedLimits = new Map<string, number>();

  // Methods to control transfer
  public pauseTransfer(fileId: string): void {
    const stats = this.transferStats.get(fileId);
    if (stats) {
      stats.status = "paused";
      stats.paused = true;
    }
  }

  public resumeTransfer(fileId: string): void {
    const stats = this.transferStats.get(fileId);
    if (stats) {
      stats.status = "transferring";
      stats.paused = false;
    }
  }

  public setSpeedLimit(fileId: string, bytesPerSecond: number): void {
    this.speedLimits.set(fileId, bytesPerSecond);
  }

  private chunkSize = 16384; // 16KB chunks
  private transferStats = new Map<
    string,
    {
      startTime: number;
      lastUpdate: number;
      totalSize: number;
      transferredSize: number;
      chunks: number[];
      status: "transferring" | "paused" | "completed" | "error";
      speeds: number[];
      peakSpeed: number;
      paused: boolean;
    }
  >();

  private transferCallbacks = new Map<
    string,
    {
      onProgress: (progress: number) => void;
      onComplete: () => void;
      onError: (error: Error) => void;
      onStats: (stats: {
        speed: number;
        progress: number;
        status: "transferring" | "paused" | "completed" | "error";
        totalSize: number;
        transferredSize: number;
        startTime: Date;
        averageSpeed: number;
        peakSpeed: number;
        remainingTime: number;
      }) => void;
    }
  >();

  constructor(private socket: Socket) {
    this.setupSignaling();
  }

  private setupSignaling() {
    this.socket.on("rtc:signal", (data: { from: string; signal: any }) => {
      const peer = this.peers.get(data.from);
      if (peer) {
        try {
          peer.signal(data.signal);
        } catch (err) {
          console.error("Error processing signal:", err);
          this.fallbackToWS(data.from);
        }
      }
    });

    this.socket.on(
      "rtc:request",
      async ({ from, fileInfo }: { from: string; fileInfo: FileMetadata }) => {
        const accept = window.confirm(
          `${from} wants to send you ${fileInfo.name} (${(
            fileInfo.size / 1024
          ).toFixed(2)} KB)`
        );
        if (accept) {
          this.setupReceiver(from, fileInfo);
          this.socket.emit("rtc:accept", { to: from });
        } else {
          this.socket.emit("rtc:reject", { to: from });
        }
      }
    );
  }

  private setupReceiver(peerId: string, fileInfo: FileMetadata) {
    const peer = this.createPeer(peerId, false);
    let receivedChunks: ArrayBuffer[] = [];
    let receivedSize = 0;

    peer.on("data", (data: Buffer) => {
      const chunk: FileChunk = JSON.parse(data.toString());
      if (chunk.data) {
        receivedChunks[chunk.index] = chunk.data;
        receivedSize += chunk.data.byteLength;

        const progress = Math.floor((receivedSize / fileInfo.size) * 100);
        this.transferCallbacks.get(fileInfo.id)?.onProgress(progress);

        if (receivedSize === fileInfo.size) {
          const file = new Blob(receivedChunks, { type: fileInfo.type });
          const url = URL.createObjectURL(file);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileInfo.name;
          a.click();
          URL.revokeObjectURL(url);

          this.transferCallbacks.get(fileInfo.id)?.onComplete();
          this.cleanupTransfer(fileInfo.id, peerId);
        }
      }
    });
  }

  async initiateFileTransfer(
    targetId: string,
    file: File,
    callbacks: {
      onProgress: (progress: number) => void;
      onComplete: () => void;
      onError: (error: Error) => void;
      onStats?: (stats: {
        speed: number;
        progress: number;
        status: "transferring" | "paused" | "completed" | "error";
        totalSize: number;
        transferredSize: number;
        startTime: Date;
        averageSpeed: number;
        peakSpeed: number;
        remainingTime: number;
      }) => void;
    }
  ) {
    const fileId = Math.random().toString(36).substring(7);
    this.transferCallbacks.set(fileId, {
      ...callbacks,
      onStats: callbacks.onStats || (() => {}),
    });

    // Initialize transfer stats
    this.transferStats.set(fileId, {
      startTime: Date.now(),
      lastUpdate: Date.now(),
      totalSize: file.size,
      transferredSize: 0,
      chunks: [],
      status: "transferring",
      speeds: [],
      peakSpeed: 0,
      paused: false,
    });

    const metadata: FileMetadata = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
    };

    this.socket.emit("rtc:request", { to: targetId, fileInfo: metadata });

    this.socket.once("rtc:accept", async ({ from }) => {
      if (from === targetId) {
        const peer = this.createPeer(targetId, true);
        await this.sendFile(peer, file, metadata);
      }
    });

    this.socket.once("rtc:reject", ({ from }) => {
      if (from === targetId) {
        callbacks.onError(new Error("File transfer rejected"));
        this.cleanupTransfer(fileId, targetId);
      }
    });
  }

  private async sendFile(
    peer: SimplePeer.Instance,
    file: File,
    metadata: FileMetadata
  ) {
    const chunks = Math.ceil(file.size / this.chunkSize);

    for (let i = 0; i < chunks; i++) {
      const start = i * this.chunkSize;
      const end = Math.min(start + this.chunkSize, file.size);
      const chunk = file.slice(start, end);
      const buffer = await chunk.arrayBuffer();

      const fileChunk: FileChunk = {
        id: metadata.id,
        index: i,
        total: chunks,
        data: buffer,
      };

      if (this.transferStats.get(metadata.id)?.paused) {
        await new Promise<void>((resolve) => {
          const checkPaused = () => {
            if (!this.transferStats.get(metadata.id)?.paused) {
              resolve();
            } else {
              setTimeout(checkPaused, 100);
            }
          };
          checkPaused();
        });
      }

      // Get transfer stats and handle speed limit
      const stats = this.transferStats.get(metadata.id);
      if (stats) {
        // Apply speed limit if set
        const speedLimit = this.speedLimits.get(metadata.id);
        if (speedLimit) {
          const timeSinceLastChunk = (Date.now() - stats.lastUpdate) / 1000;
          const currentSpeed = buffer.byteLength / timeSinceLastChunk;
          if (currentSpeed > speedLimit) {
            const delayMs =
              (buffer.byteLength / speedLimit) * 1000 -
              timeSinceLastChunk * 1000;
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }

        peer.send(JSON.stringify(fileChunk));

        // Update transfer stats
        const now = Date.now();
        const timeDiff = (now - stats.lastUpdate) / 1000; // seconds
        const chunkSize = buffer.byteLength;
        const speed = chunkSize / timeDiff;

        stats.transferredSize += chunkSize;
        stats.speeds.push(speed);
        stats.peakSpeed = Math.max(stats.peakSpeed, speed);
        stats.lastUpdate = now;

        if (stats.speeds.length > 10) stats.speeds.shift(); // Keep last 10 speed measurements

        const progress = Math.floor(
          (stats.transferredSize / stats.totalSize) * 100
        );
        const averageSpeed =
          stats.speeds.reduce((a, b) => a + b, 0) / stats.speeds.length;
        const remainingBytes = stats.totalSize - stats.transferredSize;
        const remainingTime = averageSpeed ? remainingBytes / averageSpeed : 0;

        this.transferCallbacks.get(metadata.id)?.onProgress(progress);
        this.transferCallbacks.get(metadata.id)?.onStats({
          speed,
          progress,
          status: stats.status,
          totalSize: stats.totalSize,
          transferredSize: stats.transferredSize,
          startTime: new Date(stats.startTime),
          averageSpeed,
          peakSpeed: stats.peakSpeed,
          remainingTime,
        });
      }

      // Small delay to prevent overwhelming the data channel
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  private createPeer(
    targetId: string,
    initiator: boolean
  ): SimplePeer.Instance {
    const peer = new SimplePeer({
      initiator,
      trickle: true,
    });

    peer.on("signal", (signal) => {
      this.socket.emit("rtc:signal", { to: targetId, signal });
    });

    peer.on("error", (err) => {
      console.error("WebRTC peer error:", err);
      this.fallbackToWS(targetId);
    });

    this.peers.set(targetId, peer);
    return peer;
  }

  private fallbackToWS(peerId: string) {
    console.log("Falling back to WebSocket transport");
    this.cleanupPeer(peerId);
    // 触发fallback事件，让应用层处理回退逻辑
    this.socket.emit("rtc:fallback", { to: peerId });
  }

  private cleanupPeer(peerId: string) {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.destroy();
      this.peers.delete(peerId);
    }
  }

  private cleanupTransfer(fileId: string, peerId: string) {
    this.transferCallbacks.delete(fileId);
    this.transferStats.delete(fileId);
    this.speedLimits.delete(fileId);
    this.cleanupPeer(peerId);
  }
}
