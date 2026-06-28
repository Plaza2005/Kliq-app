import React, { useRef, useState } from "react";
import { api } from "../../api/client";

interface Props extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src: string;
  context?: string;
  fallbackClassName?: string;
}

const MAX_RETRIES = 3;

function reportFailure(url: string, context?: string) {
  api.post("/media/report-failure", { url, context }).catch(() => {});
}

export function MediaVideo({ src, context, fallbackClassName, className, ...rest }: Props) {
  const [failed, setFailed] = useState(false);
  const retries = useRef(0);

  const handleError = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (retries.current < MAX_RETRIES) {
      retries.current += 1;
      const vid = e.currentTarget;
      setTimeout(() => { vid.src = src; vid.load(); }, 800 * retries.current);
    } else {
      reportFailure(src, context);
      setFailed(true);
    }
  };

  if (failed) {
    return (
      <div className={`bg-gray-900 flex items-center justify-center ${fallbackClassName ?? className ?? ""}`}>
        <span className="text-gray-600 text-xs">Video unavailable</span>
      </div>
    );
  }

  return (
    <video src={src} className={className} {...rest} onError={handleError} />
  );
}
