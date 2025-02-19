import React, { useState, useEffect, createContext } from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { theme, darkTheme } from "./theme";
import { Chat } from "./components/Chat";
import { socketService } from "./socket";

// 创建 UserContext
export const UserContext = createContext<{ userId: string | null }>({
  userId: null,
});

export function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // 根据暗色模式更新document属性
    document.documentElement.setAttribute(
      "data-theme",
      darkMode ? "dark" : "light"
    );
  }, [darkMode]);

  useEffect(() => {
    socketService.connect().then(setUserId);
    return () => {
      socketService.disconnect();
    };
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <UserContext.Provider value={{ userId }}>
      <ThemeProvider theme={darkMode ? darkTheme : theme}>
        <CssBaseline />
        <Chat onToggleTheme={toggleDarkMode} darkMode={darkMode} />
      </ThemeProvider>
    </UserContext.Provider>
  );
}
