import { useState } from "react";
import { Menu, Upload, CheckCircle, Clock, XCircle, Edit, Video } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { ActionPanel } from "../components/ActionPanel";

const submissions = [
  {
    id: 1,
    title: "My Awesome Video",
    status: "approved",
    type: "Video",
    date: "2 days ago",
    views: "12.3K",
  },
  {
    id: 2,
    title: "Product Review",
    status: "pending",
    type: "Video",
    date: "1 day ago",
    views: "-",
  },
  {
    id: 3,
    title: "Tutorial Series Ep 1",
    status: "rejected",
    type: "Video",
    date: "3 days ago",
    reason: "Audio quality issues",
  },
];

export function Studio() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "approved" | "pending" | "rejected">("all");

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case "rejected":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "text-green-500 bg-green-500/10";
      case "pending":
        return "text-yellow-500 bg-yellow-500/10";
      case "rejected":
        return "text-red-500 bg-red-500/10";
      default:
        return "text-gray-500 bg-gray-500/10";
    }
  };

  const filteredSubmissions = activeTab === "all"
    ? submissions
    : submissions.filter((s) => s.status === activeTab);

  return (
    <div className="min-h-screen bg-black pb-16">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-black/80 backdrop-blur-md z-40 border-b border-gray-800">
        <div className="flex items-center justify-between p-4 max-w-lg mx-auto">
          <button onClick={() => setIsPanelOpen(true)}>
            <Menu className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl text-white">Kliq Studio</h1>
          <button className="p-2 bg-purple-600 rounded-lg">
            <Upload className="w-5 h-5 text-white" />
          </button>
        </div>
      </header>

      <div className="pt-14">
        {/* Overview Cards */}
        <div className="grid grid-cols-3 gap-3 p-4">
          <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg text-center">
            <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <div className="text-2xl text-white">
              {submissions.filter((s) => s.status === "approved").length}
            </div>
            <div className="text-green-500 text-xs">Approved</div>
          </div>
          <div className="p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg text-center">
            <Clock className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
            <div className="text-2xl text-white">
              {submissions.filter((s) => s.status === "pending").length}
            </div>
            <div className="text-yellow-500 text-xs">Pending</div>
          </div>
          <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg text-center">
            <XCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <div className="text-2xl text-white">
              {submissions.filter((s) => s.status === "rejected").length}
            </div>
            <div className="text-red-500 text-xs">Rejected</div>
          </div>
        </div>

        {/* Upload Button */}
        <div className="p-4">
          <button className="w-full p-6 border-2 border-dashed border-gray-700 rounded-lg hover:border-purple-500 transition group">
            <Upload className="w-12 h-12 text-gray-500 group-hover:text-purple-500 mx-auto mb-2 transition" />
            <div className="text-white mb-1">Upload New Content</div>
            <div className="text-gray-400 text-sm">Submit for review and approval</div>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto px-4 gap-2 border-b border-gray-800">
          {["all", "approved", "pending", "rejected"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-3 capitalize whitespace-nowrap ${
                activeTab === tab
                  ? "text-white border-b-2 border-white"
                  : "text-gray-400"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Submissions List */}
        <div className="p-4 space-y-3">
          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No {activeTab !== "all" ? activeTab : ""} submissions
            </div>
          ) : (
            filteredSubmissions.map((submission) => (
              <div
                key={submission.id}
                className="bg-gray-900/30 border border-gray-800 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-24 aspect-video bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded flex items-center justify-center">
                    <Video className="w-8 h-8 text-white/50" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white mb-1">{submission.title}</h3>
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(submission.status)}
                      <span className={`text-xs px-2 py-1 rounded capitalize ${getStatusColor(submission.status)}`}>
                        {submission.status}
                      </span>
                    </div>
                    <div className="text-gray-400 text-xs">
                      {submission.date}
                      {submission.views && ` • ${submission.views} views`}
                    </div>
                  </div>
                </div>

                {submission.status === "rejected" && submission.reason && (
                  <div className="bg-red-900/20 border border-red-700 rounded p-3">
                    <div className="text-red-400 text-xs mb-1">Rejection Reason</div>
                    <div className="text-white text-sm">{submission.reason}</div>
                  </div>
                )}

                <div className="flex gap-2">
                  {submission.status === "rejected" && (
                    <button className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition text-sm flex items-center justify-center gap-2">
                      <Edit className="w-4 h-4" />
                      Edit & Resubmit
                    </button>
                  )}
                  {submission.status === "approved" && (
                    <button className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded transition text-sm">
                      View Analytics
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <BottomNav />
      <ActionPanel isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)} />
    </div>
  );
}
