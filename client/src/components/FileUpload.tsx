import React, { useCallback, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import { AttachFile, Download, InsertDriveFile } from "@mui/icons-material";
import axios from "axios";
import { FileMessage } from "../types";
import { socketService } from "../socket";

interface Props {
  onFileUploaded?: () => void;
}

export const FileUpload = ({ onFileUploaded }: Props) => {
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: number;
  }>({});
  const [sharedFiles, setSharedFiles] = useState<FileMessage[]>([]);

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

        // 清除进度
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

  React.useEffect(() => {
    const unsubscribe = socketService.onFileShared((file) => {
      setSharedFiles((prev) => [file, ...prev]);
    });

    return () => unsubscribe();
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + " " + sizes[i];
  };

  return (
    <Paper sx={{ p: 2, height: "100%", borderRadius: 2 }}>
      <Box sx={{ mb: 2 }}>
        <input
          type="file"
          id="file-upload"
          style={{ display: "none" }}
          onChange={handleFileSelect}
        />
        <label htmlFor="file-upload">
          <Button
            variant="contained"
            component="span"
            startIcon={<AttachFile />}
            fullWidth
          >
            选择文件
          </Button>
        </label>
      </Box>

      <Typography variant="h6" sx={{ mb: 1 }}>
        共享文件
      </Typography>
      <List sx={{ overflow: "auto", maxHeight: "calc(100% - 120px)" }}>
        {sharedFiles.map((file) => (
          <ListItem
            key={file.id}
            secondaryAction={
              <IconButton
                edge="end"
                onClick={() => handleDownload(file.id, file.name)}
              >
                <Download />
              </IconButton>
            }
          >
            <ListItemIcon>
              <InsertDriveFile />
            </ListItemIcon>
            <ListItemText
              primary={file.name}
              secondary={`${file.sender} - ${formatFileSize(file.size)}`}
            />
            {uploadProgress[file.name] !== undefined && (
              <Box sx={{ display: "flex", alignItems: "center", ml: 2 }}>
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
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};
