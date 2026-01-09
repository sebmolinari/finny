import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

// Prevent arrow keys from incrementing/decrementing number inputs
document.addEventListener("keydown", (e) => {
  if (
    e.target.type === "number" &&
    (e.key === "ArrowUp" || e.key === "ArrowDown")
  ) {
    e.preventDefault();
  }
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
