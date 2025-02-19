import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Container,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  useTheme,
} from "@mui/material";
import { Brightness4, Brightness7, Send } from "@mui/icons-material";
import { socketService } from "../socket";
import { ChatMessage } from "./ChatMessage";
import { UserList } from "./UserList";
import { FileUpload } from "./FileUpload";
import { Message } from "../types";

interface Props {
  onToggleTheme: () => void;
  darkMode: boolean;
}

export const Chat = ({ onToggleTheme, darkMode }: Props) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<string[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();

  useEffect(() => {
    const connect = async () => {
      try {
        const userId = await socketService.connect();
        setCurrentUser(userId);
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
    });

    return () => {
      unsubscribeMessage();
      unsubscribeUsers();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      socketService.sendMessage(newMessage.trim());
      setNewMessage("");
    }
  };

  return (
    <Container maxWidth="xl" sx={{ height: "100vh", py: 2 }}>
      <Grid container spacing={2} sx={{ height: "100%" }}>
        <Grid
          item
          xs={9}
          sx={{ height: "100%", display: "flex", flexDirection: "column" }}
        >
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
            <IconButton onClick={onToggleTheme}>
              {darkMode ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Box>
          <Paper
            sx={{
              flex: 1,
              mb: 2,
              p: 2,
              overflow: "auto",
              bgcolor: "background.default",
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isCurrentUser={message.user === currentUser}
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
              alignItems: "center",
              borderRadius: 2,
            }}
          >
            <TextField
              fullWidth
              variant="outlined"
              placeholder="输入消息..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton type="submit" disabled={!newMessage.trim()}>
                      <Send />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Paper>
        </Grid>
        <Grid item xs={3} sx={{ height: "100%" }}>
          <Box
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <Box sx={{ flex: "0 0 40%" }}>
              <UserList users={users} currentUser={currentUser} />
            </Box>
            <Box sx={{ flex: "0 0 60%" }}>
              <FileUpload />
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};
