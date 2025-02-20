import React from "react";
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Grid,
} from "@mui/material";
import {
  PauseCircle,
  PlayCircle,
  Speed,
  Assessment,
  SignalCellularAlt,
} from "@mui/icons-material";

interface TransferStats {
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

interface Props {
  fileName: string;
  stats: TransferStats;
  onPauseResume?: () => void;
  onSpeedLimit?: (limit: number) => void;
}

const formatSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

const formatSpeed = (bytesPerSecond: number): string => {
  return `${formatSize(bytesPerSecond)}/s`;
};

const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}秒`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分${Math.round(seconds % 60)}秒`;
  const hours = Math.floor(minutes / 60);
  return `${hours}时${minutes % 60}分`;
};

export const TransferMonitor: React.FC<Props> = ({
  fileName,
  stats,
  onPauseResume,
  onSpeedLimit,
}) => {
  const isTransferring = stats.status === "transferring";

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          {fileName}
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              <LinearProgress
                variant="determinate"
                value={stats.progress}
                sx={{ flexGrow: 1, mr: 2 }}
              />
              <Typography variant="body2">{`${Math.round(
                stats.progress
              )}%`}</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
              <Tooltip title={isTransferring ? "暂停" : "继续"}>
                <IconButton onClick={onPauseResume}>
                  {isTransferring ? <PauseCircle /> : <PlayCircle />}
                </IconButton>
              </Tooltip>
              <Tooltip title="传输速度限制">
                <IconButton onClick={() => onSpeedLimit?.(1024 * 1024)}>
                  <Speed />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <Speed sx={{ mr: 1 }} />
                <Typography variant="subtitle2">当前速度</Typography>
              </Box>
              <Typography variant="h6">{formatSpeed(stats.speed)}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <Assessment sx={{ mr: 1 }} />
                <Typography variant="subtitle2">平均速度</Typography>
              </Box>
              <Typography variant="h6">
                {formatSpeed(stats.averageSpeed)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <SignalCellularAlt sx={{ mr: 1 }} />
                <Typography variant="subtitle2">峰值速度</Typography>
              </Box>
              <Typography variant="h6">
                {formatSpeed(stats.peakSpeed)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <Assessment sx={{ mr: 1 }} />
                <Typography variant="subtitle2">剩余时间</Typography>
              </Box>
              <Typography variant="h6">
                {formatTime(stats.remainingTime)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Paper>
  );
};
