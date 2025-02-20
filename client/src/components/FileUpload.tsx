import React, { useCallback, useState, useEffect, useContext } from "react";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  Paper,
  Tooltip,
  Typography,
  useTheme,
  Snackbar,
  Alert,
} from "@mui/material";
import { UserSelectDialog } from "./UserSelectDialog";
import {
  AttachFile,
  Download,
  Delete,
  InsertDriveFile,
} from "@mui/icons-material";
import { FileMessage, TransferStats } from "../types";
import { TransferMonitor } from "./TransferMonitor";
import { socketService } from "../socket";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { UserContext } from "../App";
import { UserInfo } from "../types";

interface Props {
  onFileUploaded?: () => void;
}

interface TransferState {
  [key: string]: {
    progress: number;
    stats: TransferStats;
    isPaused: boolean;
  };
}

export const FileUpload = ({ onFileUploaded }: Props) => {
  const [transferState, setTransferState] = useState<TransferState>({});
  const [sharedFiles, setSharedFiles] = useState<FileMessage[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const theme = useTheme();
  const { userId } = useContext(UserContext);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [userSelectOpen, setUserSelectOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [users, setUsers] = useState<UserInfo[]>([]);

  useEffect(() => {
    const unsubscribe = socketService.onUserListUpdate((userList) => {
      setUsers(userList);
    });
    return () => unsubscribe();
  }, []);

  const handleSnackbarClose = (
    event: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbarOpen(false);
  };

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files) return;

      const file = files[0];
      setSelectedFile(file);
      setUserSelectOpen(true);

      setTransferState((prev) => ({
        ...prev,
        [file.name]: {
          progress: 0,
          stats: {
            speed: 0,
            progress: 0,
            status: "transferring",
            totalSize: file.size,
            transferredSize: 0,
            startTime: new Date(),
            averageSpeed: 0,
            peakSpeed: 0,
            remainingTime: 0,
          },
          isPaused: false,
        },
      }));

      // 重置input，允许选择相同文件
      event.target.value = "";
    },
    []
  );

  useEffect(() => {
    const unsubscribeShared = socketService.onFileShared((file) => {
      setSharedFiles((prev) => [file, ...prev]);
    });

    const unsubscribeDeleted = socketService.onFileDeleted((fileId) => {
      setSharedFiles((prev) => prev.filter((file) => file.id !== fileId));
      setDeleting(null);
    });

    socketService.onWebRTCFallback(({ from }) => {
      setSnackbarMessage(`用户 ${from} WebRTC传输失败，已回退到WebSocket`);
      setSnackbarOpen(true);
    });

    return () => {
      unsubscribeShared();
      unsubscribeDeleted();
    };
  }, []);

  const handleDownload = useCallback(
    async (fileId: string, fileName: string) => {
      try {
        const response = await fetch(`/api/download/${fileId}`, {
          method: "GET",
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("File download failed:", error);
        setSnackbarMessage(`文件下载失败: ${error}`);
        setSnackbarOpen(true);
      }
    },
    []
  );

  const handleDelete = async (fileId: string) => {
    try {
      setDeleting(fileId);
      await socketService.deleteFile(fileId);
    } catch (error) {
      console.error("File deletion failed:", error);
      setDeleting(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + " " + sizes[i];
  };

  return (
    <Paper sx={{ height: "100%", borderRadius: 2, overflow: "hidden" }}>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity="success"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <input
          type="file"
          id="file-upload"
          style={{ display: "none" }}
          onChange={handleFileSelect}
        />
        <label htmlFor="file-upload">
          <Button
            variant="outlined"
            component="span"
            startIcon={<AttachFile />}
            fullWidth
          >
            选择文件
          </Button>
        </label>
      </Box>
      <UserSelectDialog
        open={userSelectOpen}
        onClose={() => {
          setUserSelectOpen(false);
          setSelectedFile(null);
        }}
        onSelect={async (targetUserId) => {
          if (!selectedFile) return;

          try {
            await socketService.sendFileViaWebRTC(targetUserId, selectedFile, {
              onProgress: (progress) => {
                setTransferState((prev) => ({
                  ...prev,
                  [selectedFile.name]: {
                    ...prev[selectedFile.name],
                    progress,
                  },
                }));
              },
              onComplete: () => {
                if (onFileUploaded) {
                  onFileUploaded();
                }
                setSnackbarMessage("文件发送成功!");
                setSnackbarOpen(true);

                // 清理传输状态
                setTransferState((prev) => {
                  const newState = { ...prev };
                  delete newState[selectedFile.name];
                  return newState;
                });
              },
              onError: (error: Error) => {
                console.error("WebRTC文件发送失败:", error);
                setSnackbarMessage(`文件发送失败: ${error.message}`);
                setSnackbarOpen(true);
              },
              onStats: (stats: TransferStats) => {
                setTransferState((prev) => ({
                  ...prev,
                  [selectedFile.name]: {
                    ...prev[selectedFile.name],
                    stats,
                  },
                }));
              },
            });
            setSelectedFile(null);
          } catch (error) {
            console.error("Transfer failed:", error);
            setSnackbarMessage(
              `传输失败: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
            setSnackbarOpen(true);
          }
        }}
        users={users}
        currentUserId={userId as string}
      />

      <List sx={{ overflow: "auto", maxHeight: "calc(100% - 80px)" }}>
        {sharedFiles.map((file) => (
          <ListItem
            key={file.id}
            sx={{
              "&:hover": {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <ListItemIcon>
              <InsertDriveFile />
            </ListItemIcon>
            <ListItemText
              primary={
                <Tooltip title={file.name}>
                  <Typography
                    variant="body2"
                    sx={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {file.name}
                  </Typography>
                </Tooltip>
              }
              secondary={
                <Box
                  component="span"
                  sx={{ display: "flex", gap: 1, alignItems: "center" }}
                >
                  <Typography variant="caption" component="span">
                    {file.sender}
                  </Typography>
                  <Typography
                    variant="caption"
                    component="span"
                    color="text.secondary"
                  >
                    {formatFileSize(file.size)}
                  </Typography>
                  {file.timestamp && (
                    <Typography
                      variant="caption"
                      component="span"
                      color="text.secondary"
                    >
                      {format(new Date(file.timestamp), "HH:mm", {
                        locale: zhCN,
                      })}
                    </Typography>
                  )}
                </Box>
              }
            />
            {transferState[file.name] && (
              <TransferMonitor
                fileName={file.name}
                stats={transferState[file.name].stats}
                onPauseResume={() => {
                  const currentState = transferState[file.name];
                  if (currentState && currentState.stats) {
                    const newIsPaused = !currentState.isPaused;
                    try {
                      if (newIsPaused) {
                        socketService.pauseTransfer(file.id);
                      } else {
                        socketService.resumeTransfer(file.id);
                      }
                      setTransferState((prev) => ({
                        ...prev,
                        [file.name]: {
                          ...prev[file.name],
                          isPaused: newIsPaused,
                          stats: {
                            ...prev[file.name].stats,
                            status: newIsPaused ? "paused" : "transferring",
                          },
                        },
                      }));
                    } catch (error) {
                      console.error("Failed to pause/resume transfer:", error);
                      setSnackbarMessage(
                        `传输控制失败: ${
                          error instanceof Error ? error.message : String(error)
                        }`
                      );
                      setSnackbarOpen(true);
                    }
                  }
                }}
                onSpeedLimit={(limit) => {
                  try {
                    socketService.setTransferSpeedLimit(file.id, limit);
                    setSnackbarMessage(
                      `已设置速度限制: ${formatFileSize(limit)}/s`
                    );
                    setSnackbarOpen(true);
                  } catch (error) {
                    console.error("Failed to set speed limit:", error);
                    setSnackbarMessage(
                      `设置速度限制失败: ${
                        error instanceof Error ? error.message : String(error)
                      }`
                    );
                    setSnackbarOpen(true);
                  }
                }}
              />
            )}
            <ListItemSecondaryAction>
              <IconButton
                edge="end"
                onClick={() => handleDownload(file.id, file.name)}
                sx={{ mr: 1 }}
              >
                <Download />
              </IconButton>
              <IconButton
                edge="end"
                onClick={() => handleDelete(file.id)}
                disabled={deleting === file.id}
              >
                {deleting === file.id ? (
                  <CircularProgress size={20} />
                ) : (
                  <Delete />
                )}
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};
