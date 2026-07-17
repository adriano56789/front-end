import { api } from './api';
import { Streamer, User } from '../types';
import { getHlsPlayUrl } from './mediaConfig';

export class StreamService {
  static async createStream(userId: string, streamData: {
    name: string;
    message: string;
    category?: string;
    tags?: string[];
    isPrivate?: boolean;
  }): Promise<Streamer | null> {
    try {
      const response = await api.createStream(userId, streamData);
      
      if (!response) {
        throw new Error('Failed to create stream');
      }

      const streamResponse = response.stream || response;
      
      if (typeof streamResponse === 'string') {
        throw new Error('Invalid response format: expected object, got string');
      }

      const stream = streamResponse as Streamer;
      
      if (!stream || !stream.id) {
        throw new Error('Stream created without valid ID');
      }

      return stream;
    } catch (error) {
      console.error('[STREAM_SERVICE] Error creating stream:', error);
      throw error;
    }
  }

  static async saveStream(streamId: string, streamData: Partial<Streamer>): Promise<{ success: boolean; stream?: Streamer }> {
    try {
      const response = await api.saveStream(streamId, streamData);
      return response;
    } catch (error) {
      console.error('[STREAM_SERVICE] Error saving stream:', error);
      throw error;
    }
  }

  static async uploadCover(streamId: string, coverData: { coverUrl: string }): Promise<{ success: boolean; stream?: Streamer }> {
    try {
      const response = await api.uploadStreamCover(streamId, coverData);
      return response;
    } catch (error) {
      console.error('[STREAM_SERVICE] Error uploading cover:', error);
      throw error;
    }
  }

  static async saveStreamUrls(streamId: string, urlsData: {
    rtmpIngestUrl?: string;
    streamKey?: string;
    srtIngestUrl?: string;
    playbackUrl?: string;
  }): Promise<{ success: boolean; stream?: Streamer; message?: string }> {
    try {
      const response = await api.saveStreamUrls(streamId, urlsData);
      return response;
    } catch (error) {
      console.error('[STREAM_SERVICE] Error saving stream URLs:', error);
      throw error;
    }
  }

  static generateDefaultUrls(streamId: string): {
    rtmpIngestUrl: string;
    srtIngestUrl: string;
    playbackUrl: string;
    webrtcUrl: string;
    hlsUrl: string;
  } {
    return {
      rtmpIngestUrl: '',
      srtIngestUrl: '',
      playbackUrl: getHlsPlayUrl(streamId),
      webrtcUrl: '',
      hlsUrl: getHlsPlayUrl(streamId)
    };
  }

  static validateStream(stream: Streamer): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!stream.id) {
      errors.push('Stream ID is required');
    }

    if (!stream.name) {
      errors.push('Stream name is required');
    }

    if (!stream.hostId) {
      errors.push('Host ID is required');
    }

    if (!stream.isLive) {
      errors.push('Stream must be live');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static createStreamerObject(
    stream: Streamer, 
    currentUser: User, 
    selectedCategoryKey: string,
    streamData: any
  ): Streamer {
    return {
      id: stream.id,
      hostId: currentUser.id,
      name: stream.name,
      avatar: stream.avatar || currentUser.avatarUrl || '',
      location: currentUser.country || 'Global',
      time: 'Ao Vivo',
      message: streamData.message || '',
      tags: streamData.tags || [selectedCategoryKey],
      isLive: true,
      streamStatus: 'active',
      streamKey: streamData.streamKey || stream.id,
      startTime: streamData.startTime ? new Date(streamData.startTime) : new Date(),
      viewers: streamData.viewers || 0,
      rtmpIngestUrl: streamData.rtmpIngestUrl,
      playbackUrl: streamData.playbackUrl,
      webrtcUrl: streamData.webrtcUrl,
      hlsUrl: streamData.hlsUrl,
      flvUrl: streamData.flvUrl,
      vhost: streamData.vhost || '__defaultVhost__',
      app: streamData.app || 'live',
      stream: streamData.id
    };
  }
}
