import { useRef } from "react";
import { useSrsPlayer } from "../hooks/useSrsPlayer";

interface LivePlayerProps {
  url?: string;
  streamId?: string;
  userId?: string;
  isBroadcaster?: boolean;
  onPlaying?: () => void;
  onError?: () => void;
}

export default function LivePlayer({
  url,
  streamId: propStreamId,
  isBroadcaster = false,
  onPlaying,
  onError,
}: LivePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const streamId = propStreamId
    || (url ? url.split("/").pop()?.replace(".m3u8", "").replace(".flv", "") : "")
    || "";

  useSrsPlayer(videoRef, { streamId, onPlaying, onError });

  if (!streamId) {
    return null;
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isBroadcaster}
        controls={false}
        className="w-full h-full object-cover"
      />
    </div>
  );
}
