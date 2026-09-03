import { api } from './api';
import { onSocketEvent } from './socketService';

// ═══════════════════════════════════════════════════════════════════════
// Máquina de estados da participação por vídeo (convidado dentro da live).
//
//   IDLE       → nada acontecendo
//   REQUESTED  → espectador pediu para participar (aguardando aceite do Host)
//   ACCEPTED   → Host aceitou; aguardando a conexão WebRTC
//   CONNECTING → conexão WebRTC (WHIP/WHEP via SRS) sendo estabelecida
//   CONNECTED  → host + convidado conversam em tempo real
//   ENDING     → encerramento em andamento
//   ENDED      → participação encerrada
//   REJECTED   → Host recusou (ou expirou por timeout)
//
// Estados inválidos e chamadas duplicadas são bloqueados aqui E no backend
// (que é a fonte da verdade — máquina de estados + anti-duplicado + timeout).
// ═══════════════════════════════════════════════════════════════════════

export type ParticipationState =
  | 'IDLE'
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'ENDING'
  | 'ENDED'
  | 'REJECTED';

export interface ParticipationInfo {
  invitationId: string;
  hostId: string;
  guestId: string;
  hostName?: string;
  guestName?: string;
  roomId: string;
  streamId: string;
}

type ParticipationListener = (state: ParticipationState, info: ParticipationInfo | null, prev: ParticipationState) => void;

// Mapeia o status do backend para o nosso estado.
function mapStatus(status: string): ParticipationState {
  switch (status) {
    case 'pending': return 'REQUESTED';
    case 'accepted': return 'ACCEPTED';
    case 'connecting': return 'CONNECTING';
    case 'connected': return 'CONNECTED';
    case 'ending': return 'ENDING';
    case 'declined': return 'REJECTED';
    case 'ended':
    default: return 'ENDED';
  }
}

class ParticipationService {
  private _state: ParticipationState = 'IDLE';
  private _info: ParticipationInfo | null = null;
  private _listeners = new Set<ParticipationListener>();
  private _offFns: Array<() => void> = [];
  private _registered = false;
  private _role: 'guest' | 'host' = 'guest';

  get state(): ParticipationState { return this._state; }
  get info(): ParticipationInfo | null { return this._info; }
  get role(): 'guest' | 'host' { return this._role; }

  subscribe(fn: ParticipationListener): () => void {
    this._listeners.add(fn);
    fn(this._state, this._info, this._state);
    return () => { this._listeners.delete(fn); };
  }

  private _setState(next: ParticipationState, info: ParticipationInfo | null = this._info) {
    if (this._state === next && this._info === info) return;
    const prev = this._state;
    this._state = next;
    this._info = info;
    this._listeners.forEach(fn => fn(next, info, prev));
  }

  /** Registra os listeners de socket (idempotente). */
  init() {
    if (this._registered) return;
    this._registered = true;

    // Evento unificado de estado (backend emite participation_state).
    this._offFns.push(onSocketEvent('participation_state', (data: any) => {
      if (!data || !data.id) return;
      const status = mapStatus(data.status);
      const info: ParticipationInfo = {
        invitationId: data.id,
        hostId: data.hostId,
        guestId: data.guestId,
        hostName: data.hostName,
        guestName: data.guestName,
        roomId: data.roomId || '',
        streamId: data.streamId || '',
      };
      // Informações do próprio usuário: determina o papel pela presença do
      // guestId/hostId (o store decide o papel fora daqui).
      this._setState(status, info);
    }));

    // call_invitation — eventos transacionais da chamada de vídeo.
    this._offFns.push(onSocketEvent('call_invitation', (data: any) => {
      const type = data?.type;
      const inv = data?.invitation || {};
      if (!type) return;

      switch (type) {
        case 'call_request': {
          // Host recebeu pedido de participação de um espectador.
          const info: ParticipationInfo = {
            invitationId: inv.id || '',
            hostId: inv.hostId || '',
            guestId: inv.guestId || '',
            guestName: inv.guestName || '',
            streamId: inv.streamId || '',
            roomId: inv.roomId || '',
          };
          window.dispatchEvent(new CustomEvent('livego:participation_request', { detail: info }));
          break;
        }
        case 'call_request_sent':
        case 'call_reconnect': {
          if (this._info) this._setState('CONNECTING', this._info);
          break;
        }
        case 'invitation_accepted': {
          // Host: convidado aceitou (invite direction) OU host aceitou pedido.
          // Guest também recebe quando o Host aceita o pedido dele.
          const info: ParticipationInfo = {
            invitationId: inv.id || (this._info?.invitationId || ''),
            hostId: inv.hostId || (this._info?.hostId || ''),
            guestId: inv.guestId || (this._info?.guestId || ''),
            guestName: inv.guestName || (this._info?.guestName || ''),
            streamId: inv.streamId || (this._info?.streamId || ''),
            roomId: inv.roomId || (this._info?.roomId || ''),
          };
          this._setState('CONNECTING', info);
          break;
        }
        case 'call_joined': {
          // Guest: recebeu confirmação → conecta.
          if (this._info) this._setState('CONNECTING', this._info);
          break;
        }
        case 'call_connecting': {
          if (this._info) this._setState('CONNECTING', this._info);
          break;
        }
        case 'call_connected': {
          if (this._info) this._setState('CONNECTED', this._info);
          break;
        }
        case 'call_ended':
        case 'call_removed':
        case 'call_left': {
          if (this._info) this._setState('ENDED', this._info);
          break;
        }
        case 'invitation_declined':
        case 'participation_rejected': {
          if (this._info) this._setState('REJECTED', this._info);
          break;
        }
        default:
          break;
      }
    }));
  }

  dispose() {
    this._offFns.forEach(off => off());
    this._offFns = [];
    this._registered = false;
    this._state = 'IDLE';
    this._info = null;
  }

  // ----- Ações -----

  /** Espectador pede para participar por vídeo. */
  async requestToJoin(hostId: string, streamId: string): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await api.call.request(hostId, streamId);
      if (!res || !res.success) {
        return { ok: false, message: (res as any)?.error || 'Não foi possível pedir participação.' };
      }
      const info: ParticipationInfo = {
        invitationId: (res as any).invitationId || '',
        hostId,
        guestId: '',
        streamId,
        roomId: streamId,
      };
      this._role = 'guest';
      this._setState('REQUESTED', info);
      return { ok: true };
    } catch (err: any) {
      const msg = err?.message || (err?.data?.error) || 'Erro ao solicitar participação.';
      return { ok: false, message: msg };
    }
  }

  /** Host aceita o pedido de participação de um espectador. */
  async hostAccept(participationId: string): Promise<boolean> {
    try {
      const res = await api.call.hostRespond(participationId, 'accept');
      if (!res?.success) return false;
      this._role = 'host';
      this._setState('ACCEPTED');
      return true;
    } catch {
      return false;
    }
  }

  /** Host recusa o pedido de participação. */
  async hostReject(participationId: string): Promise<boolean> {
    try {
      const res = await api.call.hostRespond(participationId, 'decline');
      return !!res?.success;
    } catch {
      return false;
    }
  }

  /** Convidado entra de fato (reporta conexão iniciando). */
  async reportConnecting() {
    if (!this._info?.invitationId) return;
    try { await api.call.connecting(this._info.invitationId); } catch { /* best effort */ }
    this._setState('CONNECTING');
  }

  /** Convidado/host reporta conexão estabelecida. */
  async reportConnected() {
    if (!this._info?.invitationId) return;
    try { await api.call.connected(this._info.invitationId); } catch { /* best effort */ }
    this._setState('CONNECTED');
  }

  /** Reporta reconexão WebRTC. */
  async reportReconnect() {
    if (!this._info?.invitationId) return;
    try { await api.call.reconnect(this._info.invitationId); } catch { /* best effort */ }
    this._setState('CONNECTING');
  }

  /** Convidado sai da participação. */
  async leave(): Promise<void> {
    const id = this._info?.invitationId;
    this._setState('ENDING');
    if (id) {
      try { await api.call.leave(id); } catch { /* best effort */ }
    }
    this._setState('ENDED');
  }

  /** Host remove o convidado da participação. */
  async hostRemove(participationId?: string): Promise<void> {
    const id = participationId || this._info?.invitationId;
    this._setState('ENDING');
    if (id) {
      try { await api.call.remove(id); } catch { /* best effort */ }
    }
    this._setState('ENDED');
  }

  /** Encerra (qualquer lado). */
  async end(): Promise<void> {
    const id = this._info?.invitationId;
    this._setState('ENDING');
    if (id) {
      try { await api.call.end(id); } catch { /* best effort */ }
    }
    this._setState('ENDED');
  }

  reset() {
    this._state = 'IDLE';
    this._info = null;
  }
}

export const participationService = new ParticipationService();
