import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { AppError } from "./components/AppError";
import { installStaleAssetRecovery } from "./lib/app-update";
import "./index.css";

installStaleAssetRecovery();

const router = createRouter({
  routeTree,
  defaultErrorComponent: AppError,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
