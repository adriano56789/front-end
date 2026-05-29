import mongoose, { Schema, Document } from 'mongoose';

// Interface para histórico de sessões
interface StreamSession {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  maxViewers: number;
  totalViewers: number;
  diamonds: number;
  gifts: number;
}

// Interface para estatísticas da stream
interface StreamStats {
  totalSessions: number;
  totalDuration: number;
  totalViewers: number;
  totalDiamonds: number;
  totalGifts: number;
  maxConcurrentViewers: number;
  averageSessionDuration: number;
}

// Interface para URLs de transmissão
interface StreamUrls {
  rtmpIngestUrl: string;
  rtmpUrl: string;
  playbackUrl: string;
  flvUrl: string;
  webrtcUrl: string;
  streamServerUrl: string;
}

// Interface principal do StreamKey
export interface IStreamKey extends Document {
  // Identificação
  id: string;
  streamKey: string;
  hostId: string;
  
  // Informações básicas
  name: string;
  title: string;
  description: string;
  avatar: string;
  cover: string;
  
  // Localização e idioma
  location: string;
  country: string;
  language: string;
  
  // Configurações da stream
  category: string;
  tags: string[];
  quality: string;
  isPrivate: boolean;
  isHot: boolean;
  
  // URLs de transmissão
  rtmpIngestUrl: string;
  rtmpUrl: string;
  srtIngestUrl: string;
  playbackUrl: string;
  flvUrl: string;
  webrtcUrl: string;
  streamServerUrl: string;
  
  // Status e controle
  isLive: boolean;
  streamStatus: 'ended' | 'live' | 'starting' | 'stopping';
  startTime?: Date;
  endTime?: Date;
  endedBy?: string;
  
  // Interação
  roomId: string;
  viewers: number;
  maxViewers: number;
  heartbeatCount: number;
  
  // Recursos
  recordingEnabled: boolean;
  chatEnabled: boolean;
  giftsEnabled: boolean;
  privateGiftId: string;
  isAutoPrivateInviteEnabled: boolean;
  
  // Economia
  diamonds: number;
  likes: number;
  
  // Histórico e estatísticas
  sessions: StreamSession[];
  stats: StreamStats;
  
  // Metadados
  createdAt: Date;
  updatedAt: Date;
  
  // Métodos de instância
  startStream(): Promise<void>;
  endStream(endedBy?: string): Promise<void>;
  updateViewers(count: number): Promise<void>;
  addDiamonds(amount: number): Promise<void>;
  addGift(giftAmount: number): Promise<void>;
  getStreamInfo(): object;
  generateUrls(): StreamUrls;
}

// Interface para métodos estáticos
interface IStreamKeyModel extends mongoose.Model<IStreamKey> {
  generateStreamKey(hostId: string): string;
  generateStreamId(hostId: string): string;
  findByHostId(hostId: string): Promise<IStreamKey | null>;
  findByStreamKey(streamKey: string): Promise<IStreamKey | null>;
  findActiveStreams(): Promise<IStreamKey[]>;
  getStreamStats(hostId: string): Promise<StreamStats | null>;
}

// Schema do MongoDB
const StreamKeySchema: Schema<IStreamKey> = new Schema({
  // Identificação
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  streamKey: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  hostId: {
    type: String,
    required: true,
    index: true
  },
  
  // Informações básicas
  name: {
    type: String,
    required: true,
    trim: true
  },
  title: {
    type: String,
    default: '',
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true,
    maxlength: 500
  },
  avatar: {
    type: String,
    default: ''
  },
  cover: {
    type: String,
    default: ''
  },
  
  // Localização e idioma
  location: {
    type: String,
    default: ''
  },
  country: {
    type: String,
    default: 'BR',
    uppercase: true,
    maxlength: 2
  },
  language: {
    type: String,
    default: 'pt',
    lowercase: true,
    maxlength: 5
  },
  
  // Configurações da stream
  category: {
    type: String,
    default: 'popular',
    enum: ['popular', 'music', 'gaming', 'talk', 'dance', 'cooking', 'sports', 'education', 'other']
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 20
  }],
  quality: {
    type: String,
    default: 'HD',
    enum: ['SD', 'HD', 'FHD', '4K']
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  isHot: {
    type: Boolean,
    default: false
  },
  
  // URLs de transmissão
  rtmpIngestUrl: {
    type: String,
    required: true
  },
  rtmpUrl: {
    type: String,
    required: true
  },
  srtIngestUrl: {
    type: String,
    default: ''
  },
  playbackUrl: {
    type: String,
    required: true
  },
  flvUrl: {
    type: String,
    default: ''
  },
  webrtcUrl: {
    type: String,
    required: true
  },
  streamServerUrl: {
    type: String,
    required: true
  },
  
  // Status e controle
  isLive: {
    type: Boolean,
    default: false,
    index: true
  },
  streamStatus: {
    type: String,
    default: 'ended',
    enum: ['ended', 'live', 'starting', 'stopping'],
    index: true
  },
  startTime: {
    type: Date,
    default: null
  },
  endTime: {
    type: Date,
    default: null
  },
  endedBy: {
    type: String,
    default: ''
  },
  
  // Interação
  roomId: {
    type: String,
    required: true
  },
  viewers: {
    type: Number,
    default: 0,
    min: 0
  },
  maxViewers: {
    type: Number,
    default: 10000,
    min: 1
  },
  heartbeatCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Recursos
  recordingEnabled: {
    type: Boolean,
    default: true
  },
  chatEnabled: {
    type: Boolean,
    default: true
  },
  giftsEnabled: {
    type: Boolean,
    default: true
  },
  privateGiftId: {
    type: String,
    default: ''
  },
  isAutoPrivateInviteEnabled: {
    type: Boolean,
    default: false
  },
  
  // Economia
  diamonds: {
    type: Number,
    default: 0,
    min: 0
  },
  likes: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Histórico e estatísticas
  sessions: [{
    sessionId: {
      type: String,
      required: true
    },
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      default: null
    },
    duration: {
      type: Number,
      default: 0,
      min: 0
    },
    maxViewers: {
      type: Number,
      default: 0,
      min: 0
    },
    totalViewers: {
      type: Number,
      default: 0,
      min: 0
    },
    diamonds: {
      type: Number,
      default: 0,
      min: 0
    },
    gifts: {
      type: Number,
      default: 0,
      min: 0
    }
  }],
  
  stats: {
    totalSessions: {
      type: Number,
      default: 0,
      min: 0
    },
    totalDuration: {
      type: Number,
      default: 0,
      min: 0
    },
    totalViewers: {
      type: Number,
      default: 0,
      min: 0
    },
    totalDiamonds: {
      type: Number,
      default: 0,
      min: 0
    },
    totalGifts: {
      type: Number,
      default: 0,
      min: 0
    },
    maxConcurrentViewers: {
      type: Number,
      default: 0,
      min: 0
    },
    averageSessionDuration: {
      type: Number,
      default: 0,
      min: 0
    }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      // Remover campos sensíveis
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Índices para performance
StreamKeySchema.index({ hostId: 1 });
StreamKeySchema.index({ streamKey: 1 }, { unique: true });
StreamKeySchema.index({ isLive: 1 });
StreamKeySchema.index({ streamStatus: 1 });
StreamKeySchema.index({ createdAt: -1 });
StreamKeySchema.index({ 'stats.totalViewers': -1 });
StreamKeySchema.index({ 'stats.totalDiamonds': -1 });

// Métodos estáticos
StreamKeySchema.statics.generateStreamKey = function(hostId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `live_${hostId}_${timestamp}_${random}`;
};

StreamKeySchema.statics.generateStreamId = function(hostId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `stream_${hostId}_${timestamp}_${random}`;
};

StreamKeySchema.statics.findByHostId = function(hostId: string): Promise<IStreamKey | null> {
  return this.findOne({ hostId });
};

StreamKeySchema.statics.findByStreamKey = function(streamKey: string): Promise<IStreamKey | null> {
  return this.findOne({ streamKey });
};

StreamKeySchema.statics.findActiveStreams = function(): Promise<IStreamKey[]> {
  return this.find({ isLive: true }).sort({ viewers: -1 });
};

StreamKeySchema.statics.getStreamStats = async function(hostId: string): Promise<StreamStats | null> {
  const stream = await this.findOne({ hostId });
  return stream ? stream.stats : null;
};

// Métodos de instância
StreamKeySchema.methods.startStream = async function(): Promise<void> {
  this.isLive = true;
  this.streamStatus = 'live';
  this.startTime = new Date();
  this.endTime = null;
  this.endedBy = '';
  this.heartbeatCount = 0;
  this.viewers = 0;
  
  // Criar nova sessão
  const sessionId = `session_${Date.now()}`;
  this.sessions.push({
    sessionId,
    startTime: new Date(),
    maxViewers: 0,
    totalViewers: 0,
    diamonds: 0,
    gifts: 0
  });
  
  await this.save();
};

StreamKeySchema.methods.endStream = async function(endedBy?: string): Promise<void> {
  this.isLive = false;
  this.streamStatus = 'ended';
  this.endTime = new Date();
  this.endedBy = endedBy || '';
  
  // Finalizar sessão atual
  const currentSession = this.sessions[this.sessions.length - 1];
  if (currentSession && !currentSession.endTime) {
    currentSession.endTime = new Date();
    currentSession.duration = Math.floor((currentSession.endTime.getTime() - currentSession.startTime.getTime()) / 1000);
    
    // Atualizar estatísticas
    this.stats.totalSessions++;
    this.stats.totalDuration += currentSession.duration;
    this.stats.totalViewers += currentSession.totalViewers;
    this.stats.totalDiamonds += currentSession.diamonds;
    this.stats.totalGifts += currentSession.gifts;
    
    if (currentSession.maxViewers > this.stats.maxConcurrentViewers) {
      this.stats.maxConcurrentViewers = currentSession.maxViewers;
    }
    
    if (this.stats.totalSessions > 0) {
      this.stats.averageSessionDuration = Math.floor(this.stats.totalDuration / this.stats.totalSessions);
    }
  }
  
  await this.save();
};

StreamKeySchema.methods.updateViewers = async function(count: number): Promise<void> {
  this.viewers = Math.max(0, count);
  
  // Atualizar sessão atual
  const currentSession = this.sessions[this.sessions.length - 1];
  if (currentSession && !currentSession.endTime) {
    currentSession.totalViewers = Math.max(currentSession.totalViewers, count);
    currentSession.maxViewers = Math.max(currentSession.maxViewers, count);
  }
  
  await this.save();
};

StreamKeySchema.methods.addDiamonds = async function(amount: number): Promise<void> {
  this.diamonds += amount;
  
  // Atualizar sessão atual
  const currentSession = this.sessions[this.sessions.length - 1];
  if (currentSession && !currentSession.endTime) {
    currentSession.diamonds += amount;
  }
  
  await this.save();
};

StreamKeySchema.methods.addGift = async function(giftAmount: number): Promise<void> {
  // Atualizar sessão atual
  const currentSession = this.sessions[this.sessions.length - 1];
  if (currentSession && !currentSession.endTime) {
    currentSession.gifts += giftAmount;
  }
  
  await this.save();
};

StreamKeySchema.methods.getStreamInfo = function(): object {
  return {
    id: this.id,
    streamKey: this.streamKey,
    hostId: this.hostId,
    name: this.name,
    title: this.title,
    description: this.description,
    isLive: this.isLive,
    streamStatus: this.streamStatus,
    viewers: this.viewers,
    maxViewers: this.maxViewers,
    startTime: this.startTime,
    endTime: this.endTime,
    category: this.category,
    tags: this.tags,
    quality: this.quality,
    diamonds: this.diamonds,
    likes: this.likes,
    stats: this.stats,
    urls: {
      rtmp: this.rtmpUrl,
      playback: this.playbackUrl,
      webrtc: this.webrtcUrl,
      flv: this.flvUrl
    }
  };
};

StreamKeySchema.methods.generateUrls = function(): StreamUrls {
  const baseUrl = '72.60.249.175';
  
  return {
    rtmpIngestUrl: `rtmp://${baseUrl}:1935/live/${this.streamKey}`,
    rtmpUrl: `rtmp://${baseUrl}:1935/live/${this.streamKey}`,
    playbackUrl: `http://${baseUrl}:8080/live/${this.streamKey}.m3u8`,
    flvUrl: `http://${baseUrl}:8080/live/${this.streamKey}.flv`,
    webrtcUrl: `webrtc://${baseUrl}/live/${this.streamKey}`,
    streamServerUrl: `http://${baseUrl}:1985`
  };
};

// Middleware para validação
StreamKeySchema.pre('save', function(next) {
  // Gerar URLs se não existirem
  if (!this.rtmpIngestUrl || !this.rtmpUrl || !this.playbackUrl || !this.webrtcUrl) {
    const urls = this.generateUrls();
    this.rtmpIngestUrl = urls.rtmpIngestUrl;
    this.rtmpUrl = urls.rtmpUrl;
    this.playbackUrl = urls.playbackUrl;
    this.flvUrl = urls.flvUrl;
    this.webrtcUrl = urls.webrtcUrl;
    this.streamServerUrl = urls.streamServerUrl;
  }
  
  // Gerar roomId se não existir
  if (!this.roomId) {
    this.roomId = `room_${this.id}`;
  }
  
  next();
});

// Exportação
export const StreamKey = mongoose.models.StreamKey || 
  mongoose.model<IStreamKey, IStreamKeyModel>('StreamKey', StreamKeySchema);
