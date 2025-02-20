import React, { useState, useEffect } from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { theme, darkTheme } from "./theme";
import { Chat } from "./components/Chat";
import { TransferMonitorList } from "./components/TransferMonitor";
import { webRTCManager } from "./lib/webrtc-manager";

interface Transfer {
  id: string;
  fileName: string;
  progress: number;
  isUpload: boolean;
}

export function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [transfers, setTransfers] = useState<Transfer[]>([]);

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      darkMode ? "dark" : "light"
    );
  }, [darkMode]);

  useEffect(() => {
    // 监听文件传输进度
    const handleTransferProgress = ({
      fileName,
      sent,
      total,
    }: {
      fileName: string;
      sent: number;
      total: number;
    }) => {
      const progress = Math.round((sent * 100) / total);
      setTransfers((prev) => {
        const existingTransfer = prev.find((t) => t.fileName === fileName);
        if (existingTransfer) {
          return prev.map((t) =>
            t.fileName === fileName ? { ...t, progress } : t
          );
        }
        return [
          ...prev,
          {
            id: `${Date.now()}-${fileName}`,
            fileName,
            progress,
            isUpload: true,
          },
        ];
      });

      // 当传输完成时，延迟移除进度条
      if (progress === 100) {
        setTimeout(() => {
          setTransfers((prev) => prev.filter((t) => t.fileName !== fileName));
        }, 2000);
      }
    };

    // 监听文件接收开始
    const handleFileStart = ({
      name,
      size,
    }: {
      name: string;
      size: number;
    }) => {
      setTransfers((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${name}`,
          fileName: name,
          progress: 0,
          isUpload: false,
        },
      ]);
    };

    webRTCManager.on("transfer-progress", handleTransferProgress);
    webRTCManager.on("file-start", handleFileStart);

    return () => {
      webRTCManager.removeAllListeners("transfer-progress");
      webRTCManager.removeAllListeners("file-start");
    };
  }, []);

  const handleCancelTransfer = (id: string) => {
    // TODO: Implement transfer cancellation
    setTransfers((prev) => prev.filter((t) => t.id !== id));
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <ThemeProvider theme={darkMode ? darkTheme : theme}>
      <CssBaseline />
      <Chat onToggleTheme={toggleDarkMode} darkMode={darkMode} />
      <TransferMonitorList
        transfers={transfers}
        onCancel={handleCancelTransfer}
      />
    </ThemeProvider>
  );
}
