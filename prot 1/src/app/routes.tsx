import { createBrowserRouter } from "react-router";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Profile } from "./pages/Profile";
import { Inbox } from "./pages/Inbox";
import { Create } from "./pages/Create";
import { Stream } from "./pages/Stream";
import { Business } from "./pages/Business";
import { Studio } from "./pages/Studio";
import { Wallet } from "./pages/Wallet";
import { Amplify } from "./pages/Amplify";
import { Settings } from "./pages/Settings";
import { Friends } from "./pages/Friends";
import { Search } from "./pages/Search";
import { Community } from "./pages/Community";
import { Analytics } from "./pages/Analytics";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Login,
  },
  {
    path: "/home",
    Component: Home,
  },
  {
    path: "/profile",
    Component: Profile,
  },
  {
    path: "/friends",
    Component: Friends,
  },
  {
    path: "/create",
    Component: Create,
  },
  {
    path: "/inbox",
    Component: Inbox,
  },
  {
    path: "/search",
    Component: Search,
  },
  {
    path: "/stream",
    Component: Stream,
  },
  {
    path: "/business",
    Component: Business,
  },
  {
    path: "/studio",
    Component: Studio,
  },
  {
    path: "/wallet",
    Component: Wallet,
  },
  {
    path: "/amplify",
    Component: Amplify,
  },
  {
    path: "/analytics",
    Component: Analytics,
  },
  {
    path: "/community",
    Component: Community,
  },
  {
    path: "/settings",
    Component: Settings,
  },
]);
