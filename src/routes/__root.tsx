import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { PushListener } from "../components/PushListener";
import { BurgerMenu } from "../components/BurgerMenu";
import { APP_BUILD, APP_ICON, APP_NAME } from "../lib/app";

export const Route = createRootRoute({
  component: () => (
    <div className="app-shell">
      <PushListener />
      <header className="app-header">
        <BurgerMenu />
        <Link to="/" className="logo">
          <img src={APP_ICON} alt="" className="logo-icon" width={32} height={32} />
          {APP_NAME}
        </Link>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        {APP_NAME} · Build {APP_BUILD}
      </footer>
    </div>
  ),
});
