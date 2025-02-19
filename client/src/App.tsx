import React, { useState, useEffect } from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { theme, darkTheme } from "./theme";
import { Chat } from "./components/Chat";

export function App() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // 根据暗色模式更新document属性
    document.documentElement.setAttribute(
      "data-theme",
      darkMode ? "dark" : "light"
    );
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <ThemeProvider theme={darkMode ? darkTheme : theme}>
      <CssBaseline />
      <Chat onToggleTheme={toggleDarkMode} darkMode={darkMode} />
    </ThemeProvider>
  );
}
