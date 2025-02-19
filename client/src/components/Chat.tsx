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
} from "@mui/material";
import { Send } from "@mui/icons-material";
import "../styles/highlight.css";
import { socketService } from "../socket";
import { ChatMessage } from "./ChatMessage";
import { UserList } from "./UserList";
import { FileUpload } from "./FileUpload";
import { ChatHeader } from "./ChatHeader";
import { Message, UserInfo } from "../types";

interface Props {
  onToggleTheme: () => void;
  darkMode: boolean;
}

export const Chat = ({ onToggleTheme, darkMode }: Props) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
      // 更新当前用户的显示昵称
      const currentUserInfo = userList.find((u) => u.userId === currentUserId);
      if (currentUserInfo) {
        setCurrentUser(currentUserInfo.nickname);
      }
    });

    // 从localStorage获取初始昵称
    const savedNickname = localStorage.getItem("nickname");
    if (savedNickname) {
      setCurrentUser(savedNickname);
    }

    // 添加昵称更新事件监听
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

  const [isSending, setIsSending] = useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && !isSending) {
      setIsSending(true);
      try {
        await socketService.sendMessage(newMessage.trim());
        setNewMessage("");
      } finally {
        // 添加300ms延迟，防止快速重复发送
        setTimeout(() => {
          setIsSending(false);
        }, 300);
      }
    }
  };

  const displayMessages = searchTerm ? filteredMessages : messages;

  return (
    <Box
      sx={{
        height: "100vh",
        overflow: "hidden",
        width: "100%",
      }}
    >
      <Container
        maxWidth={false}
        sx={{
          height: "100%",
          p: { xs: 1, sm: 2 },
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
                borderRadius: 2,
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
                  p: 2,
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
                p: 2,
                display: "flex",
                flexDirection: "column",
                borderRadius: 2,
                overflow: "hidden",
                width: "100%",
              }}
            >
              <Box
                sx={{
                  display: "flex",
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
                  minRows={2}
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
            xs={12}
            sm={12}
            md={3}
            sx={{
              height: { xs: "300px", md: "100%" },
              order: { xs: 0, md: 1 },
              position: { xs: "fixed", md: "relative" },
              bottom: { xs: 0, md: "auto" },
              left: { xs: 0, md: "auto" },
              right: { xs: 0, md: "auto" },
              zIndex: { xs: 1100, md: 1 },
              bgcolor: "background.default",
              px: { xs: 1, md: 0 },
            }}
          >
            <Box
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <Box sx={{ flex: "0 0 40%" }}>
                <UserList users={users} currentUser={currentUserId} />
              </Box>
              <Box sx={{ flex: "0 0 60%" }}>
                <FileUpload />
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};
