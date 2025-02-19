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
} from "@mui/material";
import {
  AttachFile,
  Download,
  Delete,
  InsertDriveFile,
} from "@mui/icons-material";
import axios from "axios";
import { FileMessage } from "../types";
import { socketService } from "../socket";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface Props {
  onFileUploaded?: () => void;
}

export const FileUpload = ({ onFileUploaded }: Props) => {
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: number;
  }>({});
  const [sharedFiles, setSharedFiles] = useState<FileMessage[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const theme = useTheme();

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files) return;

      const formData = new FormData();
      formData.append("file", files[0]);
      formData.append("sender", socketService.getUserId() || "未知用户");

      try {
        const response = await axios.post("/api/upload", formData, {
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setUploadProgress((prev) => ({
                ...prev,
                [files[0].name]: progress,
              }));
            }
          },
        });

        if (onFileUploaded) {
          onFileUploaded();
        }

        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[files[0].name];
          return newProgress;
        });
      } catch (error) {
        console.error("File upload failed:", error);
        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[files[0].name];
          return newProgress;
        });
      }
    },
    [onFileUploaded]
  );

  useEffect(() => {
    const unsubscribeShared = socketService.onFileShared((file) => {
      setSharedFiles((prev) => [file, ...prev]);
    });

    const unsubscribeDeleted = socketService.onFileDeleted((fileId) => {
      setSharedFiles((prev) => prev.filter((file) => file.id !== fileId));
      setDeleting(null);
    });

    return () => {
      unsubscribeShared();
      unsubscribeDeleted();
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
    } catch (error) {
      console.error("File download failed:", error);
    }
  };

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
            {uploadProgress[file.name] !== undefined && (
              <Box sx={{ display: "flex", alignItems: "center", mr: 2 }}>
                <CircularProgress
                  variant="determinate"
                  value={uploadProgress[file.name]}
                  size={24}
                />
                <Typography variant="body2" sx={{ ml: 1 }}>
                  {uploadProgress[file.name]}%
                </Typography>
              </Box>
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
