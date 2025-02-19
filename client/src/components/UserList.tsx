import React from "react";
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import { AccountCircle } from "@mui/icons-material";

interface Props {
  users: string[];
  currentUser: string;
}

export const UserList = ({ users, currentUser }: Props) => {
  return (
    <Paper
      sx={{
        width: "100%",
        height: "100%",
        overflow: "auto",
        borderRadius: 2,
      }}
    >
      <Typography
        variant="h6"
        sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}
      >
        在线用户 ({users.length})
      </Typography>
      <List>
        {users.map((user) => (
          <ListItem key={user}>
            <ListItemIcon>
              <AccountCircle
                color={user === currentUser ? "primary" : "inherit"}
              />
            </ListItemIcon>
            <ListItemText
              primary={user}
              sx={{
                "& .MuiListItemText-primary": {
                  color: user === currentUser ? "primary.main" : "inherit",
                  fontWeight: user === currentUser ? "bold" : "normal",
                },
              }}
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};
