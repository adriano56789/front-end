import { useEffect, useRef } from 'react';
import { api } from '../services/api';

interface PollingConfig {
  /** Interval in ms between polls. Default: 30000 */
  interval?: number;
  /** Whether polling is enabled. Default: true */
  enabled?: boolean;
}

/**
 * Polls api.getCurrentUser() at a regular interval to keep user data fresh.
 * This replaces socket.io events for diamonds, earnings, and avatar updates.
 */
export function useCurrentUserPolling(
  userId: string | undefined,
  onUpdate?: (user: any) => void,
  config: PollingConfig = {}
) {
  const { interval = 30000, enabled = true } = config;
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!userId || !enabled) return;

    const poll = async () => {
      try {
        const user = await api.getCurrentUser();
        if (user) {
          onUpdateRef.current?.(user);
        }
      } catch {
        // Silently fail — polling will retry
      }
    };

    // Initial poll
    poll();

    const timerId = setInterval(poll, interval);
    return () => clearInterval(timerId);
  }, [userId, interval, enabled]);
}

/**
 * Polls api.getLiveStreamers() at a regular interval to keep the stream listing fresh.
 * This replaces socket.io events for new_live, stream_started, stream_stopped, etc.
 */
export function useStreamsPolling(
  onUpdate?: (streams: any[]) => void,
  config: PollingConfig = {}
) {
  const { interval = 15000, enabled = true } = config;
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!enabled) return;

    const poll = async () => {
      try {
        const streams = await api.getLiveStreamers('popular');
        if (Array.isArray(streams)) {
          onUpdateRef.current?.(streams);
        }
      } catch {
        // Silently fail
      }
    };

    poll();
    const timerId = setInterval(poll, interval);
    return () => clearInterval(timerId);
  }, [interval, enabled]);
}
