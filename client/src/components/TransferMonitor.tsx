import React from "react";
import {
  Box,
  LinearProgress,
  Typography,
  Paper,
  IconButton,
  useTheme,
  useMediaQuery,
  Tooltip,
} from "@mui/material";
import { Close, FileDownload, CloudUpload } from "@mui/icons-material";

interface TransferMonitorProps {
  fileName: string;
  progress: number;
  isUpload?: boolean;
  onCancel?: () => void;
  isMobile?: boolean;
}

export const TransferMonitor: React.FC<TransferMonitorProps> = ({
  fileName,
  progress,
  isUpload = true,
  onCancel,
  isMobile: propIsMobile,
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const isMobile = propIsMobile ?? isSmallScreen;

  // Format file name for display
  const displayName =
    fileName.length > 20 && isMobile
      ? fileName.substring(0, 17) + "..."
      : fileName;

  return (
    <Paper
      elevation={3}
      sx={{
        p: isMobile ? 1.5 : 2,
        mb: 1,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        backgroundColor: theme.palette.background.paper,
        border: 1,
        borderColor: "divider",
        borderRadius: isMobile ? 1 : 2,
        width: "100%",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            overflow: "hidden",
          }}
        >
          {isUpload ? (
            <CloudUpload
              color="primary"
              fontSize={isMobile ? "small" : "medium"}
            />
          ) : (
            <FileDownload
              color="primary"
              fontSize={isMobile ? "small" : "medium"}
            />
          )}
          <Tooltip title={fileName} placement="top">
            <Typography
              variant={isMobile ? "body2" : "body1"}
              sx={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {displayName}
            </Typography>
          </Tooltip>
        </Box>
        {onCancel && (
          <IconButton
            onClick={onCancel}
            size={isMobile ? "small" : "medium"}
            sx={{
              opacity: 0.7,
              "&:hover": { opacity: 1 },
            }}
          >
            <Close fontSize={isMobile ? "small" : "medium"} />
          </IconButton>
        )}
      </Box>

      <Box sx={{ width: "100%", position: "relative" }}>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: isMobile ? 4 : 6,
            borderRadius: isMobile ? 2 : 3,
            backgroundColor: theme.palette.grey[200],
            "& .MuiLinearProgress-bar": {
              borderRadius: isMobile ? 2 : 3,
              backgroundColor: isUpload
                ? theme.palette.primary.main
                : theme.palette.secondary.main,
            },
          }}
        />
        <Typography
          variant="caption"
          sx={{
            position: "absolute",
            right: 0,
            top: isMobile ? -18 : -20,
            color: "text.secondary",
          }}
        >
          {progress}%
        </Typography>
      </Box>
    </Paper>
  );
};

export const TransferMonitorList: React.FC<{
  transfers: Array<{
    fileName: string;
    progress: number;
    isUpload?: boolean;
    id: string;
  }>;
  onCancel?: (id: string) => void;
}> = ({ transfers, onCancel }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  if (transfers.length === 0) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: isMobile ? 70 : 20,
        right: isMobile ? 0 : 20,
        width: isMobile ? "100%" : "300px",
        maxHeight: "40vh",
        overflowY: "auto",
        zIndex: theme.zIndex.snackbar,
        p: isMobile ? 1 : 2,
        bgcolor: "transparent",
      }}
    >
      {transfers.map((transfer) => (
        <TransferMonitor
          key={transfer.id}
          fileName={transfer.fileName}
          progress={transfer.progress}
          isUpload={transfer.isUpload}
          onCancel={onCancel ? () => onCancel(transfer.id) : undefined}
          isMobile={isMobile}
        />
      ))}
    </Box>
  );
};
