/**
 * voiceRoomRoutes.ts — Voice Room (Sala de Voz) Routes
 *
 * Endpoints:
 *   GET  /                          → List active voice rooms
 *   POST /                          → Create a new voice room
 *   GET  /:roomId                   → Get room details
 *   POST /:roomId/join              → Join as viewer
 *   POST /:roomId/leave             → Leave the room
 *   POST /:roomId/slot              → Take a slot (go on stage)
 *   DELETE /:roomId/slot            → Release slot (step down)
 *   POST /:roomId/speaking          → Toggle speaking indicator
 *   POST /:roomId/mute              → Toggle mute
 *   POST /:roomId/end               → End the room (host only)
 *
 * Storage: In-memory Map (rooms persist until server restart or end).
 */

import { Router, Request, Response } from 'express';

const router = Router();

// ═══════════════════════════════════════════════════════════════════
// In-Memory Storage
// ═══════════════════════════════════════════════════════════════════

interface VoiceSlotData {
  index: number;
  userId: string | null;
  userName: string;
  avatar: string;
  level: number;
  isSpeaking: boolean;
  isMuted: boolean;
  joinedAt: string | null;
}

interface VoiceRoomData {
  id: string;
  roomId: string;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  name: string;
  category: string;
  slots: VoiceSlotData[];
  maxSlots: number;
  minLevelToSpeak: number;
  isLive: boolean;
  viewers: number;
  viewerIds: string[];
  startTime: string | null;
  tags: string[];
  avatar: string;
  location: string;
  time: string;
  message: string;
}

const rooms = new Map<string, VoiceRoomData>();

// ── Cleanup: end rooms older than 4 hours ──
const ROOM_MAX_AGE_MS = 4 * 60 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of rooms) {
    if (room.startTime) {
      const age = now - new Date(room.startTime).getTime();
      if (age > ROOM_MAX_AGE_MS) {
        rooms.delete(roomId);
        console.log(`🔊 [VOICE-ROOM] Auto-cleaned expired room: ${roomId}`);
      }
    }
  }
}, 10 * 60 * 1000); // check every 10 min

// ── Helper: generate unique ID ──
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ── Helper: get Socket.IO instance ──
function getIO(req: Request): any {
  return (req as any).app?.get?.('io') || (req as any).app?.locals?.io || null;
}

// ── Helper: serialize room for frontend ──
function serializeRoom(room: VoiceRoomData) {
  return {
    id: room.id,
    roomId: room.roomId,
    hostId: room.hostId,
    hostName: room.hostName,
    hostAvatar: room.hostAvatar,
    name: room.name,
    category: room.category,
    slots: room.slots,
    maxSlots: room.maxSlots,
    minLevelToSpeak: room.minLevelToSpeak,
    isLive: room.isLive,
    viewers: room.viewers,
    startTime: room.startTime,
    tags: room.tags,
    avatar: room.avatar,
    location: room.location,
    time: room.time,
    message: room.message,
  };
}

// ═══════════════════════════════════════════════════════════════════
// GET /api/voice-rooms — List active voice rooms
// ═══════════════════════════════════════════════════════════════════
router.get('/', (req: Request, res: Response) => {
  try {
    const { category, limit: limitStr } = req.query;
    const limit = Math.min(parseInt(limitStr as string) || 50, 100);

    let filtered = Array.from(rooms.values()).filter(r => r.isLive);

    if (category && category !== 'all') {
      filtered = filtered.filter(r => r.category === category);
    }

    // Sort by viewer count descending
    filtered.sort((a, b) => b.viewers - a.viewers);

    const paginated = filtered.slice(0, limit);

    res.json({
      code: 200,
      data: {
        rooms: paginated.map(serializeRoom),
        hasMore: filtered.length > limit,
      },
    });
  } catch (error: any) {
    console.error('[VOICE-ROOM-LIST] Error:', error);
    res.status(500).json({ code: 500, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/voice-rooms — Create a new voice room
// ═══════════════════════════════════════════════════════════════════
router.post('/', (req: Request, res: Response) => {
  try {
    const { hostId, name, category, minLevelToSpeak } = req.body;

    if (!hostId) {
      return res.status(400).json({ success: false, error: 'hostId is required' });
    }

    // Check if host already has an active room
    for (const room of rooms.values()) {
      if (room.hostId === hostId && room.isLive) {
        return res.status(409).json({
          success: false,
          error: 'Host already has an active voice room',
          room: serializeRoom(room),
        });
      }
    }

    const roomId = generateId();
    const maxSlots = 8;

    // Initialize empty slots
    const slots: VoiceSlotData[] = [];
    for (let i = 0; i < maxSlots; i++) {
      slots.push({
        index: i,
        userId: null,
        userName: '',
        avatar: '',
        level: 0,
        isSpeaking: false,
        isMuted: false,
        joinedAt: null,
      });
    }

    const room: VoiceRoomData = {
      id: roomId,
      roomId,
      hostId,
      hostName: req.body.hostName || 'Host',
      hostAvatar: req.body.hostAvatar || '',
      name: name || `Sala de ${req.body.hostName || 'Host'}`,
      category: category || 'voice_chat',
      slots,
      maxSlots,
      minLevelToSpeak: minLevelToSpeak || 1,
      isLive: true,
      viewers: 1,
      viewerIds: [hostId],
      startTime: new Date().toISOString(),
      tags: req.body.tags || [],
      avatar: req.body.hostAvatar || '',
      location: req.body.location || '',
      time: new Date().toISOString(),
      message: req.body.message || '',
    };

    rooms.set(roomId, room);

    console.log(`🔊 [VOICE-ROOM] Created: ${roomId} by host ${hostId}`);

    res.json({
      success: true,
      room: serializeRoom(room),
    });
  } catch (error: any) {
    console.error('[VOICE-ROOM-CREATE] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/voice-rooms/:roomId — Get room details
// ═══════════════════════════════════════════════════════════════════
router.get('/:roomId', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const room = rooms.get(roomId);

    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    res.json({ success: true, room: serializeRoom(room) });
  } catch (error: any) {
    console.error('[VOICE-ROOM-GET] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/voice-rooms/:roomId/join — Join as viewer
// ═══════════════════════════════════════════════════════════════════
router.post('/:roomId/join', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    const room = rooms.get(roomId);
    if (!room || !room.isLive) {
      return res.status(404).json({ success: false, error: 'Room not found or ended' });
    }

    if (!room.viewerIds.includes(userId)) {
      room.viewerIds.push(userId);
      room.viewers = room.viewerIds.length;
    }

    // Emit viewer count update
    const io = getIO(req);
    if (io) {
      io.to(roomId).emit('voice_viewer_count', { viewers: room.viewers });
    }

    res.json({ success: true, room: serializeRoom(room) });
  } catch (error: any) {
    console.error('[VOICE-ROOM-JOIN] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/voice-rooms/:roomId/leave — Leave the room
// ═══════════════════════════════════════════════════════════════════
router.post('/:roomId/leave', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;

    const room = rooms.get(roomId);
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    // Remove from viewers
    room.viewerIds = room.viewerIds.filter(id => id !== userId);
    room.viewers = room.viewerIds.length;

    // Also release any slot the user might have
    for (const slot of room.slots) {
      if (slot.userId === userId) {
        slot.userId = null;
        slot.userName = '';
        slot.avatar = '';
        slot.level = 0;
        slot.isSpeaking = false;
        slot.isMuted = false;
        slot.joinedAt = null;
      }
    }

    // Emit updates
    const io = getIO(req);
    if (io) {
      io.to(roomId).emit('voice_slot_update', { slots: room.slots });
      io.to(roomId).emit('voice_viewer_count', { viewers: room.viewers });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('[VOICE-ROOM-LEAVE] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/voice-rooms/:roomId/slot — Take a slot (go on stage)
// ═══════════════════════════════════════════════════════════════════
router.post('/:roomId/slot', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { userId, slotIndex } = req.body;

    if (typeof slotIndex !== 'number' || slotIndex < 0) {
      return res.status(400).json({ success: false, error: 'Valid slotIndex is required' });
    }

    const room = rooms.get(roomId);
    if (!room || !room.isLive) {
      return res.status(404).json({ success: false, error: 'Room not found or ended' });
    }

    if (slotIndex >= room.maxSlots) {
      return res.status(400).json({ success: false, error: 'Invalid slot index' });
    }

    const slot = room.slots[slotIndex];
    if (slot.userId && slot.userId !== userId) {
      return res.status(409).json({ success: false, error: 'Slot is already occupied' });
    }

    // Remove user from any other slot first
    for (const s of room.slots) {
      if (s.userId === userId) {
        s.userId = null;
        s.userName = '';
        s.avatar = '';
        s.level = 0;
        s.isSpeaking = false;
        s.isMuted = false;
        s.joinedAt = null;
      }
    }

    // Assign slot
    slot.userId = userId;
    slot.userName = req.body.userName || 'User';
    slot.avatar = req.body.avatar || '';
    slot.level = req.body.level || 1;
    slot.isSpeaking = false;
    slot.isMuted = false;
    slot.joinedAt = new Date().toISOString();

    // Emit slot update
    const io = getIO(req);
    if (io) {
      io.to(roomId).emit('voice_slot_update', { slots: room.slots });
    }

    console.log(`🔊 [VOICE-ROOM] User ${userId} took slot ${slotIndex} in room ${roomId}`);

    res.json({ success: true, slots: room.slots });
  } catch (error: any) {
    console.error('[VOICE-ROOM-SLOT] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// DELETE /api/voice-rooms/:roomId/slot — Release slot (step down)
// ═══════════════════════════════════════════════════════════════════
router.delete('/:roomId/slot', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;

    const room = rooms.get(roomId);
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    for (const slot of room.slots) {
      if (slot.userId === userId) {
        slot.userId = null;
        slot.userName = '';
        slot.avatar = '';
        slot.level = 0;
        slot.isSpeaking = false;
        slot.isMuted = false;
        slot.joinedAt = null;
        break;
      }
    }

    // Emit slot update
    const io = getIO(req);
    if (io) {
      io.to(roomId).emit('voice_slot_update', { slots: room.slots });
    }

    res.json({ success: true, slots: room.slots });
  } catch (error: any) {
    console.error('[VOICE-ROOM-RELEASE-SLOT] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/voice-rooms/:roomId/invite-cohost — Convidar alguém para o palco
// ═══════════════════════════════════════════════════════════════════
// O convite vai DENTRO da própria sala de voz (não cria sala nova nem é
// sala privada). Emite um socket `voice_stage_invite` para o convidado
// (sala `user_{friendId}`). Ele aceita/recusa. Se aceitar, entra direto
// no palco da MESMA sala já aberta via /invite-cohost/respond.
router.post('/:roomId/invite-cohost', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { hostId, friendId, friendName, friendAvatar, friendLevel } = req.body;

    const room = rooms.get(roomId);
    if (!room || !room.isLive) {
      return res.status(404).json({ success: false, error: 'Sala não encontrada ou encerrada' });
    }

    // Apenas o host (ou alguém no palco) pode convidar
    const isOnStage = room.slots.some(s => s.userId === hostId);
    if (room.hostId !== hostId && !isOnStage) {
      return res.status(403).json({ success: false, error: 'Apenas o host ou quem está no palco pode convidar' });
    }

    // Não pode convidar quem já está no palco
    if (room.slots.some(s => s.userId === friendId)) {
      return res.status(409).json({ success: false, error: 'Usuário já está no palco' });
    }

    // Se ainda não há espaço, libera... (host sempre ocupa slot 0; verifica vagas)
    const hasFreeSlot = room.slots.some(s => s.userId === null && s.index !== 0);
    if (!hasFreeSlot) {
      return res.status(400).json({ success: false, error: 'Palco cheio' });
    }

    const io = getIO(req);
    if (io) {
      io.to(`user_${friendId}`).emit('voice_stage_invite', {
        roomId: room.roomId,
        roomName: room.name,
        hostId: room.hostId,
        hostName: room.hostName,
        hostAvatar: room.hostAvatar,
        inviterId: hostId,
        inviterName: req.body.hostName || room.hostName,
        timestamp: Date.now(),
      });
    }

    console.log(`🔊 [VOICE-ROOM] Convite para o palco enviado: ${friendId} ← ${hostId} (sala ${roomId})`);

    res.json({ success: true });
  } catch (error: any) {
    console.error('[VOICE-ROOM-INVITE-COHOST] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/voice-rooms/:roomId/invite-cohost/respond — Aceitar/recusar convite
// ═══════════════════════════════════════════════════════════════════
// Se aceitar, o usuário sobe DIRETO no palco da mesma sala (takeSlot no
// primeiro slot livre). Recusar apenas emite um aviso. NÃO cria sala nova.
router.post('/:roomId/invite-cohost/respond', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { userId, respond } = req.body; // 'accept' | 'decline'

    const room = rooms.get(roomId);
    if (!room || !room.isLive) {
      return res.status(404).json({ success: false, error: 'Sala não encontrada ou encerrada' });
    }

    const io = getIO(req);

    if (respond === 'decline') {
      return res.json({ success: true, declined: true });
    }

    if (respond !== 'accept') {
      return res.status(400).json({ success: false, error: 'respond deve ser accept ou decline' });
    }

    // Já está no palco → apenas confirma
    if (room.slots.some(s => s.userId === userId)) {
      return res.json({ success: true, slots: room.slots, already: true });
    }

    // Encontra o primeiro slot livre (exceto slot 0 que é do host)
    const slot = room.slots.find(s => s.userId === null && s.index !== 0);
    if (!slot) {
      return res.status(400).json({ success: false, error: 'Palco cheio' });
    }

    slot.userId = userId;
    slot.userName = req.body.userName || userId;
    slot.avatar = req.body.avatar || '';
    slot.level = req.body.level || 1;
    slot.isSpeaking = false;
    slot.isMuted = false;
    slot.joinedAt = new Date().toISOString();

    if (io) {
      io.to(roomId).emit('voice_slot_update', { slots: room.slots });
    }

    console.log(`🔊 [VOICE-ROOM] ${userId} aceitou o convite e subiu no palco (sala ${roomId})`);

    res.json({ success: true, slots: room.slots });
  } catch (error: any) {
    console.error('[VOICE-ROOM-INVITE-COHOST-RESPOND] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/voice-rooms/:roomId/speaking — Toggle speaking indicator
// ═══════════════════════════════════════════════════════════════════
router.post('/:roomId/speaking', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { userId, isSpeaking } = req.body;

    const room = rooms.get(roomId);
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    for (const slot of room.slots) {
      if (slot.userId === userId) {
        slot.isSpeaking = !!isSpeaking;
        break;
      }
    }

    const io = getIO(req);
    if (io) {
      io.to(roomId).emit('voice_speaking', { userId, isSpeaking: !!isSpeaking });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('[VOICE-ROOM-SPEAKING] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/voice-rooms/:roomId/mute — Toggle mute
// ═══════════════════════════════════════════════════════════════════
router.post('/:roomId/mute', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { userId, isMuted } = req.body;

    const room = rooms.get(roomId);
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    for (const slot of room.slots) {
      if (slot.userId === userId) {
        slot.isMuted = !!isMuted;
        break;
      }
    }

    const io = getIO(req);
    if (io) {
      io.to(roomId).emit('voice_mute_update', { userId, isMuted: !!isMuted });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('[VOICE-ROOM-MUTE] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/voice-rooms/:roomId/end — End the room (host only)
// ═══════════════════════════════════════════════════════════════════
router.post('/:roomId/end', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;

    const room = rooms.get(roomId);
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    if (room.hostId !== userId) {
      return res.status(403).json({ success: false, error: 'Only the host can end the room' });
    }

    room.isLive = false;

    // Emit room ended
    const io = getIO(req);
    if (io) {
      io.to(roomId).emit('voice_room_ended', { roomId });
    }

    // Remove after a short delay to let clients process
    setTimeout(() => {
      rooms.delete(roomId);
      console.log(`🔊 [VOICE-ROOM] Ended and removed: ${roomId}`);
    }, 5000);

    res.json({ success: true });
  } catch (error: any) {
    console.error('[VOICE-ROOM-END] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
