export interface Message {
  id: string;
  user: string;
  text: string;
  timestamp: string;
}

export interface FileMessage {
  id: string;
  name: string;
  size: number;
  sender: string;
}

export interface WelcomeResponse {
  userId: string;
  messages: Message[];
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
