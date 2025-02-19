window.global = window;

import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./index.css";
import "highlight.js/styles/github.css";
import "./styles/highlight.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
