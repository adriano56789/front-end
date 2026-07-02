import { PublishEngine } from './PublishEngine';
import type { PublishState as EnginePublishState } from './PublishEngine';
import { getWhipEndpointUrl } from './mediaConfig';

export type PublishState = 'idle' | 'connecting' | 'publishing' | 'failed';

type StateListener = (state: PublishState) => void;

const ENGINE_CONFIG = {
  videoCodec: 'H264' as const,
  maxVideoBitrate: 2500,
  reconnectRetries: 3,
};

export class WhipPublishService {
  private engine: PublishEngine | null = null;
  private _state: PublishState = 'idle';
  private listeners: StateListener[] = [];

  onStateChange(cb: StateListener): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  getState(): PublishState {
    return this._state;
  }

  private setState(next: PublishState): void {
    this._state = next;
    this.listeners.forEach(l => l(next));
  }

  async start(streamKey: string, mediaStream: MediaStream): Promise<void> {
    if (this._state === 'publishing' || this._state === 'connecting') return;
    this.setState('connecting');

    try {
      this.engine = new PublishEngine(ENGINE_CONFIG);

      this.engine.on('stateChanged', (_prev: EnginePublishState, next: EnginePublishState) => {
        switch (next) {
          case 'connecting':
            this.setState('connecting');
            break;
          case 'publishing':
          case 'reconnecting':
            this.setState('publishing');
            break;
          case 'failed':
            this.setState('failed');
            break;
          case 'idle':
            this.setState('idle');
            break;
        }
      });

      this.engine.on('error', (code: string, message: string) => {
        console.error('[WHIP] Engine error:', code, message);
      });

      await this.engine.start(streamKey, mediaStream);
    } catch (err) {
      console.error('[WHIP] Publish failed:', err);
      this.setState('failed');
      throw err;
    }
  }

  async stop(): Promise<void> {
    if (this.engine) {
      await this.engine.stop();
      this.engine = null;
    }
    this.setState('idle');
  }

  async replaceTrack(kind: 'audio' | 'video', track: MediaStreamTrack | null): Promise<void> {
    if (this.engine) {
      await this.engine.replaceTrack(kind, track);
    }
  }
}

export const whipPublishService = new WhipPublishService();
