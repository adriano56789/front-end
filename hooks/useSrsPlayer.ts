import { useEffect, useRef, useState } from 'react';
import { SrsPlayerEngine, PlayerState } from '../services/SrsPlayerEngine';

interface UseSrsPlayerOptions {
  streamId?: string;
  onPlaying?: () => void;
  onError?: () => void;
}

export function useSrsPlayer(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  options: UseSrsPlayerOptions,
) {
  const { streamId, onPlaying, onError } = options;
  const [state, setState] = useState<PlayerState>('idle');
  const engineRef = useRef<SrsPlayerEngine | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!streamId || !video) return;

    const engine = new SrsPlayerEngine({ autoMuteRetry: true, hlsFallback: true });
    engineRef.current = engine;

    const offState = engine.on('stateChanged', (_prev: string, next: string) => {
      setState(next as PlayerState);
    });
    const offPlaying = engine.on('playing', () => onPlaying?.());
    const offError = engine.on('error', () => onError?.());

    engine.start(streamId, video).catch(() => onError?.());

    return () => {
      offState();
      offPlaying();
      offError();
      engine.destroy();
      engineRef.current = null;
    };
  }, [streamId, videoRef.current]);

  return { state, engine: engineRef.current };
}
