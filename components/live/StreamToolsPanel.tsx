import React from 'react';
import { BookOpenIcon, SparklesIcon, PKIcon, LockIcon, ChevronRightIcon, CameraIcon } from '../icons';
import { useTranslation } from '../../i18n';
import { getPreferredCameraResolution, CameraResolution } from '../../services/cameraService';

interface StreamToolsPanelProps {
  onOpenManual: () => void;
  onOpenBeautyPanel: () => void;
  isPrivate: boolean;
  onTogglePrivate: () => void;
  isInviteMode?: boolean;
  onSelectCameraResolution?: (resolution: CameraResolution) => void;
}

const RESOLUTION_LABELS: Record<CameraResolution, string> = {
  '1080p': '1080p (Full HD)',
  '720p': '720p (HD)',
  '480p': '480p (Padrão)',
  '360p': '360p (Fluente)',
  'auto': 'Auto (nativo)',
};

export const StreamToolsPanel: React.FC<StreamToolsPanelProps> = ({
  onOpenManual,
  onOpenBeautyPanel,
  isPrivate,
  onTogglePrivate,
  isInviteMode = false,
  onSelectCameraResolution
}) => {
  const { t } = useTranslation();
  const [resOpen, setResOpen] = React.useState(false);
  const [currentRes, setCurrentRes] = React.useState<CameraResolution>(getPreferredCameraResolution());

  const handleSelectRes = (res: CameraResolution) => {
    setCurrentRes(res);
    setResOpen(false);
    onSelectCameraResolution?.(res);
  };

  return (
    <div className="bg-[#121212]/95 rounded-[16px] p-4 text-white">
      <h3 className="text-center font-bold text-[15px] mb-4">Configurações da Live</h3>
      
      <div className="space-y-0">
        <button 
          onClick={onOpenManual} 
          className="flex items-center justify-between py-3.5 border-t border-[#ffffff10] w-full transition-colors active:bg-white/5"
        >
          <div className="flex items-center space-x-3">
            <BookOpenIcon className="w-5 h-5 text-gray-400" />
            <span className="text-[14px] font-medium text-[#e2e2e2]">Manual de Transmissão ao Vivo</span>
          </div>
          <ChevronRightIcon className="w-4 h-4 text-gray-500" />
        </button>

        <button 
          onClick={onOpenBeautyPanel} 
          className="flex items-center justify-between py-3.5 border-t border-[#ffffff10] w-full transition-colors active:bg-white/5"
        >
          <div className="flex items-center space-x-3">
            <SparklesIcon className="w-5 h-5 text-gray-400" />
            <span className="text-[14px] font-medium text-[#e2e2e2]">Efeitos de Beleza</span>
          </div>
          <ChevronRightIcon className="w-4 h-4 text-gray-500" />
        </button>

        {/* 📐 Resolução da CÂMERA (broadcaster) — salva no banco */}
        {onSelectCameraResolution && (
          <div className="border-t border-[#ffffff10]">
            <button 
              onClick={() => setResOpen(o => !o)} 
              className="flex items-center justify-between py-3.5 w-full transition-colors active:bg-white/5"
            >
              <div className="flex items-center space-x-3">
                <CameraIcon className="w-5 h-5 text-gray-400" />
                <span className="text-[14px] font-medium text-[#e2e2e2]">Resolução da Câmera</span>
              </div>
              <span className="text-[13px] text-[#00e5ff] font-semibold">{RESOLUTION_LABELS[currentRes]}</span>
            </button>
            {resOpen && (
              <div className="pb-2 space-y-1">
                {(Object.keys(RESOLUTION_LABELS) as CameraResolution[]).map(res => (
                  <button
                    key={res}
                    onClick={() => handleSelectRes(res)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-medium transition-colors ${
                      currentRes === res ? 'bg-[#bd00ff]/25 text-white border border-[#bd00ff]/50' : 'text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    {RESOLUTION_LABELS[res]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}



        {!isInviteMode && (
          <>
            <div className="flex items-center justify-between py-3.5 border-t border-[#ffffff10]">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded text-[10px] font-bold px-1 py-0.5 text-white flex items-center justify-center tracking-tighter">PK</div>
                <span className="text-[14px] font-medium text-[#e2e2e2]">Batalha PK</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-[#2a2a2e] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#9747FF]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-3.5 border-t border-[#ffffff10]">
              <div className="flex items-center space-x-3">
                <LockIcon className="w-5 h-5 text-gray-400" />
                <span className="text-[14px] font-medium text-[#e2e2e2]">Sala Privada</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isPrivate} 
                  onChange={onTogglePrivate} 
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-[#2a2a2e] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#9747FF]"></div>
              </label>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

