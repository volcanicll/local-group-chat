import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Container,
  Grid,
  InputAdornment,
  Paper,
  TextField,
  Tooltip,
  Typography,
  IconButton,
  Drawer,
  Fab,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Send, Menu, Close } from "@mui/icons-material";
import "../styles/highlight.css";
import { socketService } from "../socket";
import { ChatMessage } from "./ChatMessage";
import { UserList } from "./UserList";
import { FileUpload } from "./FileUpload";
import { ChatHeader } from "./ChatHeader";
import { Message, UserInfo } from "../types";
import { VideoCall } from "./VideoCall";
import { webRTCManager } from "../lib/webrtc-manager";

interface Props {
  onToggleTheme: () => void;
  darkMode: boolean;
}

export const Chat = ({ onToggleTheme, darkMode }: Props) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [videoCallUserId, setVideoCallUserId] = useState<string | null>(null);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleVideoSignal = ({
      from,
      type,
    }: {
      from: string;
      type: string;
    }) => {
      if (type === "video") {
        setVideoCallUserId(from);
        setIsIncomingCall(true);
      }
    };

    socketService.onWebRTCSignal(handleVideoSignal);

    const connect = async () => {
      try {
        const userId = await socketService.connect();
        setCurrentUserId(userId);
      } catch (error) {
        console.error("Connection failed:", error);
      }
    };
    connect();

    return () => {
      socketService.disconnect();
    };
  }, []);

  useEffect(() => {
    const unsubscribeMessage = socketService.onMessage((message) => {
      setMessages((prev) => [...prev, message]);
    });

    const unsubscribeUsers = socketService.onUserListUpdate((userList) => {
      setUsers(userList);
      const currentUserInfo = userList.find((u) => u.userId === currentUserId);
      if (currentUserInfo) {
        setCurrentUser(currentUserInfo.nickname);
      }
    });

    const savedNickname = localStorage.getItem("nickname");
    if (savedNickname) {
      setCurrentUser(savedNickname);
    }

    const unsubscribeUserUpdate = socketService.onUserUpdate((data) => {
      if (data.userId === currentUserId) {
        setCurrentUser(data.nickname);
      }
    });

    return () => {
      unsubscribeMessage();
      unsubscribeUsers();
      unsubscribeUserUpdate();
    };
  }, [currentUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, filteredMessages]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = messages.filter(
        (msg) =>
          msg.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
          msg.user.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredMessages(filtered);
    } else {
      setFilteredMessages([]);
    }
  }, [searchTerm, messages]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      socketService.sendMessage(newMessage.trim());
      setNewMessage("");
    }
  };

  const handleInitiateCall = (targetUserId: string) => {
    setVideoCallUserId(targetUserId);
    setIsIncomingCall(false);
    if (isMobile) {
      setDrawerOpen(false);
    }
  };

  const handleEndCall = () => {
    setVideoCallUserId(null);
    setIsIncomingCall(false);
  };

  const displayMessages = searchTerm ? filteredMessages : messages;

  const sidebarContent = (
    <Box
      sx={{
        height: isMobile ? "auto" : "100%",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <Box sx={{ flex: isMobile ? "none" : "0 0 40%" }}>
        <UserList
          users={users}
          currentUser={currentUserId}
          onInitiateCall={handleInitiateCall}
        />
      </Box>
      <Box sx={{ flex: isMobile ? "none" : "0 0 60%" }}>
        <FileUpload />
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        height: "100vh",
        overflow: "hidden",
        width: "100%",
        position: "relative",
      }}
    >
      <Container
        maxWidth={false}
        sx={{
          height: "100%",
          p: { xs: 0.5, sm: 2 },
          display: "flex",
        }}
      >
        <Grid
          container
          spacing={2}
          sx={{
            height: "100%",
            maxWidth: "1600px",
            mx: "auto",
            width: "100%",
          }}
        >
          <Grid
            item
            xs={12}
            md={9}
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
            }}
          >
            <Paper
              sx={{
                flex: 1,
                mb: 2,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                bgcolor: "background.default",
                borderRadius: { xs: 0, sm: 2 },
                width: "100%",
              }}
            >
              <ChatHeader
                onToggleTheme={onToggleTheme}
                darkMode={darkMode}
                onSearch={handleSearch}
                usersCount={users.length}
                currentUser={currentUser}
              />
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  p: { xs: 1, sm: 2 },
                  flex: 1,
                  overflowY: "auto",
                  overflowX: "hidden",
                  width: "100%",
                }}
              >
                {displayMessages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isCurrentUser={message.userId === currentUserId}
                  />
                ))}
                <div ref={messagesEndRef} />
              </Box>
            </Paper>
            <Paper
              component="form"
              onSubmit={handleSendMessage}
              sx={{
                p: { xs: 1, sm: 2 },
                display: "flex",
                flexDirection: "column",
                borderRadius: { xs: 0, sm: 2 },
                overflow: "hidden",
                width: "100%",
              }}
            >
              <Box
                sx={{
                  display: { xs: "none", sm: "flex" },
                  alignItems: "center",
                  gap: 1,
                  px: 1,
                  py: 0.5,
                  borderBottom: 1,
                  borderColor: "divider",
                }}
              >
                <Tooltip title="普通文本支持换行和空格。使用 ```语言名 包裹代码，例如：```javascript 代码 ```">
                  <Typography variant="caption" color="text.secondary">
                    💡 提示：Shift + Enter 换行 | 支持代码高亮
                  </Typography>
                </Tooltip>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", p: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  variant="outlined"
                  placeholder="输入消息..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  multiline
                  minRows={isMobile ? 1 : 2}
                  maxRows={8}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (newMessage.trim()) {
                        handleSendMessage(e as any);
                      }
                    }
                  }}
                  sx={{
                    "& .MuiInputBase-root": {
                      fontFamily: "monospace",
                    },
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end" sx={{ mr: -0.5 }}>
                        <IconButton
                          type="submit"
                          disabled={!newMessage.trim()}
                          color="primary"
                          size="small"
                        >
                          <Send fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
            </Paper>
          </Grid>
          <Grid
            item
            md={3}
            sx={{ height: "100%", display: { xs: "none", md: "block" } }}
          >
            {sidebarContent}
          </Grid>
        </Grid>
      </Container>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: "85%",
            maxWidth: 360,
            bgcolor: "background.default",
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
            <IconButton onClick={() => setDrawerOpen(false)}>
              <Close />
            </IconButton>
          </Box>
          {sidebarContent}
        </Box>
      </Drawer>

      {/* Mobile drawer toggle button */}
      <Fab
        color="primary"
        onClick={() => setDrawerOpen(true)}
        sx={{
          position: "fixed",
          bottom: 16,
          right: 16,
          display: { xs: "flex", md: "none" },
          boxShadow: 3,
        }}
      >
        <Menu />
      </Fab>

      {videoCallUserId && (
        <VideoCall
          targetUserId={videoCallUserId}
          onEndCall={handleEndCall}
          isIncoming={isIncomingCall}
        />
      )}
    </Box>
  );
};
