import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Login from "./assets/pages/Login.jsx";
import AgilPhone from "./assets/pages/AgilPhone.jsx";
import MyErrorBoundary from "./assets/components/MyErrorBoundary";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
    //loader: exemploLoader,
    errorElement: <MyErrorBoundary />,
  },
  {
    path: "/agilphone",
    element: <AgilPhone />,
    // loader: exemploLoader,
    errorElement: <MyErrorBoundary />,
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
