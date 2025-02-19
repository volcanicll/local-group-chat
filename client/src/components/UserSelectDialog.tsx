import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";
import { UserInfo } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (userId: string) => void;
  users: UserInfo[];
  currentUserId: string;
}

export const UserSelectDialog = ({
  open,
  onClose,
  onSelect,
  users,
  currentUserId,
}: Props) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Typography variant="h6">选择接收用户</Typography>
      </DialogTitle>
      <DialogContent>
        <List sx={{ pt: 0 }}>
          {users
            .filter((user) => user.userId !== currentUserId)
            .map((user) => (
              <ListItem
                button
                onClick={() => {
                  onSelect(user.userId);
                  onClose();
                }}
                key={user.userId}
                sx={(theme) => ({
                  "&:hover": {
                    bgcolor: theme.palette.action.hover,
                  },
                })}
              >
                <ListItemText
                  primary={user.nickname}
                  secondary={user.userId}
                  primaryTypographyProps={{
                    variant: "body1",
                  }}
                  secondaryTypographyProps={{
                    variant: "caption",
                  }}
                />
              </ListItem>
            ))}
          {users.filter((user) => user.userId !== currentUserId).length === 0 && (
            <ListItem>
              <ListItemText
                primary="没有其他在线用户"
                sx={{ textAlign: "center", color: "text.secondary" }}
              />
            </ListItem>
          )}
        </List>
      </DialogContent>
    </Dialog>
  );
};