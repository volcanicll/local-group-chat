import { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  useTheme,
} from "@mui/material";
import { Message } from "../types";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { ContentCopy, Check } from "@mui/icons-material";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";
import { CopyToClipboard } from "react-copy-to-clipboard";

interface Props {
  message: Message;
  isCurrentUser: boolean;
}

export const ChatMessage = ({ message, isCurrentUser }: Props) => {
  const theme = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 渲染消息内容
  const renderContent = () => {
    if (message.isCode) {
      try {
        const highlightedCode = message.language
          ? hljs.highlight(message.text, { language: message.language }).value
          : hljs.highlightAuto(message.text).value;

        return (
          <Box sx={{ position: "relative" }}>
            <pre
              style={{
                margin: 0,
                padding: theme.spacing(1),
                backgroundColor:
                  theme.palette.mode === "dark" ? "#1E1E1E" : "#F5F5F5",
                borderRadius: theme.shape.borderRadius,
                width: "100%",
                maxWidth: "100%",
                overflowX: "hidden",
              }}
            >
              <code
                dangerouslySetInnerHTML={{ __html: highlightedCode }}
                style={{
                  fontFamily: "monospace",
                  fontSize: "0.875rem",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  width: "100%",
                }}
              />
            </pre>
          </Box>
        );
      } catch (error) {
        console.error("Code highlighting failed:", error);
        return message.text;
      }
    }

    // 普通文本消息，保持换行
    return message.text.split("\n").map((line, i) => (
      <Typography
        key={i}
        variant="body1"
        component="p"
        sx={{
          wordBreak: "break-word",
          whiteSpace: "pre-wrap",
          my: 0,
        }}
      >
        {line}
      </Typography>
    ));
  };

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
          maxWidth: { xs: "85%", sm: "70%" },
          backgroundColor: isCurrentUser ? "primary.main" : "background.paper",
          color: isCurrentUser ? "white" : "text.primary",
          borderRadius: theme.shape.borderRadius,
          transition: "all 0.2s",
          "&:hover": {
            transform: "translateY(-1px)",
            boxShadow: theme.shadows[2],
            "& .copy-button": {
              opacity: 1,
              transform: "translateX(0)",
            },
          },
        }}
      >
        <Typography
          variant="caption"
          component="div"
          color={isCurrentUser ? "inherit" : "text.secondary"}
          sx={{ mb: 0.5 }}
        >
          {message.user}
        </Typography>

        <Box sx={{ position: "relative" }}>
          {renderContent()}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mt: 1,
              opacity: 0,
              transition: "opacity 0.2s",
              "&:hover": {
                opacity: 1,
              },
            }}
          >
            <CopyToClipboard text={message.text} onCopy={handleCopy}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  cursor: "pointer",
                  color: isCurrentUser ? "inherit" : "text.secondary",
                  fontSize: "0.75rem",
                  "&:hover": {
                    color: isCurrentUser ? "white" : "primary.main",
                  },
                }}
              >
                {copied ? (
                  <>
                    <Check fontSize="small" />
                    <Typography variant="caption">已复制</Typography>
                  </>
                ) : (
                  <>
                    <ContentCopy fontSize="small" />
                    <Typography variant="caption">复制</Typography>
                  </>
                )}
              </Box>
            </CopyToClipboard>
            <Typography
              variant="caption"
              color={isCurrentUser ? "inherit" : "text.secondary"}
              sx={{ opacity: 0.8 }}
            >
              {format(new Date(message.timestamp), "HH:mm", { locale: zhCN })}
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};
