import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { ErrorPage } from "./pages/ErrorPage";
import { Home } from "./pages/Home";
import { KliqTube } from "./pages/KliqTube";
import { Stream } from "./pages/Stream";
import { Marketplace } from "./pages/Marketplace";
import { Studio } from "./pages/Studio";
import { Wallet } from "./pages/Wallet";
import { Profile } from "./pages/Profile";
import { Amplify } from "./pages/Amplify";
import { Login } from "./pages/Login";
import { Friends } from "./pages/Friends";
import { Inbox } from "./pages/Inbox";
import { Create } from "./pages/Create";
import { Search } from "./pages/Search";
import { Community } from "./pages/Community";
import { Settings } from "./pages/Settings";
import { Analytics } from "./pages/Analytics";
import { UserProfile } from "./pages/UserProfile";
import { KliqTubeWatch } from "./pages/KliqTubeWatch";
import { KliqTubeChannel } from "./pages/KliqTubeChannel";
import { KliqStreamWatch } from "./pages/KliqStreamWatch";
import { KliqStreamMyList } from "./pages/KliqStreamMyList";
import { KliqStream } from "./pages/KliqStream";
import { KliqStreamShow } from "./pages/KliqStreamShow";
import { KliqStreamPlayer } from "./pages/KliqStreamPlayer";
import { CommunityChat } from "./pages/CommunityChat";
import { CommunityPost } from "./pages/CommunityPost";
import { CreateCommunity } from "./pages/CreateCommunity";
import { StoreProfile } from "./pages/StoreProfile";
import { CustomizeShop } from "./pages/CustomizeShop";
import { Payment } from "./pages/Payment";
import { ChatConversation } from "./pages/ChatConversation";
import { EditProfile } from "./pages/EditProfile";
import { LanguageRegion } from "./pages/LanguageRegion";
import { StoryViewer } from "./pages/StoryViewer";
import { Onboarding } from "./pages/Onboarding";
import { Communities } from "./pages/Communities";
import { GoLive } from "./pages/GoLive";
import { LiveViewer } from "./pages/LiveViewer";
import { PostDetail } from "./pages/PostDetail";
import { Explore } from "./pages/Explore";
import { HashtagPage } from "./pages/HashtagPage";
import { SavedPosts } from "./pages/SavedPosts";
import { MarketplaceSeller } from "./pages/MarketplaceSeller";
import { WalletHistory } from "./pages/WalletHistory";
import { KliqTubePlaylists } from "./pages/KliqTubePlaylists";
import { BlockedUsers } from "./pages/BlockedUsers";
import { MutedUsers } from "./pages/MutedUsers";
import { PrivacySettings } from "./pages/PrivacySettings";
import { NotificationPrefs } from "./pages/NotificationPrefs";
import { SoundsPage } from "./pages/SoundsPage";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { VerifyEmail } from "./pages/VerifyEmail";
import { GroupChatPage } from "./pages/GroupChatPage";

export const router = createBrowserRouter([
  { path: "/login", Component: Login, errorElement: <ErrorPage /> },
  { path: "/onboarding", Component: Onboarding, errorElement: <ErrorPage /> },
  { path: "/forgot-password", Component: ForgotPassword, errorElement: <ErrorPage /> },
  { path: "/reset-password", Component: ResetPassword, errorElement: <ErrorPage /> },
  { path: "/verify-email", Component: VerifyEmail, errorElement: <ErrorPage /> },
  { path: "/story/:username", Component: StoryViewer, errorElement: <ErrorPage /> },
  { path: "/stream/watch/:id", Component: KliqStreamWatch, errorElement: <ErrorPage /> },
  { path: "/kliqstream/watch/:id", Component: KliqStreamPlayer, errorElement: <ErrorPage /> },
  {
    path: "/",
    Component: Layout,
    errorElement: <ErrorPage />,
    children: [
      { index: true, Component: Home },
      { path: "friends", Component: Friends },
      { path: "inbox", Component: Inbox },
      { path: "create", Component: Create },
      { path: "search", Component: Search },
      { path: "klixtube", Component: KliqTube },
      { path: "klixtube/watch/:id", Component: KliqTubeWatch },
      { path: "klixtube/channel/:username", Component: KliqTubeChannel },
      { path: "stream", Component: Stream },
      { path: "stream/mylist", Component: KliqStreamMyList },
      { path: "kliqstream", Component: KliqStream },
      { path: "kliqstream/:id", Component: KliqStreamShow },
      { path: "marketplace", Component: Marketplace },
      { path: "marketplace/seller", Component: MarketplaceSeller },
      { path: "studio", Component: Studio },
      { path: "wallet", Component: Wallet },
      { path: "profile", Component: Profile },
      { path: "amplify", Component: Amplify },
      { path: "community", Component: Community },
      { path: "communities", Component: Communities },
      { path: "community/post/:id", Component: CommunityPost },
      { path: "community/:id", Component: CommunityChat },
      { path: "create-community", Component: CreateCommunity },
      { path: "settings", Component: Settings },
      { path: "settings/language", Component: LanguageRegion },
      { path: "analytics", Component: Analytics },
      { path: "user/:username", Component: UserProfile },
      { path: "store/:id", Component: StoreProfile },
      { path: "customize-shop", Component: CustomizeShop },
      { path: "payment", Component: Payment },
      { path: "chat/:id", Component: ChatConversation },
      { path: "edit-profile", Component: EditProfile },
      { path: "go-live", Component: GoLive },
      { path: "live/:username", Component: LiveViewer },
      { path: "post/:id", Component: PostDetail },
      { path: "explore", Component: Explore },
      { path: "hashtag/:name", Component: HashtagPage },
      { path: "saved", Component: SavedPosts },
      { path: "wallet/history", Component: WalletHistory },
      { path: "klixtube/playlists", Component: KliqTubePlaylists },
      { path: "blocked-users", Component: BlockedUsers },
      { path: "muted-users", Component: MutedUsers },
      { path: "privacy-settings", Component: PrivacySettings },
      { path: "notification-prefs", Component: NotificationPrefs },
      { path: "sounds", Component: SoundsPage },
      { path: "groups/:id", Component: GroupChatPage },
    ],
  },
]);
