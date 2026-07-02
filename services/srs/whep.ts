import { WhepPlaybackService } from '../whepPlaybackService';

export class WhepService {
  private service: WhepPlaybackService;

  constructor() {
    this.service = new WhepPlaybackService();
  }

  async start(streamKey: string, video: HTMLVideoElement): Promise<void> {
    try {
      await this.service.start(streamKey, video);
    } catch (err) {
      throw err;
    }
  }

  stop(): void {
    this.service.stop();
  }
}

export const whepService = new WhepService();
export const whepPlaybackService = whepService;
