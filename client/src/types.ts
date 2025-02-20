export interface Message {
  id: string;
  user: string; // 显示的用户昵称
  userId: string; // 用户唯一标识
  text: string;
  timestamp: string;
  isCode?: boolean;
  language?: string;
}

export interface FileMessage {
  id: string;
  name: string;
  size: number;
  sender: string;
  timestamp?: string;
}

export interface FileDeleteResponse {
  fileId: string;
  message: string;
}

export interface UserInfo {
  userId: string;
  nickname: string;
}

export interface TransferStats {
  speed: number;
  progress: number;
  status: "transferring" | "paused" | "completed" | "error";
  totalSize: number;
  transferredSize: number;
  startTime: Date;
  averageSpeed: number;
  peakSpeed: number;
  remainingTime: number;
}

export interface WelcomeResponse {
  userId: string;
  nickname: string;
  messages: Message[];
}

export interface UpdateNicknameResponse {
  userId: string;
  nickname: string;
  success: boolean;
}

export interface UploadResponse {
  fileId: string;
  name: string;
  size: number;
}

export interface ThemeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
}
