// src/components/MyErrorBoundary.js
import React from "react";
import { useRouteError } from "react-router-dom";

function MyErrorBoundary() {
  const error = useRouteError();
  console.error("💥 Erro capturado pelo ErrorBoundary:", error);

  return (
    <div style={{ padding: "20px", color: "red" }}>
      <h1>Ops! Algo deu errado.</h1>
      <p>{error.statusText || error.message}</p>
    </div>
  );
}

export default MyErrorBoundary;
