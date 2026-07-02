import { User } from '../../types';

export interface LiveKitParticipant {
  identity: string;
  name?: string;
  metadata?: string;
  isLocal: boolean;
  tracks: Map<string, any>;
  isSpeaking: boolean;
}

export function createParticipantFromUser(user: User, role: 'opponent' | 'guest'): LiveKitParticipant {
  return {
    identity: user.id,
    name: user.name,
    metadata: JSON.stringify({ role, level: user.level, avatarUrl: user.avatarUrl }),
    isLocal: false,
    tracks: new Map(),
    isSpeaking: false
  };
}
