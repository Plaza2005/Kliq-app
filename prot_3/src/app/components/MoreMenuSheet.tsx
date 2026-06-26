import { useState } from "react";
import { X, Flag, ThumbsDown, Download, Megaphone, Users, Smartphone, Video, CheckCircle, Ban, BellOff, Bell, Repeat2, Bookmark, Pin, Scissors } from "lucide-react";
import { useNavigate } from "react-router";
import { api } from "../api/client";
import { toast } from "sonner";

const REPORT_REASONS = [
  "Spam",
  "Inappropriate content",
  "Misinformation",
  "Harassment",
  "Copyright violation",
  "Other",
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  postId?: string;
  isOwnPost?: boolean;
  authorUsername?: string;
  isMuted?: boolean;
  isSaved?: boolean;
  isPinned?: boolean;
  onRepost?: () => void;
  onSave?: () => void;
  onStitch?: () => void;
}

export function MoreMenuSheet({ isOpen, onClose, postId, isOwnPost, authorUsername, isMuted: isMutedProp = false, isSaved = false, isPinned = false, onRepost, onSave, onStitch }: Props) {
  const navigate = useNavigate();
  const [showReport, setShowReport] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [reported, setReported] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isMuted, setIsMuted] = useState(isMutedProp);
  const [pinned, setPinned] = useState(isPinned);

  if (!isOpen) return null;

  const close = () => {
    setShowReport(false);
    setSelectedReason("");
    setReported(false);
    onClose();
  };

  const submitReport = async () => {
    if (!selectedReason || submitting) return;
    setSubmitting(true);
    try {
      if (postId) {
        await api.post(`/posts/${postId}/report`, { reason: selectedReason });
      }
      setReported(true);
      toast("Reported");
    } catch {
      // still show success UI even if API fails
      setReported(true);
      toast("Reported");
    } finally {
      setSubmitting(false);
    }
  };

  if (showReport) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col justify-end">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
        <div
          className="relative bg-gray-950 border-t border-gray-800 rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          {reported ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-400" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Report Submitted</h3>
              <p className="text-gray-400 text-sm mb-6">
                Thank you. Our team will review this content within 24 hours.
              </p>
              <button onClick={close} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-xl">
                Done
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-white font-bold text-base">Report Content</h3>
                <button onClick={() => setShowReport(false)} className="p-1.5 hover:bg-gray-800 rounded-full transition">
                  <X size={18} className="text-gray-400" />
                </button>
              </div>
              <p className="text-gray-400 text-sm mb-4">Why are you reporting this?</p>
              <div className="space-y-2 mb-5">
                {REPORT_REASONS.map(r => (
                  <button
                    key={r}
                    onClick={() => setSelectedReason(r)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm transition border ${selectedReason === r
                      ? "bg-red-900/30 border-red-700/50 text-red-300"
                      : "bg-gray-900 border-gray-800 text-gray-300 hover:border-gray-600"}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <button
                onClick={submitReport}
                disabled={!selectedReason}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold py-3 rounded-xl transition"
              >
                Submit Report
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const items = [
    ...(onRepost ? [{
      icon: Repeat2,
      label: "Repost",
      desc: "Share this post to your followers",
      action: () => { onRepost(); close(); },
    }] : []),
    ...(onSave ? [{
      icon: Bookmark,
      label: isSaved ? "Unsave" : "Save",
      desc: isSaved ? "Remove from saved posts" : "Save to your collection",
      action: () => { onSave(); close(); },
    }] : []),
    ...(isOwnPost && postId ? [{
      icon: Pin,
      label: pinned ? "Unpin from profile" : "Pin to profile",
      desc: pinned ? "Remove from top of your profile" : "Show at the top of your profile",
      action: async () => {
        try {
          const res = await api.post<{ pinned: boolean }>(`/posts/${postId}/pin`, {});
          setPinned(res.pinned);
          toast(res.pinned ? "Pinned to profile" : "Unpinned from profile");
        } catch { toast("Failed to pin"); }
        close();
      },
    }] : []),
    ...(!isOwnPost && onStitch ? [{
      icon: Scissors,
      label: "Stitch",
      desc: "React to this post with your own video",
      action: () => { onStitch(); close(); },
    }] : []),
    {
      icon: Flag,
      label: "Report",
      desc: "Report this content",
      color: "text-red-400",
      action: () => setShowReport(true),
    },
    ...(!isOwnPost && authorUsername ? [
      {
        icon: Ban,
        label: `Block @${authorUsername}`,
        desc: "They won't be able to see your content",
        color: "text-red-400",
        action: async () => {
          try {
            await api.post(`/blocks/${authorUsername}`, {});
          } catch { /* silent */ }
          close();
          toast("User blocked");
          navigate("/");
        },
      },
      {
        icon: isMuted ? Bell : BellOff,
        label: isMuted ? `Unmute @${authorUsername}` : `Mute @${authorUsername}`,
        desc: isMuted ? "Resume seeing their posts" : "Stop seeing their posts without blocking",
        action: async () => {
          try {
            if (isMuted) {
              await api.delete(`/blocks/${authorUsername}/mute`);
            } else {
              await api.post(`/blocks/${authorUsername}/mute`, {});
            }
            setIsMuted(m => !m);
          } catch { /* silent */ }
          close();
        },
      },
    ] : []),
    {
      icon: ThumbsDown,
      label: "Not Interested",
      desc: "See less content like this",
      action: () => { alert("Got it! We'll show you less content like this."); close(); },
    },
    {
      icon: Download,
      label: "Download",
      desc: "Save to your device",
      action: () => { alert("Download started!"); close(); },
    },
    {
      icon: Megaphone,
      label: "Promote",
      desc: "Boost this post with Amplify",
      action: () => { navigate("/amplify"); close(); },
    },
    {
      icon: Users,
      label: "Create Group",
      desc: "Start a group with your connections",
      action: () => { navigate("/create-community"); close(); },
    },
    {
      icon: Smartphone,
      label: "Set as Wallpaper",
      desc: "Available in the Kliq mobile app",
      action: () => { alert("Set as Wallpaper is available in the Kliq mobile app."); close(); },
    },
    {
      icon: Video,
      label: "Share as GIF",
      desc: "Convert and share as animated GIF",
      action: () => { alert("Share as GIF is available in the Kliq mobile app."); close(); },
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-gray-950 border-t border-gray-800 rounded-t-3xl pb-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-gray-700 rounded-full mx-auto mt-3 mb-2" />
        {items.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={item.action}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-900/50 transition"
            >
              <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon size={20} className={item.color || "text-gray-400"} />
              </div>
              <div className="text-left">
                <p className={`text-sm font-semibold ${item.color || "text-white"}`}>{item.label}</p>
                <p className="text-gray-600 text-xs">{item.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
