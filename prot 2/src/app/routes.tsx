import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Stream } from "./pages/Stream";
import { Marketplace } from "./pages/Marketplace";
import { Studio } from "./pages/Studio";
import { Wallet } from "./pages/Wallet";
import { Profile } from "./pages/Profile";
import { Amplify } from "./pages/Amplify";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: "stream", Component: Stream },
      { path: "marketplace", Component: Marketplace },
      { path: "studio", Component: Studio },
      { path: "wallet", Component: Wallet },
      { path: "profile", Component: Profile },
      { path: "amplify", Component: Amplify },
    ],
  },
]);
