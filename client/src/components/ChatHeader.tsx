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
  useMediaQuery,
  Popover,
} from "@mui/material";
import {
  Brightness4,
  Brightness7,
  Search,
  Clear,
  Edit,
  MoreVert,
  Close,
} from "@mui/icons-material";
import { socketService } from "../socket";

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [searchTerm, setSearchTerm] = useState("");
  const [showNickname, setShowNickname] = useState(false);
  const [nickname, setNickname] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

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

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <Box
        sx={{
          p: { xs: 1, sm: 2 },
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: { xs: 1, sm: 2 },
          minHeight: { xs: 56, sm: 64 },
          bgcolor: "background.paper",
        }}
      >
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}
        >
          <Typography
            variant="h6"
            sx={{
              fontSize: { xs: "0.9rem", sm: "1rem" },
              display: "flex",
              alignItems: "center",
            }}
          >
            局域网群聊
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                ml: 1,
                display: { xs: "none", sm: "inline" },
              }}
            >
              ({usersCount}人在线)
            </Typography>
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flex: { xs: 1, sm: "0 1 300px" },
            justifyContent: "flex-end",
          }}
        >
          {isSearching ? (
            <TextField
              size="small"
              fullWidth
              placeholder="搜索消息..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setIsSearching(false);
                        handleSearch("");
                      }}
                    >
                      <Close fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiInputBase-root": {
                  height: 36,
                },
              }}
            />
          ) : (
            <>
              <IconButton size="small" onClick={() => setIsSearching(true)}>
                <Search fontSize="small" />
              </IconButton>
              {!isMobile && (
                <>
                  <Tooltip title="修改昵称">
                    <IconButton
                      size="small"
                      onClick={() => setShowNickname(true)}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={`当前用户: ${currentUser}`}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        maxWidth: 120,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
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
                </>
              )}
              {isMobile && (
                <IconButton size="small" onClick={handleMenuOpen}>
                  <MoreVert fontSize="small" />
                </IconButton>
              )}
            </>
          )}
        </Box>
      </Box>

      {/* Mobile Menu */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <Box sx={{ p: 1, display: "flex", flexDirection: "column", gap: 1 }}>
          <Button
            startIcon={<Edit />}
            onClick={() => {
              setShowNickname(true);
              handleMenuClose();
            }}
            fullWidth
          >
            修改昵称 ({currentUser})
          </Button>
          <Button
            startIcon={darkMode ? <Brightness7 /> : <Brightness4 />}
            onClick={() => {
              onToggleTheme();
              handleMenuClose();
            }}
            fullWidth
          >
            切换主题
          </Button>
        </Box>
      </Popover>

      {/* Nickname Dialog */}
      <Dialog
        open={showNickname}
        onClose={() => setShowNickname(false)}
        fullWidth
        maxWidth="xs"
      >
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
          <Button
            onClick={handleUpdateNickname}
            variant="contained"
            color="primary"
          >
            确定
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
