import React, { useState, useCallback } from "react";
import {
  Box,
  IconButton,
  Paper,
  Typography,
  useTheme,
  useMediaQuery,
  Tooltip,
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

export const ChatMessage = React.memo(({ message, isCurrentUser }: Props) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const handleCopy = useCallback(() => {
    setCopied(true);
    // 移动端显示较短时间
    setTimeout(() => setCopied(false), isMobile ? 1000 : 2000);
  }, [isMobile]);

  const handlePress = useCallback(() => {
    setShowActions(true);
    // 移动端长按显示操作
    setTimeout(() => setShowActions(false), 3000);
  }, []);

  const renderCodeBlock = useCallback(() => {
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
              overflowX: "auto",
            }}
          >
            <code
              dangerouslySetInnerHTML={{ __html: highlightedCode }}
              style={{
                fontFamily: "monospace",
                fontSize: isMobile ? "0.75rem" : "0.875rem",
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
  }, [
    message.text,
    message.language,
    theme.palette.mode,
    theme.spacing,
    theme.shape.borderRadius,
    isMobile,
  ]);

  const renderContent = useCallback(() => {
    if (message.isCode) {
      return renderCodeBlock();
    }

    return message.text.split("\n").map((line, i) => (
      <Typography
        key={i}
        variant="body1"
        component="p"
        sx={{
          wordBreak: "break-word",
          whiteSpace: "pre-wrap",
          my: 0,
          fontSize: isMobile ? "0.9rem" : "1rem",
        }}
      >
        {line}
      </Typography>
    ));
  }, [message.isCode, message.text, isMobile, renderCodeBlock]);

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: isCurrentUser ? "flex-end" : "flex-start",
        mb: 1,
        mx: { xs: 0.5, sm: 1 },
      }}
    >
      <Paper
        elevation={1}
        onTouchStart={isMobile ? handlePress : undefined}
        sx={{
          p: { xs: 1, sm: 1.5 },
          maxWidth: { xs: "90%", sm: "75%", md: "70%" },
          backgroundColor: isCurrentUser ? "primary.main" : "background.paper",
          color: isCurrentUser ? "white" : "text.primary",
          borderRadius: theme.shape.borderRadius,
          transition: "all 0.2s",
          boxShadow: theme.shadows[1],
          "&:hover, &:active": {
            transform: !isMobile ? "translateY(-1px)" : "none",
            boxShadow: theme.shadows[2],
            "& .message-actions": {
              opacity: 1,
              transform: "translateY(0)",
            },
          },
        }}
      >
        <Typography
          variant="caption"
          component="div"
          color={isCurrentUser ? "inherit" : "text.secondary"}
          sx={{
            mb: 0.5,
            fontSize: isMobile ? "0.7rem" : "0.75rem",
            opacity: 0.9,
          }}
        >
          {message.user}
        </Typography>

        <Box sx={{ position: "relative" }}>
          {renderContent()}
          <Box
            className="message-actions"
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mt: 0.5,
              opacity: isMobile ? (showActions ? 1 : 0) : 0,
              transform: `translateY(${isMobile ? 0 : "5px"})`,
              transition: "all 0.2s ease",
              touchAction: "none",
            }}
          >
            <CopyToClipboard text={message.text} onCopy={handleCopy}>
              <Tooltip title={copied ? "已复制" : "复制内容"}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    cursor: "pointer",
                    color: isCurrentUser ? "inherit" : "text.secondary",
                    fontSize: isMobile ? "0.7rem" : "0.75rem",
                    opacity: 0.8,
                    "&:hover": {
                      opacity: 1,
                      color: isCurrentUser ? "white" : "primary.main",
                    },
                  }}
                >
                  {copied ? (
                    <Check fontSize="small" />
                  ) : (
                    <ContentCopy fontSize="small" />
                  )}
                  {!isMobile && (
                    <Typography variant="caption">
                      {copied ? "已复制" : "复制"}
                    </Typography>
                  )}
                </Box>
              </Tooltip>
            </CopyToClipboard>
            <Typography
              variant="caption"
              color={isCurrentUser ? "inherit" : "text.secondary"}
              sx={{
                opacity: 0.8,
                fontSize: isMobile ? "0.7rem" : "0.75rem",
                ml: 1,
              }}
            >
              {format(new Date(message.timestamp), "HH:mm", { locale: zhCN })}
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
});

ChatMessage.displayName = "ChatMessage";
