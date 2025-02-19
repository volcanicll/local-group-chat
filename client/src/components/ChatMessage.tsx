import { Box, Paper, Typography } from "@mui/material";
import { Message } from "../types";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface Props {
  message: Message;
  isCurrentUser: boolean;
}

export const ChatMessage = ({ message, isCurrentUser }: Props) => {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: isCurrentUser ? "flex-end" : "flex-start",
        mb: 1,
      }}
    >
      <Paper
        elevation={1}
        sx={{
          p: 1,
          maxWidth: "70%",
          backgroundColor: isCurrentUser ? "primary.main" : "background.paper",
          color: isCurrentUser ? "white" : "text.primary",
          borderRadius: 2,
        }}
      >
        <Typography
          variant="caption"
          component="div"
          color={isCurrentUser ? "inherit" : "text.secondary"}
        >
          {message.user}
        </Typography>
        <Typography variant="body1" sx={{ wordBreak: "break-word" }}>
          {message.text}
        </Typography>
        <Typography
          variant="caption"
          color={isCurrentUser ? "inherit" : "text.secondary"}
          sx={{ opacity: 0.8 }}
        >
          {format(new Date(message.timestamp), "HH:mm", { locale: zhCN })}
        </Typography>
      </Paper>
    </Box>
  );
};
