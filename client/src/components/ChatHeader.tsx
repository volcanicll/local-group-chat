import React, { useState } from "react";
import {
  Box,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  useTheme,
} from "@mui/material";
import {
  Brightness4,
  Brightness7,
  Search,
  Clear,
  Edit,
} from "@mui/icons-material";
import { socketService } from "../socket";
import axios from "axios";

interface Props {
  onToggleTheme: () => void;
  darkMode: boolean;
  onSearch: (term: string) => void;
  usersCount: number;
  currentUser: string;
}

export const ChatHeader = ({
  onToggleTheme,
  darkMode,
  onSearch,
  usersCount,
  currentUser,
}: Props) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showNickname, setShowNickname] = useState(false);
  const [nickname, setNickname] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const theme = useTheme();

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    onSearch(value);
  };

  const handleUpdateNickname = async () => {
    if (!nickname.trim()) return;

    try {
      await socketService.updateNickname(nickname.trim());
      setShowNickname(false);
      setNickname("");
    } catch (error) {
      console.error("Failed to update nickname:", error);
    }
  };

  return (
    <>
      <Box
        sx={{
          p: 1,
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="h6" sx={{ fontSize: "1rem" }}>
            局域网群聊
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
            }}
          >
            在线用户: {usersCount}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1 }}>
          {isSearching ? (
            <TextField
              size="small"
              fullWidth
              placeholder="搜索消息..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setIsSearching(false);
                        handleSearch("");
                      }}
                    >
                      <Clear fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          ) : (
            <IconButton size="small" onClick={() => setIsSearching(true)}>
              <Search fontSize="small" />
            </IconButton>
          )}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Tooltip title="修改昵称">
            <IconButton size="small" onClick={() => setShowNickname(true)}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={`当前用户: ${currentUser}`}>
            <Typography variant="caption" color="text.secondary">
              {currentUser}
            </Typography>
          </Tooltip>
          <IconButton onClick={onToggleTheme} size="small">
            {darkMode ? (
              <Brightness7 fontSize="small" />
            ) : (
              <Brightness4 fontSize="small" />
            )}
          </IconButton>
        </Box>
      </Box>

      <Dialog open={showNickname} onClose={() => setShowNickname(false)}>
        <DialogTitle>修改昵称</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="新昵称"
            fullWidth
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNickname(false)}>取消</Button>
          <Button onClick={handleUpdateNickname}>确定</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
