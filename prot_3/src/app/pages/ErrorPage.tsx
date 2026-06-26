import { useRouteError, useNavigate } from "react-router";
import { AlertTriangle, ArrowLeft } from "lucide-react";

interface RouteError {
  status?: number;
  statusText?: string;
  message?: string;
  data?: { message?: string };
}

export function ErrorPage() {
  const error = useRouteError() as RouteError | null;
  const navigate = useNavigate();

  const is404 = error?.status === 404;
  const message =
    error?.data?.message ??
    error?.message ??
    error?.statusText ??
    "An unexpected error occurred.";

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center mx-auto mb-6">
        <AlertTriangle size={36} className={is404 ? "text-purple-400" : "text-red-400"} />
      </div>

      <h1 className="text-5xl font-black text-white mb-3">
        {is404 ? "404" : "Oops"}
      </h1>

      <p className="text-xl font-bold text-gray-300 mb-2">
        {is404 ? "Page not found" : "Something went wrong"}
      </p>

      {!is404 && (
        <p className="text-gray-500 text-sm mb-8 max-w-sm">{message}</p>
      )}

      {is404 && (
        <p className="text-gray-500 text-sm mb-8 max-w-sm">
          The page you're looking for doesn't exist or has been moved.
        </p>
      )}

      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 bg-gray-900 border border-gray-800 text-white font-semibold px-6 py-3 rounded-xl hover:bg-gray-800 transition"
      >
        <ArrowLeft size={18} />
        Go back
      </button>
    </div>
  );
}
