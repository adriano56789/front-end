import { api } from '../api';

export const srsApi = {
  publishWebRTC: async (streamUrl: string, sdp: string) => {
    return await api.publishWebRTC(streamUrl, sdp);
  },
  playWebRTC: async (streamUrl: string, sdp: string) => {
    return await api.playWebRTC(streamUrl, sdp);
  },
  stopWebRTC: async (sessionId: string) => {
    return await api.stopWebRTC(sessionId);
  }
};
