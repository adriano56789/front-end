import React, { useState, useEffect } from 'react';
import { CloseIcon, CheckIcon, VideoIcon } from '../icons';
import { ffmpegService, FFMPEG_PRESETS, FfmpegFilterConfig, FfmpegTranscodePreset } from '../../services/ffmpegService';

interface FfmpegSettingsPanelProps {
  streamId: string;
  onClose: () => void;
  addToast: (type: any, message: string) => void;
}

const FfmpegSettingsPanel: React.FC<FfmpegSettingsPanelProps> = ({ streamId, onClose, addToast }) => {
  const [selectedPresetId, setSelectedPresetId] = useState('720p_hd');
  const [filters, setFilters] = useState<FfmpegFilterConfig>({
    watermarkEnabled: false,
    watermarkText: 'LiveGo',
    watermarkPosition: 'top-right',
    noiseSuppression: false,
    audioNormalize: false,
    contrast: 1.0,
    brightness: 0.0,
    saturation: 1.0,
  });

  // Load existing session settings if any
  useEffect(() => {
    const session = ffmpegService.getActiveSession(streamId);
    if (session) {
      setSelectedPresetId(session.presetId);
      setFilters(session.filters);
    }
  }, [streamId]);

  const handleToggleFilter = (key: keyof FfmpegFilterConfig) => {
    setFilters((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleFilterChange = (key: keyof FfmpegFilterConfig, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    try {
      const res = await ffmpegService.setupServerTranscode(streamId, selectedPresetId, filters);
      if (res.success) {
        addToast('success', 'Configurações de processamento FFmpeg aplicadas ao SRS!');
        onClose();
      } else {
        addToast('error', 'Falha ao aplicar configurações de transcodificação.');
      }
    } catch (err) {
      console.error(err);
      addToast('error', 'Erro ao salvar configurações do FFmpeg.');
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/60 transition-opacity duration-300" onClick={onClose}>
      <div 
        className="bg-[#131124] w-full max-w-md rounded-t-[2.2rem] shadow-[0_-8px_32px_rgba(0,0,0,0.6)] text-white transform transition-transform duration-300 ease-out border-t border-white/[0.04] p-6 pb-8 h-[75vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <div className="bg-[#bd00ff]/20 p-1.5 rounded-lg text-[#bd00ff]">
              <VideoIcon className="w-5 h-5" />
            </div>
            <h2 className="text-[18px] font-bold text-white tracking-tight font-sans">Pipeline FFmpeg & SRS</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors cursor-pointer p-1">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <p className="text-gray-400 text-[13px] leading-relaxed font-sans font-light mb-5 flex-shrink-0">
          Ajuste as configurações do FFmpeg que serão aplicadas pelo servidor SRS para converter e processar o vídeo da sua live em tempo real.
        </p>

        <div className="flex-1 overflow-y-auto pr-1 space-y-6">
          {/* Preset transcode section */}
          <div>
            <h3 className="text-gray-300 font-semibold text-[14px] mb-3">Qualidade de Saída (Transcodificação SRS)</h3>
            <div className="space-y-2">
              {FFMPEG_PRESETS.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => setSelectedPresetId(preset.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between border ${
                      isSelected
                        ? 'bg-[#bd00ff]/15 border-[#bd00ff] text-white font-medium'
                        : 'bg-white/[0.03] border-transparent text-gray-300 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div>
                      <div className="text-[14px] font-semibold">{preset.name}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        {preset.videoCodec !== 'copy' 
                          ? `${preset.videoCodec} | ${preset.videoBitrate}kbps | ${preset.fps}fps` 
                          : 'Envio original sem compressão extra'}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="bg-[#bd00ff] p-1 rounded-full text-white">
                        <CheckIcon className="w-3.5 h-3.5" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filters section */}
          <div className="space-y-4 pt-2 border-t border-white/[0.05]">
            <h3 className="text-gray-300 font-semibold text-[14px]">Filtros de Vídeo & Áudio (FFmpeg filters)</h3>

            {/* Overlap Watermark toggle */}
            <div className="bg-white/[0.02] p-4 rounded-xl border border-white/[0.04]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[14px] font-semibold text-gray-200">Sobreposição de Marca D'água</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">Adiciona marca d'água de texto no vídeo usando drawtext</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.watermarkEnabled}
                    onChange={() => handleToggleFilter('watermarkEnabled')}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-[#2a2a2e] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#bd00ff]"></div>
                </label>
              </div>

              {filters.watermarkEnabled && (
                <div className="mt-4 space-y-3 animate-fadeIn">
                  <div>
                    <label className="text-[11px] text-gray-400 block mb-1">Texto da Marca D'água</label>
                    <input
                      type="text"
                      value={filters.watermarkText || ''}
                      onChange={(e) => handleFilterChange('watermarkText', e.target.value)}
                      placeholder="Texto..."
                      className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-2 text-[13px] text-white placeholder-gray-500 focus:outline-none focus:border-[#bd00ff]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 block mb-1">Posição na Tela</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((pos) => (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => handleFilterChange('watermarkPosition', pos)}
                          className={`py-1.5 px-2 rounded-md text-[11px] font-medium border text-center ${
                            filters.watermarkPosition === pos
                              ? 'bg-[#bd00ff] border-transparent text-white'
                              : 'bg-white/[0.03] border-white/[0.08] text-gray-300 hover:bg-white/[0.06]'
                          }`}
                        >
                          {pos === 'top-left' && 'Superior Esquerdo'}
                          {pos === 'top-right' && 'Superior Direito'}
                          {pos === 'bottom-left' && 'Inferior Esquerdo'}
                          {pos === 'bottom-right' && 'Inferior Direito'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Audio Noise Suppression toggle */}
            <div className="flex items-center justify-between bg-white/[0.02] p-4 rounded-xl border border-white/[0.04]">
              <div>
                <div className="text-[14px] font-semibold text-gray-200">Supressão de Ruído de Áudio</div>
                <div className="text-[11px] text-gray-400 mt-0.5">Aplica o filtro de redução de ruído de FFT (afftdn)</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.noiseSuppression}
                  onChange={() => handleToggleFilter('noiseSuppression')}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-[#2a2a2e] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#bd00ff]"></div>
              </label>
            </div>

            {/* Audio Loudness Normalization toggle */}
            <div className="flex items-center justify-between bg-white/[0.02] p-4 rounded-xl border border-white/[0.04]">
              <div>
                <div className="text-[14px] font-semibold text-gray-200">Normalização de Volume</div>
                <div className="text-[11px] text-gray-400 mt-0.5">Aplica normalização de áudio profissional (loudnorm)</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.audioNormalize}
                  onChange={() => handleToggleFilter('audioNormalize')}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-[#2a2a2e] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#bd00ff]"></div>
              </label>
            </div>

            {/* Contrast adjustment */}
            <div className="bg-white/[0.02] p-4 rounded-xl border border-white/[0.04]">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[14px] font-semibold text-gray-200">Ajuste de Imagem (eq filter)</span>
                <span className="text-[11px] text-gray-400">Contraste: {filters.contrast?.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={filters.contrast ?? 1.0}
                onChange={(e) => handleFilterChange('contrast', parseFloat(e.target.value))}
                className="w-full accent-[#bd00ff] bg-white/10 h-1 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 flex-shrink-0">
          <button
            onClick={handleSave}
            className="w-full bg-[#bd00ff] hover:bg-[#a600e0] text-white font-bold py-3.5 rounded-full transition-colors font-sans shadow-lg shadow-[#bd00ff]/20 text-[15px]"
          >
            Aplicar ao SRS
          </button>
        </div>
      </div>
    </div>
  );
};

export default FfmpegSettingsPanel;
