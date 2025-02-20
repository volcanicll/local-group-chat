import React, { useEffect, useRef, useState } from "react";
import { styled } from "@mui/material/styles";
import {
  Box,
  IconButton,
  Paper,
  Typography,
  useTheme,
  Dialog,
  useMediaQuery,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
} from "@mui/material";
import {
  Videocam,
  VideocamOff,
  Mic,
  MicOff,
  CallEnd,
  PhoneDisabled,
  SwitchCamera,
} from "@mui/icons-material";
import { webRTCManager } from "../lib/webrtc-manager";
import { socketService } from "../socket";

const VideoGrid = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: theme.spacing(2),
  padding: theme.spacing(1),
  height: "100%",
  boxSizing: "border-box",
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(0),
    gap: 0,
  },
}));

const VideoContainer = styled(Box)(({ theme }) => ({
  position: "relative",
  width: "100%",
  height: "100%",
  minHeight: "300px",
  backgroundColor: theme.palette.grey[900],
  borderRadius: theme.shape.borderRadius,
  overflow: "hidden",
  [theme.breakpoints.down("sm")]: {
    borderRadius: 0,
    minHeight: "100vh",
  },
}));

const Video = styled("video")({
  width: "100%",
  height: "100%",
  objectFit: "cover",
});

const LocalVideoOverlay = styled(Box, {
  shouldForwardProp: (prop) => prop !== "isMobile",
})<{ isMobile?: boolean }>(({ theme, isMobile }) => ({
  position: "absolute",
  bottom: theme.spacing(isMobile ? 12 : 2),
  right: theme.spacing(2),
  width: isMobile ? "100px" : "150px",
  height: isMobile ? "150px" : "100px",
  borderRadius: theme.shape.borderRadius,
  overflow: "hidden",
  boxShadow: theme.shadows[6],
  border: `2px solid ${theme.palette.primary.main}`,
  transition: "all 0.3s ease",
  "&:active": {
    transform: isMobile ? "scale(1.1)" : "none",
  },
}));

const ControlBar = styled(Paper, {
  shouldForwardProp: (prop) => prop !== "isMobile",
})<{ isMobile?: boolean }>(({ theme, isMobile }) => ({
  position: "fixed",
  bottom: isMobile ? 0 : theme.spacing(4),
  left: "50%",
  transform: "translateX(-50%)",
  display: "flex",
  gap: theme.spacing(2),
  padding: theme.spacing(isMobile ? 3 : 2),
  paddingBottom: isMobile ? theme.spacing(4) : theme.spacing(2),
  borderRadius: isMobile
    ? `${theme.shape.borderRadius}px ${theme.shape.borderRadius}px 0 0`
    : "50px",
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[6],
  zIndex: 1000,
  width: isMobile ? "100%" : "auto",
  justifyContent: "center",
}));

const StatusText = styled(Typography)(({ theme }) => ({
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  color: theme.palette.common.white,
  textAlign: "center",
  textShadow: "0 2px 4px rgba(0,0,0,0.5)",
}));

interface VideoCallProps {
  targetUserId: string | null;
  onEndCall: () => void;
  isIncoming?: boolean;
}

export const VideoCall: React.FC<VideoCallProps> = ({
  targetUserId,
  onEndCall,
  isIncoming = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isInitializingMedia, setIsInitializingMedia] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>(
    []
  );
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Error message timeout
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const enumerateDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );
      setAvailableCameras(videoDevices);
    } catch (err) {
      console.error("Failed to enumerate devices:", err);
      setError("无法获取摄像头列表");
    }
  };

  // Monitor device changes with error handling
  useEffect(() => {
    const handleDeviceChange = async () => {
      try {
        await enumerateDevices();
        if (
          currentCameraIndex >= availableCameras.length &&
          availableCameras.length > 0
        ) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: { exact: availableCameras[0].deviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: true,
          });

          if (localVideoRef.current) {
            const tracks =
              localVideoRef.current.srcObject instanceof MediaStream
                ? localVideoRef.current.srcObject.getTracks()
                : [];
            tracks.forEach((track) => track.stop());
            localVideoRef.current.srcObject = stream;
          }

          await webRTCManager.setMediaStream(stream);
          setCurrentCameraIndex(0);
        }
      } catch (err) {
        console.error("Failed to handle device change:", err);
        setError("摄像头切换失败");
      }
    };

    navigator.mediaDevices?.addEventListener(
      "devicechange",
      handleDeviceChange
    );
    return () => {
      navigator.mediaDevices?.removeEventListener(
        "devicechange",
        handleDeviceChange
      );
    };
  }, [availableCameras, currentCameraIndex]);

  const requestMediaPermissions = async () => {
    setIsInitializingMedia(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      await enumerateDevices();
      await webRTCManager.setMediaStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      if (targetUserId) {
        if (isIncoming) {
          await webRTCManager.acceptVideoCall(targetUserId);
        } else {
          await webRTCManager.startVideoCall(targetUserId);
        }
      }
      setShowPermissionDialog(false);
    } catch (err) {
      console.error("Failed to get media permissions:", err);
      setError("无法访问摄像头或麦克风");
      onEndCall();
    } finally {
      setIsInitializingMedia(false);
    }
  };

  useEffect(() => {
    const handleLocalStream = async (stream: MediaStream) => {
      try {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        await enumerateDevices();
      } catch (err) {
        console.error("Error handling local stream:", err);
        setError("本地视频流设置失败");
      }
    };

    const handleRemoteStream = ({ stream }: { stream: MediaStream }) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        setIsConnected(true);
      }
    };

    const handlePeerConnected = () => {
      setIsConnected(true);
      setIsReconnecting(false);
    };

    const handlePeerDisconnected = () => {
      setIsConnected(false);
      setError("对方已断开连接");
      onEndCall();
    };

    const handleWebRTCError = (error: { message: string; error: string }) => {
      console.error("WebRTC Error:", error);
      setError(error.message);
    };

    const handleSocketReconnect = () => {
      if (targetUserId && isConnected) {
        setIsReconnecting(true);
        webRTCManager.startVideoCall(targetUserId).catch((err) => {
          console.error("Failed to restart call after reconnection:", err);
          setError("重新连接失败，请重试");
          onEndCall();
        });
      }
    };

    webRTCManager.on("local-stream", handleLocalStream);
    webRTCManager.on("remote-stream", handleRemoteStream);
    webRTCManager.on("peer-connected", handlePeerConnected);
    webRTCManager.on("peer-disconnected", handlePeerDisconnected);
    socketService.onWebRTCError(handleWebRTCError);

    return () => {
      webRTCManager.removeAllListeners("local-stream");
      webRTCManager.removeAllListeners("remote-stream");
      webRTCManager.removeAllListeners("peer-connected");
      webRTCManager.removeAllListeners("peer-disconnected");
      if (targetUserId) {
        webRTCManager.endCall(targetUserId);
      }
    };
  }, [targetUserId, isIncoming, onEndCall, isConnected]);

  const handleToggleAudio = () => {
    const enabled = webRTCManager.toggleMute("audio");
    setIsAudioMuted(!enabled);
  };

  const handleToggleVideo = () => {
    const enabled = webRTCManager.toggleMute("video");
    setIsVideoMuted(!enabled);
  };

  const handleEndCall = () => {
    if (targetUserId) {
      webRTCManager.endCall(targetUserId);
    }
    onEndCall();
  };

  const handleToggleFullscreen = () => {
    if (!isConnected) return;
    setIsFullscreen(!isFullscreen);
  };

  const controlButtonStyle = {
    width: isMobile ? 56 : 48,
    height: isMobile ? 56 : 48,
    bgcolor: "background.paper",
    "&:hover": {
      bgcolor: "action.hover",
    },
  };

  return (
    <>
      <Snackbar
        open={!!error}
        autoHideDuration={5000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setError(null)}
          severity="error"
          sx={{ width: "100%" }}
        >
          {error}
        </Alert>
      </Snackbar>

      <Dialog
        open={showPermissionDialog}
        onClose={handleEndCall}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>访问摄像头和麦克风</DialogTitle>
        <DialogContent>
          <Typography>
            需要访问摄像头和麦克风来进行视频通话。请允许使用这些设备。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleEndCall}
            color="inherit"
            disabled={isInitializingMedia}
          >
            取消
          </Button>
          <Button
            onClick={requestMediaPermissions}
            variant="contained"
            disabled={isInitializingMedia}
            startIcon={
              isInitializingMedia && (
                <CircularProgress size={16} color="inherit" />
              )
            }
            autoFocus
          >
            {isInitializingMedia ? "初始化中..." : "允许"}
          </Button>
        </DialogActions>
      </Dialog>

      {!showPermissionDialog && (
        <Dialog
          open={true}
          maxWidth="lg"
          fullWidth
          fullScreen={isMobile || isFullscreen}
          PaperProps={{
            sx: {
              height: "80vh",
              bgcolor: theme.palette.grey[900],
              m: isMobile ? 0 : 2,
            },
          }}
        >
          <VideoGrid>
            <VideoContainer>
              <Video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                onClick={handleToggleFullscreen}
              />
              {(!isConnected || isReconnecting) && (
                <StatusText variant="h6">
                  {isReconnecting
                    ? "正在重新连接..."
                    : isIncoming
                    ? "接受通话中..."
                    : "呼叫中..."}
                </StatusText>
              )}
              <LocalVideoOverlay isMobile={isMobile}>
                <Video ref={localVideoRef} autoPlay playsInline muted />
              </LocalVideoOverlay>
            </VideoContainer>
          </VideoGrid>

          <ControlBar elevation={3} isMobile={isMobile}>
            <IconButton
              onClick={handleToggleAudio}
              sx={{
                ...controlButtonStyle,
                color: isAudioMuted ? "error.main" : "success.main",
              }}
            >
              {isAudioMuted ? <MicOff /> : <Mic />}
            </IconButton>
            <IconButton
              onClick={handleToggleVideo}
              sx={{
                ...controlButtonStyle,
                color: isVideoMuted ? "error.main" : "success.main",
              }}
            >
              {isVideoMuted ? <VideocamOff /> : <Videocam />}
            </IconButton>
            {isMobile && availableCameras.length > 1 && (
              <IconButton
                onClick={async () => {
                  try {
                    setIsSwitchingCamera(true);
                    const nextIndex =
                      (currentCameraIndex + 1) % availableCameras.length;
                    const nextCamera = availableCameras[nextIndex];

                    const stream = await navigator.mediaDevices.getUserMedia({
                      video: {
                        deviceId: { exact: nextCamera.deviceId },
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                      },
                      audio: true,
                    });

                    if (localVideoRef.current) {
                      const tracks =
                        localVideoRef.current.srcObject instanceof MediaStream
                          ? localVideoRef.current.srcObject.getTracks()
                          : [];
                      tracks.forEach((track) => track.stop());
                      localVideoRef.current.srcObject = stream;
                    }

                    await webRTCManager.setMediaStream(stream);
                    if (targetUserId) {
                      await webRTCManager.startVideoCall(targetUserId);
                    }
                    setCurrentCameraIndex(nextIndex);
                  } catch (err) {
                    console.error("Failed to switch camera:", err);
                    setError("切换摄像头失败");
                  } finally {
                    setIsSwitchingCamera(false);
                  }
                }}
                sx={controlButtonStyle}
                disabled={isSwitchingCamera}
              >
                {isSwitchingCamera ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  <SwitchCamera />
                )}
              </IconButton>
            )}
            <IconButton
              onClick={handleEndCall}
              sx={{
                ...controlButtonStyle,
                bgcolor: "error.main",
                color: "common.white",
                "&:hover": {
                  bgcolor: "error.dark",
                },
              }}
            >
              {isConnected ? <CallEnd /> : <PhoneDisabled />}
            </IconButton>
          </ControlBar>
        </Dialog>
      )}
    </>
  );
};
