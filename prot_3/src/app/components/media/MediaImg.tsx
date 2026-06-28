import React, { useRef, useState } from "react";
import { api } from "../../api/client";

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallback?: string;
  context?: string;
}

const MAX_RETRIES = 3;

function reportFailure(url: string, context?: string) {
  api.post("/media/report-failure", { url, context }).catch(() => {});
}

export function MediaImg({ src, fallback, context, className, style, alt, ...rest }: Props) {
  const [failed, setFailed] = useState(false);
  const retries = useRef(0);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (retries.current < MAX_RETRIES) {
      retries.current += 1;
      const img = e.currentTarget;
      setTimeout(() => { img.src = src; }, 500 * retries.current);
    } else {
      reportFailure(src, context);
      setFailed(true);
    }
  };

  if (failed) {
    return fallback
      ? <img src={fallback} alt={alt} className={className} style={style} {...rest} />
      : <div className={`bg-gray-900 flex items-center justify-center ${className ?? ""}`} style={style} />;
  }

  return (
    <img src={src} alt={alt} className={className} style={style} {...rest} onError={handleError} />
  );
}
