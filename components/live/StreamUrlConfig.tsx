import React from 'react';
import { CopyIcon } from '../icons';
import { Streamer } from '../../types';
import { getWhipEndpointUrl } from '../../services/mediaConfig';
import { env } from '../../src/config/environment';

type StreamUrlConfigField = 'editRtmpUrl' | 'editStreamKey' | 'editSrtUrl' | 'editPlaybackUrl' | 'editWhipUrl';

interface StreamUrlConfigProps {
  streamType: string;
  draftStream?: Streamer | null;
  isEditingUrls: boolean;
  editRtmpUrl: string;
  editStreamKey: string;
  editSrtUrl: string;
  editPlaybackUrl: string;
  editWhipUrl: string;
  onToggleEditMode: () => void;
  onSaveUrls: () => void;
  onUrlChange: (field: StreamUrlConfigField, value: string) => void;
  onCopyToClipboard: (text?: string) => void;
  isInviteMode?: boolean;
}

export const StreamUrlConfig: React.FC<StreamUrlConfigProps> = ({
  streamType,
  draftStream,
  isEditingUrls,
  editRtmpUrl,
  editStreamKey,
  editSrtUrl,
  editPlaybackUrl,
  editWhipUrl,
  onToggleEditMode,
  onSaveUrls,
  onUrlChange,
  onCopyToClipboard,
  isInviteMode = false
}) => {
  if (isInviteMode) return null;

  const renderRtmpConfig = () => (
    <div className="text-xs space-y-3 text-gray-300 bg-black/20 p-3 rounded-lg border border-white/5">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-white">Configurações de Transmissão</span>
        <div className="flex items-center space-x-2">
          {isEditingUrls && (
            <button 
              onClick={onSaveUrls}
              className="px-3 py-1 rounded text-[10px] font-bold bg-green-600/20 text-green-400 hover:bg-green-600/30"
            >
              Salvar URLs
            </button>
          )}
          <button 
            onClick={onToggleEditMode} 
            className={`px-3 py-1 rounded text-[10px] font-bold ${
              isEditingUrls ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
            }`}
          >
            {isEditingUrls ? 'Cancelar' : 'Editar URLs'}
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <label className="font-semibold text-gray-400">Servidor RTMP (Ingest)</label>
        <div className="flex items-center space-x-2">
          <input 
            type="text" 
            readOnly={!isEditingUrls} 
            value={isEditingUrls ? editRtmpUrl : (draftStream?.rtmpIngestUrl || (draftStream?.id ? `rtmp://${env.srs.host}:1935/live/${draftStream.id}` : 'Aguardando stream...'))} 
            onChange={e => onUrlChange('editRtmpUrl', e.target.value)}
            className={`flex-1 p-2 rounded-md text-white font-mono transition-colors ${
              isEditingUrls ? 'bg-[#1a1a2e] border border-blue-500/50 focus:outline-none' : 'bg-[#111] border border-white/10 select-all'
            }`} 
          />
          <button 
            onClick={() => onCopyToClipboard(isEditingUrls ? editRtmpUrl : draftStream?.rtmpIngestUrl)} 
            className="bg-[#333] hover:bg-[#444] text-white p-2 rounded-md"
          >
            <CopyIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <label className="font-semibold text-gray-400">Chave de Transmissão (Stream Key)</label>
        <div className="flex items-center space-x-2">
          <input 
            type="text" 
            readOnly={!isEditingUrls} 
            value={isEditingUrls ? editStreamKey : (draftStream?.streamKey || draftStream?.id || 'Aguardando stream...')} 
            onChange={e => onUrlChange('editStreamKey', e.target.value)}
            className={`flex-1 p-2 rounded-md text-white font-mono transition-colors ${
              isEditingUrls ? 'bg-[#1a1a2e] border border-blue-500/50 focus:outline-none' : 'bg-[#111] border border-white/10 select-all'
            }`} 
          />
          <button 
            onClick={() => onCopyToClipboard(isEditingUrls ? editStreamKey : draftStream?.streamKey)} 
            className="bg-[#333] hover:bg-[#444] text-white p-2 rounded-md"
          >
            <CopyIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-[10px] text-gray-500 pt-1 border-t border-white/5 mt-2">
        {isEditingUrls ? 'Edite os dados e clique em "Salvar URLs" acima.' : 'Copie e cole esses dados no seu software de transmissão (OBS Studio, vMix, etc).'}
      </p>
    </div>
  );

  const renderSrtConfig = () => (
    <div className="text-xs space-y-3 text-gray-300 bg-black/20 p-3 rounded-lg border border-white/5">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-white">Configurações de Transmissão SRT</span>
        <div className="flex items-center space-x-2">
          {isEditingUrls && (
            <button 
              onClick={onSaveUrls}
              className="px-3 py-1 rounded text-[10px] font-bold bg-green-600/20 text-green-400 hover:bg-green-600/30"
            >
              Salvar URLs
            </button>
          )}
          <button 
            onClick={onToggleEditMode} 
            className={`px-3 py-1 rounded text-[10px] font-bold ${
              isEditingUrls ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
            }`}
          >
            {isEditingUrls ? 'Cancelar' : 'Editar URLs'}
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <label className="font-semibold text-gray-400">URL SRT (Ingest)</label>
        <div className="flex items-center space-x-2">
          <input 
            type="text" 
            readOnly={!isEditingUrls} 
            value={isEditingUrls ? editSrtUrl : (draftStream?.srtIngestUrl || 'Gerando...')} 
            onChange={e => onUrlChange('editSrtUrl', e.target.value)}
            className={`flex-1 p-2 rounded-md text-white font-mono transition-colors ${
              isEditingUrls ? 'bg-[#1a1a2e] border border-blue-500/50 focus:outline-none' : 'bg-[#111] border border-white/10 select-all'
            }`} 
          />
          <button 
            onClick={() => onCopyToClipboard(isEditingUrls ? editSrtUrl : draftStream?.srtIngestUrl)} 
            className="bg-[#333] hover:bg-[#444] text-white p-2 rounded-md"
          >
            <CopyIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-[10px] text-gray-500 pt-1 border-t border-white/5 mt-2">
        {isEditingUrls ? 'Edite a URL e clique em "Salvar URLs" acima.' : 'Configure o RootEncoder ou outro software compatível para transmitir para o endereço SRT acima.'}
      </p>
    </div>
  );

  const renderWhipConfig = () => (
    <div className="text-xs space-y-3 text-gray-300 bg-black/20 p-3 rounded-lg border border-white/5">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-white">Configurações WebRTC (WHIP)</span>
        <div className="flex items-center space-x-2">
          {isEditingUrls && (
            <button 
              onClick={onSaveUrls}
              className="px-3 py-1 rounded text-[10px] font-bold bg-green-600/20 text-green-400 hover:bg-green-600/30"
            >
              Salvar URLs
            </button>
          )}
          <button 
            onClick={onToggleEditMode} 
            className={`px-3 py-1 rounded text-[10px] font-bold ${
              isEditingUrls ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
            }`}
          >
            {isEditingUrls ? 'Cancelar' : 'Editar URLs'}
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <label className="font-semibold text-gray-400">URL WHIP (WebRTC Ingest)</label>
        <div className="flex items-center space-x-2">
          <input 
            type="text" 
            readOnly={!isEditingUrls} 
            value={isEditingUrls ? editWhipUrl : (draftStream?.streamKey || draftStream?.id ? getWhipEndpointUrl(draftStream?.streamKey || draftStream?.id || '') : 'Aguardando stream...')} 
            onChange={e => onUrlChange('editWhipUrl', e.target.value)}
            className={`flex-1 p-2 rounded-md text-white font-mono text-[10px] transition-colors ${
              isEditingUrls ? 'bg-[#1a1a2e] border border-blue-500/50 focus:outline-none' : 'bg-[#111] border border-white/10 select-all'
            }`} 
          />
          <button 
            onClick={() => onCopyToClipboard(isEditingUrls ? editWhipUrl : (draftStream?.streamKey || draftStream?.id ? getWhipEndpointUrl(draftStream?.streamKey || draftStream?.id || '') : undefined))} 
            className="bg-[#333] hover:bg-[#444] text-white p-2 rounded-md"
          >
            <CopyIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <label className="font-semibold text-gray-400">Chave de Transmissão (Stream Key)</label>
        <div className="flex items-center space-x-2">
          <input 
            type="text" 
            readOnly 
            value={draftStream?.streamKey || draftStream?.id || 'Aguardando...'} 
            className="flex-1 p-2 rounded-md text-white font-mono bg-[#111] border border-white/10 select-all" 
          />
          <button 
            onClick={() => onCopyToClipboard(draftStream?.streamKey || draftStream?.id)} 
            className="bg-[#333] hover:bg-[#444] text-white p-2 rounded-md"
          >
            <CopyIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-[10px] text-gray-500 pt-1 border-t border-white/5 mt-2">
        {isEditingUrls ? 'Edite a URL e clique em "Salvar URLs" acima.' : 'Use esta URL no navegador para publicar via WebRTC. A stream key é seu ID de usuário.'}
      </p>
    </div>
  );

  const renderPlaybackUrl = () => (
    <div className="text-xs space-y-1 text-gray-300 bg-black/20 p-3 rounded-lg border border-white/5">
      <div className="flex items-center justify-between mb-2">
        <label className="font-semibold text-gray-400">URL de Playback (HLS)</label>
        {!isEditingUrls && (
          <button onClick={onToggleEditMode} className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px] hover:bg-blue-500/30">
            Editar
          </button>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <input 
          type="text" 
          readOnly={!isEditingUrls} 
          value={isEditingUrls ? editPlaybackUrl : (draftStream?.playbackUrl || (draftStream?.id ? `https://livego.store:8080/live/${draftStream.id}.m3u8` : 'Aguardando stream...'))} 
          onChange={e => onUrlChange('editPlaybackUrl', e.target.value)}
          className={`flex-1 p-2 rounded-md text-white font-mono text-[10px] transition-colors ${
            isEditingUrls ? 'bg-[#1a1a2e] border border-blue-500/50 focus:outline-none' : 'bg-[#111] border border-white/10 select-all'
          }`} 
        />
        <button 
          onClick={() => onCopyToClipboard(isEditingUrls ? editPlaybackUrl : draftStream?.playbackUrl)} 
          className="bg-[#333] hover:bg-[#444] text-white p-2 rounded-md"
        >
          <CopyIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {streamType === 'RTMP' && renderRtmpConfig()}
      {streamType === 'SRT' && renderSrtConfig()}
      {streamType === 'WebRTC' && renderWhipConfig()}
      {(streamType === 'RTMP' || streamType === 'SRT' || streamType === 'WebRTC') && renderPlaybackUrl()}
    </>
  );
};
