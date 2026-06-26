import { createBrowserRouter, RouterProvider, Outlet } from "react-router";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { ThemeProvider } from "./context/ThemeContext";
import { Dashboard } from "./pages/Dashboard";
import { Users } from "./pages/Users";
import { Content } from "./pages/Content";
import { Communities } from "./pages/Communities";
import { Analytics } from "./pages/Analytics";
import { Messages } from "./pages/Messages";
import { Notifications } from "./pages/Notifications";
import { AppSettings } from "./pages/AppSettings";
import { AdminProfile } from "./pages/AdminProfile";
import { AdminPreferences } from "./pages/AdminPreferences";
import { ActivityLog } from "./pages/ActivityLog";
import { AdminLogin } from "./pages/AdminLogin";
import { AnalyticsUserBehavior } from "./pages/AnalyticsUserBehavior";
import { AnalyticsEngagement } from "./pages/AnalyticsEngagement";
import { AnalyticsContentHealth } from "./pages/AnalyticsContentHealth";
import { AnalyticsTechnical } from "./pages/AnalyticsTechnical";
import { AnalyticsGrowth } from "./pages/AnalyticsGrowth";
import { AnalyticsMonetization } from "./pages/AnalyticsMonetization";
import { AnalyticsTrustSafety } from "./pages/AnalyticsTrustSafety";
import { UserAnalytics } from "./pages/UserAnalytics";
import { ModerationQueue } from "./pages/ModerationQueue";
import { RevenueDashboard } from "./pages/RevenueDashboard";
import { AutoModeration } from "./pages/AutoModeration";
import { KliqStreamCatalogue } from "./pages/KliqStreamCatalogue";
import { ReportsManagement } from "./pages/ReportsManagement";
import { LiveModeration } from "./pages/LiveModeration";
import { BadgeRequests } from "./pages/BadgeRequests";

function Layout() {
  return (
    <div className="flex h-screen bg-black overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 flex flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true,              Component: Dashboard        },
      { path: "users",            Component: Users            },
      { path: "content",          Component: Content          },
      { path: "communities",      Component: Communities      },
      { path: "analytics",        Component: Analytics        },
      { path: "messages",         Component: Messages         },
      { path: "notifications",    Component: Notifications    },
      { path: "settings",         Component: AppSettings      },
      { path: "profile",          Component: AdminProfile     },
      { path: "preferences",      Component: AdminPreferences },
      { path: "activity-log",     Component: ActivityLog      },
      { path: "analytics/user-behavior",  Component: AnalyticsUserBehavior  },
      { path: "analytics/engagement",     Component: AnalyticsEngagement    },
      { path: "analytics/content-health", Component: AnalyticsContentHealth },
      { path: "analytics/technical",      Component: AnalyticsTechnical     },
      { path: "analytics/growth",         Component: AnalyticsGrowth        },
      { path: "analytics/monetization",   Component: AnalyticsMonetization  },
      { path: "analytics/trust-safety",   Component: AnalyticsTrustSafety   },
      { path: "users/:id/analytics",      Component: UserAnalytics           },
      { path: "moderation",              Component: ModerationQueue         },
      { path: "revenue",                 Component: RevenueDashboard        },
      { path: "auto-moderation",         Component: AutoModeration          },
      { path: "kliqstream-catalogue",    Component: KliqStreamCatalogue     },
      { path: "reports",                 Component: ReportsManagement       },
      { path: "live-moderation",         Component: LiveModeration          },
      { path: "badge-requests",          Component: BadgeRequests           },
    ],
  },
  { path: "/login", Component: AdminLogin },
]);

export default function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}
