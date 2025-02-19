import React from "react";
import {
  Box,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import { UserInfo } from "../types";

interface Props {
  users: UserInfo[];
  currentUser: string;
}

export const UserList = ({ users, currentUser }: Props) => {
  return (
    <Paper
      sx={{
        height: "100%",
        borderRadius: 2,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Typography variant="h6" sx={{ fontSize: "1rem" }}>
          在线用户 ({users.length})
        </Typography>
      </Box>
      <List sx={{ overflow: "auto", flexGrow: 1, p: 0 }}>
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
            })}
          >
            <ListItemText
              primary={user.nickname}
              secondary={user.userId === currentUser ? "(我)" : ""}
              sx={{
                "& .MuiListItemText-primary": {
                  fontSize: "0.875rem",
                },
                "& .MuiListItemText-secondary": {
                  fontSize: "0.75rem",
                },
              }}
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};
