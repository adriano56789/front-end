import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n';
import { api } from '../services/api';

// Ícone isolado para não depender da biblioteca de ícones caso não exista
const TrashOutlineIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.134H8.09c-1.18 0-2.09.954-2.09 2.134v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

interface BlockReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBlock: () => void;
  onReport: () => void;
  onUnfriend?: () => void;
  onDeleteMessages?: () => void;
  currentUser?: any;
  targetUser?: any;
}

const BlockReportModal: React.FC<BlockReportModalProps> = ({ 
  isOpen, 
  onClose, 
  onBlock, 
  onReport, 
  onUnfriend, 
  onDeleteMessages, 
  currentUser, 
  targetUser 
}) => {
  const { t } = useTranslation();
  const [blockStatus, setBlockStatus] = useState<{
    canBlock: boolean;
    reason: string;
    restrictions: string[];
    message: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && currentUser && targetUser) {
      checkBlockStatus();
    }
  }, [isOpen, currentUser, targetUser]);

  const checkBlockStatus = async () => {
    if (!currentUser?.id || !targetUser?.id) return;
    
    setIsLoading(true);
    try {
      const response = await api.checkBlockStatus(currentUser.id, targetUser.id);
      setBlockStatus(response);
    } catch (error) {
      console.error('Erro ao verificar status de bloqueio:', error);
      // Em caso de erro, permitir bloqueio por segurança
      setBlockStatus({
        canBlock: true,
        reason: '',
        restrictions: [],
        message: 'Bloqueio permitido'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBlock = async () => {
    if (!currentUser?.id || !targetUser?.id) return;
    
    try {
      // Registrar tentativa de bloqueio para auditoria
      await api.registerBlockAttempt(currentUser.id, targetUser.id, 'Bloqueio via chat privado', true);
      
      // Executar bloqueio
      onBlock();
    } catch (error) {
      console.error('Erro ao registrar tentativa de bloqueio:', error);
      // Mesmo em caso de erro, permitir bloqueio
      onBlock();
    }
  };

  const getBlockButtonContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
          <span>Verificando...</span>
        </div>
      );
    }

    if (!blockStatus) {
      return 'Bloquear';
    }

    if (!blockStatus.canBlock) {
      return (
        <div className="flex flex-col items-center">
          <span className="text-[#ff3b30]">Bloquear</span>
          <span className="text-[10px] text-gray-400 mt-0.5">{blockStatus.reason}</span>
        </div>
      );
    }

    return 'Bloquear';
  };

  const getRestrictionTooltip = () => {
    if (!blockStatus?.canBlock && blockStatus?.restrictions && blockStatus.restrictions.length > 0) {
      const restrictionDetails = {
        'withdrawal_pending': 'Transações financeiras pendentes (saques em processamento)',
        'target_withdrawal_pending': 'O outro usuário tem transações pendentes',
        'recent_disputes': 'Disputas recentes detectadas',
        'excessive_blocks': 'Múltiplas tentativas de bloqueio recentes',
        'new_user_protection': 'Proteção para usuários recentes (menos de 7 dias)'
      };

      return blockStatus.restrictions
        .map(restriction => restrictionDetails[restriction as keyof typeof restrictionDetails] || restriction)
        .join('\n');
    }
    return '';
  };

  return (
    <div 
        className={`absolute inset-0 z-50 flex items-end justify-center transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-modal="true"
        role="dialog"
    >
        <div 
            className={`w-full max-w-md transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
            onClick={e => e.stopPropagation()}
        >
            <div className="px-2 pb-6 space-y-2">
                {/* Alerta de proteção se necessário */}
                {blockStatus && !blockStatus.canBlock && (
                    <div className="bg-yellow-900/80 border border-yellow-600 rounded-xl p-3 mb-2 mx-2">
                        <div className="flex items-center space-x-2">
                            <span className="text-yellow-400 text-lg">⚠️</span>
                            <div className="flex-1">
                                <h4 className="text-yellow-300 font-semibold text-sm">Proteção Anti-Golpe</h4>
                                <p className="text-yellow-200 text-xs mt-1">
                                    {blockStatus.message}
                                </p>
                                <p className="text-yellow-100 text-xs mt-2 opacity-75">
                                    Esta medida previne golpes e bloqueios abusivos após transações financeiras.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-[#1c1c1e] rounded-[14px] mx-2 overflow-hidden flex flex-col">
                    {onDeleteMessages && (
                        <>
                            <button 
                                onClick={onDeleteMessages} 
                                className="w-full py-4 px-4 flex items-center justify-center space-x-2 text-[#fd8b1f] text-[18px] transition-colors active:bg-[#2c2c2e]"
                            >
                                <TrashOutlineIcon className="w-5 h-5 mb-0.5" />
                                <span>Apagar Mensagens</span>
                            </button>
                            <div className="h-[1px] bg-[#38383a] w-full"></div>
                        </>
                    )}
                    {onUnfriend && (
                        <>
                            <button 
                                onClick={onUnfriend} 
                                className="w-full py-4 px-4 text-white text-[18px] transition-colors active:bg-[#2c2c2e]"
                            >
                                {t('common.unfriend')}
                            </button>
                            <div className="h-[1px] bg-[#38383a] w-full"></div>
                        </>
                    )}
                    <button 
                        onClick={handleBlock}
                        disabled={!blockStatus?.canBlock || isLoading}
                        className={`w-full py-4 text-center text-[18px] transition-all ${
                            !blockStatus?.canBlock || isLoading
                                ? 'text-gray-500 cursor-not-allowed'
                                : 'text-[#ff3b30] active:bg-[#2c2c2e]'
                        }`}
                        title={getRestrictionTooltip()}
                    >
                        {getBlockButtonContent()}
                    </button>
                    <div className="h-[1px] bg-[#38383a] w-full"></div>
                    <button 
                        onClick={onReport} 
                        className="w-full py-4 text-white text-center text-[18px] transition-colors active:bg-[#2c2c2e]"
                    >
                        Relatório
                    </button>
                    <div className="h-[1px] bg-[#38383a] w-full"></div>
                    <button 
                        onClick={onClose} 
                        className="w-full py-4 text-white text-center text-[18px] font-medium transition-colors active:bg-[#2c2c2e]"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default BlockReportModal;