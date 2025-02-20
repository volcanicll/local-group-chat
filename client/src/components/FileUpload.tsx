import React, { useCallback, useState, useEffect } from "react";
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
  useMediaQuery,
  LinearProgress,
  Snackbar,
  Alert,
  AlertColor,
} from "@mui/material";
import {
  AttachFile,
  Download,
  Delete,
  InsertDriveFile,
  CloudUpload,
} from "@mui/icons-material";
import axios from "axios";
import { FileMessage } from "../types";
import { FileMetadata } from "../lib/webrtc-manager";
import { socketService } from "../socket";
import { webRTCManager } from "../lib/webrtc-manager";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface Props {
  onFileUploaded?: () => void;
}

interface AlertMessage {
  type: AlertColor;
  message: string;
}

export const FileUpload = ({ onFileUploaded }: Props) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: number;
  }>({});
  const [sharedFiles, setSharedFiles] = useState<FileMessage[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [alert, setAlert] = useState<AlertMessage | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = useCallback(
    async (file: File) => {
      const currentUserId = socketService.getUserId();
      const maxSize = 100 * 1024 * 1024; // 100MB

      try {
        if (file.size > maxSize) {
          setAlert({
            type: "error",
            message: "文件大小不能超过100MB",
          });
          return;
        }

        // 使用WebRTC传输大文件
        if (file.size > 10 * 1024 * 1024) {
          // 10MB以上使用WebRTC
          setAlert({
            type: "info",
            message: "使用P2P传输大文件中...",
          });
          const users = Array.from(new Set(sharedFiles.map((f) => f.sender)));
          for (const user of users) {
            if (user !== currentUserId) {
              await webRTCManager.sendFile(user, file);
            }
          }
        } else {
          // 小文件使用HTTP上传
          const formData = new FormData();
          formData.append("file", file);
          formData.append("sender", currentUserId || "未知用户");

          await axios.post("/api/upload", formData, {
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const progress = Math.round(
                  (progressEvent.loaded * 100) / progressEvent.total
                );
                setUploadProgress((prev) => ({
                  ...prev,
                  [file.name]: progress,
                }));
              }
            },
          });
        }

        if (onFileUploaded) {
          onFileUploaded();
        }

        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });

        setAlert({
          type: "success",
          message: "文件上传成功",
        });
      } catch (error) {
        console.error("File upload failed:", error);
        setAlert({
          type: "error",
          message: "文件上传失败",
        });
        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });
      }
    },
    [onFileUploaded, sharedFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  useEffect(() => {
    const unsubscribeShared = socketService.onFileShared((file) => {
      setSharedFiles((prev) => [file, ...prev]);
    });

    const unsubscribeDeleted = socketService.onFileDeleted((fileId) => {
      setSharedFiles((prev) => prev.filter((file) => file.id !== fileId));
      setDeleting(null);
    });

    const handleFileStart = (metadata: FileMetadata) => {
      const newFile: FileMessage = {
        id: Math.random().toString(36).substr(2, 9),
        name: metadata.name,
        size: metadata.size,
        type: metadata.type,
        sender: metadata.sender,
        timestamp: new Date().toISOString(),
      };
      setSharedFiles((prev) => [newFile, ...prev]);
    };

    const handleTransferProgress = ({
      sent,
      total,
      fileName,
    }: {
      sent: number;
      total: number;
      fileName: string;
    }) => {
      const progress = Math.round((sent * 100) / total);
      setUploadProgress((prev) => ({
        ...prev,
        [fileName]: progress,
      }));
    };

    webRTCManager.on("file-start", handleFileStart);
    webRTCManager.on("transfer-progress", handleTransferProgress);
    webRTCManager.on(
      "file-received",
      ({ file, metadata }: { file: Blob; metadata: FileMetadata }) => {
        const url = URL.createObjectURL(file);
        const link = document.createElement("a");
        link.href = url;
        link.download = metadata.name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        setAlert({
          type: "success",
          message: "文件接收成功",
        });
      }
    );

    return () => {
      unsubscribeShared();
      unsubscribeDeleted();
      webRTCManager.removeAllListeners("file-start");
      webRTCManager.removeAllListeners("transfer-progress");
      webRTCManager.removeAllListeners("file-received");
    };
  }, []);

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      const response = await axios.get(`/api/download/${fileId}`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setAlert({
        type: "success",
        message: "文件下载成功",
      });
    } catch (error) {
      console.error("File download failed:", error);
      setAlert({
        type: "error",
        message: "文件下载失败",
      });
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      setDeleting(fileId);
      await socketService.deleteFile(fileId);
      setAlert({
        type: "success",
        message: "文件删除成功",
      });
    } catch (error) {
      console.error("File deletion failed:", error);
      setAlert({
        type: "error",
        message: "文件删除失败",
      });
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
    <>
      <Paper
        sx={{
          height: "100%",
          borderRadius: isMobile ? 0 : 2,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
      >
        <Box
          sx={{
            p: 2,
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: isDragging ? "action.hover" : "transparent",
            transition: "background-color 0.2s",
          }}
        >
          <input
            type="file"
            id="file-upload"
            style={{ display: "none" }}
            onChange={handleFileInputChange}
          />
          <label htmlFor="file-upload">
            <Button
              variant="outlined"
              component="span"
              startIcon={isDragging ? <CloudUpload /> : <AttachFile />}
              fullWidth
              sx={{
                height: 40,
                transition: "all 0.2s",
                transform: isDragging ? "scale(1.02)" : "none",
              }}
            >
              {isDragging ? "释放以上传" : "选择文件"}
            </Button>
          </label>
        </Box>

        <List
          sx={{
            overflow: "auto",
            flexGrow: 1,
            p: 0,
            "& .MuiListItem-root": {
              px: { xs: 1, sm: 2 },
              py: { xs: 1, sm: 1.5 },
            },
          }}
        >
          {sharedFiles.map((file) => (
            <ListItem
              key={file.id}
              sx={{
                borderBottom: 1,
                borderColor: "divider",
                "&:hover": {
                  backgroundColor: theme.palette.action.hover,
                },
                transition: "background-color 0.2s",
              }}
            >
              <ListItemIcon>
                <InsertDriveFile />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Tooltip title={file.name} placement="top">
                    <Typography
                      component="div"
                      variant="body2"
                      sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: isMobile ? "0.875rem" : "inherit",
                      }}
                    >
                      {file.name}
                    </Typography>
                  </Tooltip>
                }
                secondary={
                  <Box
                    sx={{
                      display: "flex",
                      gap: 1,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ fontSize: isMobile ? "0.7rem" : "0.75rem" }}
                    >
                      {file.sender}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: isMobile ? "0.7rem" : "0.75rem" }}
                    >
                      {formatFileSize(file.size)}
                    </Typography>
                    {file.timestamp && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: isMobile ? "0.7rem" : "0.75rem" }}
                      >
                        {format(new Date(file.timestamp), "HH:mm", {
                          locale: zhCN,
                        })}
                      </Typography>
                    )}
                  </Box>
                }
              />
              {uploadProgress[file.name] !== undefined && (
                <Box sx={{ width: "100%", mr: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={uploadProgress[file.name]}
                    sx={{ height: 4, borderRadius: 2 }}
                  />
                </Box>
              )}
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  onClick={() => handleDownload(file.id, file.name)}
                  size={isMobile ? "small" : "medium"}
                  sx={{ mr: 1 }}
                >
                  <Download fontSize={isMobile ? "small" : "medium"} />
                </IconButton>
                <IconButton
                  edge="end"
                  onClick={() => handleDelete(file.id)}
                  disabled={deleting === file.id}
                  size={isMobile ? "small" : "medium"}
                >
                  {deleting === file.id ? (
                    <CircularProgress size={isMobile ? 16 : 20} />
                  ) : (
                    <Delete fontSize={isMobile ? "small" : "medium"} />
                  )}
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Paper>

      {alert && (
        <Snackbar
          open={true}
          autoHideDuration={3000}
          onClose={() => setAlert(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={() => setAlert(null)}
            severity={alert.type}
            variant="filled"
            sx={{ width: "100%" }}
          >
            {alert.message}
          </Alert>
        </Snackbar>
      )}
    </>
  );
};
