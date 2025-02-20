import React from "react";
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  Avatar,
  ListItemAvatar,
  Tooltip,
} from "@mui/material";
import {
  VideoCall as VideoCallIcon,
  MoreVert,
  Person,
} from "@mui/icons-material";
import { UserInfo } from "../types";

interface Props {
  users: UserInfo[];
  currentUser: string;
  onInitiateCall?: (targetUserId: string) => void;
}

export const UserList = ({ users, currentUser, onInitiateCall }: Props) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(
    null
  );

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    userId: string
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedUserId(userId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedUserId(null);
  };

  const handleVideoCall = () => {
    if (selectedUserId && onInitiateCall) {
      onInitiateCall(selectedUserId);
    }
    handleMenuClose();
  };

  // 生成用户头像背景色
  const getAvatarColor = (userId: string): string => {
    const colors = [
      "#1976d2",
      "#388e3c",
      "#d32f2f",
      "#7b1fa2",
      "#ff9800",
      "#0288d1",
      "#536dfe",
    ];
    const index = userId
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  return (
    <Paper
      sx={{
        height: "100%",
        borderRadius: isMobile ? 0 : 2,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: isMobile ? "none" : undefined,
      }}
    >
      <Box
        sx={{
          p: { xs: 1.5, sm: 2 },
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontSize: { xs: "0.9rem", sm: "1rem" },
            fontWeight: 500,
          }}
        >
          在线用户 ({users.length})
        </Typography>
      </Box>

      <List
        sx={{
          overflow: "auto",
          flexGrow: 1,
          p: 0,
          "& .MuiListItem-root": {
            px: { xs: 1.5, sm: 2 },
            py: { xs: 1, sm: 1.5 },
          },
        }}
      >
        {users.map((user) => (
          <ListItem
            key={user.userId}
            sx={(theme) => ({
              borderBottom: 1,
              borderColor: "divider",
              bgcolor:
                user.userId === currentUser
                  ? theme.palette.action.selected
                  : "transparent",
              "&:hover": {
                bgcolor: theme.palette.action.hover,
              },
              transition: "background-color 0.2s",
            })}
          >
            <ListItemAvatar>
              <Avatar
                sx={{
                  bgcolor: getAvatarColor(user.userId),
                  width: { xs: 36, sm: 40 },
                  height: { xs: 36, sm: 40 },
                }}
              >
                <Person />
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography
                    sx={{
                      fontSize: { xs: "0.9rem", sm: "1rem" },
                      fontWeight: user.userId === currentUser ? 500 : 400,
                    }}
                  >
                    {user.nickname}
                  </Typography>
                  {user.userId === currentUser && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: "primary.main",
                        fontSize: "0.75rem",
                      }}
                    >
                      (我)
                    </Typography>
                  )}
                </Box>
              }
              secondary={
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    fontSize: "0.75rem",
                  }}
                >
                  {user.userId}
                </Typography>
              }
            />
            {user.userId !== currentUser && (
              <ListItemSecondaryAction>
                {isMobile ? (
                  <IconButton
                    edge="end"
                    onClick={(e) => handleMenuOpen(e, user.userId)}
                    sx={{
                      color: "action.active",
                      "&:hover": { color: "primary.main" },
                    }}
                  >
                    <MoreVert />
                  </IconButton>
                ) : (
                  <Tooltip title="发起视频通话">
                    <IconButton
                      edge="end"
                      onClick={() => onInitiateCall?.(user.userId)}
                      sx={{
                        color: "action.active",
                        "&:hover": { color: "primary.main" },
                      }}
                    >
                      <VideoCallIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </ListItemSecondaryAction>
            )}
          </ListItem>
        ))}
      </List>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        PaperProps={{
          elevation: 3,
          sx: {
            minWidth: 150,
            mt: 0.5,
          },
        }}
      >
        <MenuItem onClick={handleVideoCall} dense>
          <VideoCallIcon fontSize="small" sx={{ mr: 1.5 }} />
          视频通话
        </MenuItem>
      </Menu>
    </Paper>
  );
};
