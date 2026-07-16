import React, { useState, useEffect } from 'react';
import { DiamondPackage, ToastType } from '../types';
import { useTranslation } from '../i18n';
import { api } from '../services/api';
import { BackIcon, GoldCoinWithGIcon, PixIcon, CreditCardIcon, CheckCircleIcon, CopyIcon, LockIcon, QuestionMarkIcon } from './icons';

interface ConfirmPurchaseScreenProps {
  onClose: () => void;
  packageDetails: {
    diamonds: number;
    price: number;
  };
  onConfirmPurchase: (pkg: { diamonds: number; price: number }) => void;
  addToast: (type: ToastType, message: string) => void;
  currentUser: { id: string };
}

const InputField: React.FC<{
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    className?: string;
    type?: string;
    label: string;
    disabled?: boolean;
}> = ({ value, onChange, placeholder, className = '', type = 'text', label, disabled = false }) => (
    <div className={`flex-1 ${className}`}>
        <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder || label}
            aria-label={label}
            disabled={disabled}
            className="w-full bg-[#2c2c2e] border border-gray-600 rounded-md p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:bg-gray-800 disabled:text-gray-400"
        />
    </div>
);

// Helper function to calculate CRC16 (CCITT-FALSE) required by Pix standard
const calculateCRC16 = (str: string) => {
    let crc = 0xFFFF;
    for (let i = 0; i < str.length; i++) {
        let c = str.charCodeAt(i);
        crc ^= c << 8;
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc = crc << 1;
            }
        }
        crc = crc & 0xFFFF; // Ensure 16-bit
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
};

const generatePixCode = (amount: number, transactionId: string, merchantKey: string) => {
    const amountStr = amount.toFixed(2);
    
    // Construct Merchant Account Info (ID 26)
    const gui = "0014BR.GOV.BCB.PIX";
    const key = `01${merchantKey.length.toString().padStart(2, '0')}${merchantKey}`;
    const merchantAccountInfoContent = gui + key;
    const merchantAccountInfo = `26${merchantAccountInfoContent.length.toString().padStart(2, '0')}${merchantAccountInfoContent}`;

    // Construct Additional Data Field (ID 62) containing TxID
    const txId = transactionId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 25) || "***";
    const additionalDataContent = `05${txId.length.toString().padStart(2, '0')}${txId}`;
    const additionalData = `62${additionalDataContent.length.toString().padStart(2, '0')}${additionalDataContent}`;

    // Helper to format generic fields
    const f = (id: string, value: string) => `${id}${value.length.toString().padStart(2, '0')}${value}`;

    const payloadWithoutCRC = [
        f('00', '01'),
        merchantAccountInfo,
        f('52', '0000'),
        f('53', '986'),
        f('54', amountStr),
        f('58', 'BR'),
        f('59', 'LiveGo Diamonds'),
        f('60', 'SAO PAULO'),
        additionalData,
        '6304' // ID 63 + Length 04
    ].join('');

    const crc = calculateCRC16(payloadWithoutCRC);
    return payloadWithoutCRC + crc;
};


const ConfirmPurchaseScreen: React.FC<ConfirmPurchaseScreenProps> = ({ onClose, packageDetails, onConfirmPurchase, addToast, currentUser }) => {
  const { t } = useTranslation();
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'pix'>('pix');
  
  const [timeLeft, setTimeLeft] = useState(598); // 09:58
  const [orderId, setOrderId] = useState<string | null>(null);
  const [pixStatus, setPixStatus] = useState<'pending' | 'confirmed'>('pending');
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [isLoadingPix, setIsLoadingPix] = useState(false);
  
  // Fixed Pix key for the merchant
  const pixKeyString = "livego@livego.com";
  
  // Card Form State
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize Order and Fetch Pix Code if needed
  useEffect(() => {
      const initOrder = async () => {
          try {
              // 1. Create Order on Backend with correct user ID
              const order = await api.createOrder(currentUser.id, 'pkg_custom', packageDetails.price, packageDetails.diamonds);
              setOrderId(order.id);

              if (paymentMethod === 'pix') {
                  setIsLoadingPix(true);
                  // 2. Fetch Pix Details from Backend
                  const pixData = await api.processPixPayment(order.id);
                  const code = pixData.pixCode || (pixData as any).qr_code || '';
                  const qr = pixData.qrCode || (pixData as any).qr_code_base64 || '';
                  setPixCode(code);
                  setQrCodeBase64(qr && !qr.startsWith('data:') ? `data:image/png;base64,${qr}` : qr);
                  setIsLoadingPix(false);
              }
          } catch (error) {
              addToast(ToastType.Error, "Erro ao iniciar pedido.");
              setIsLoadingPix(false);
          }
      };
      
      initOrder();
  }, [packageDetails, paymentMethod, addToast, currentUser.id]);

  // Timer Effect
  useEffect(() => {
    if (paymentMethod === 'pix' && timeLeft > 0) {
      const timerId = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearInterval(timerId);
    }
  }, [paymentMethod, timeLeft]);

  // Poll for Pix Status
  useEffect(() => {
    if (paymentMethod === 'pix' && pixStatus === 'pending' && pixCode && orderId) {
        const checkStatus = async () => {
            try {
                const statusResponse = await api.checkPixPaymentStatus(orderId);
                
                if (statusResponse.success && statusResponse.status === 'approved') {
                    setPixStatus('confirmed');
                    addToast(ToastType.Success, "Pagamento via Pix confirmado!");
                    
                    // Aguardar um pouco e depois confirmar a compra
                    setTimeout(() => {
                        onConfirmPurchase(packageDetails);
                    }, 1500);
                } else if (statusResponse.status === 'rejected' || statusResponse.status === 'cancelled') {
                    addToast(ToastType.Error, "Pagamento não aprovado. Tente novamente.");
                    setPixStatus('pending'); // Manter como pending para permitir nova tentativa
                }
            } catch (error) {
                // Erro ao verificar status
            }
        };

        // Verificar status a cada 5 segundos
        const interval = setInterval(checkStatus, 5000);
        
        // Verificar imediatamente na primeira vez
        checkStatus();

        return () => clearInterval(interval);
    }
  }, [paymentMethod, pixStatus, pixCode, orderId, addToast, onConfirmPurchase, packageDetails]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')} : ${String(s).padStart(2, '0')}`;
  };

  const handleCopyPixCode = () => {
    if (pixCode) {
        navigator.clipboard.writeText(pixCode);
        addToast(ToastType.Success, "Código Pix Copia e Cola copiado!");
    }
  };

  const handleCopyPixKey = () => {
    navigator.clipboard.writeText(pixKeyString);
    addToast(ToastType.Success, "Chave Pix copiada!");
  };

  const handleConfirm = async () => {
    if (paymentMethod === 'credit_card') {
        if (!cardNumber || !cardName || !cardExpiry || !cardCvv) {
            addToast(ToastType.Error, t('confirmPurchase.pleaseFillCard'));
            return;
        }

        setIsProcessing(true);
        try {
            // Carregar SDK do Mercado Pago dinamicamente
            const MercadoPago = (window as any).MercadoPago;
            if (!MercadoPago) {
                throw new Error("SDK do Mercado Pago não carregado");
            }

            // Inicializar SDK
            const mp = new MercadoPago('APP_USR-dac29668-9ab3-483f-ad46-8216c93786b2', {
                locale: 'pt-BR'
            });
            
            // Gerar token seguro do cartão
            const tokenResult = await mp.createCardToken({
                cardNumber: cardNumber.replace(/\s/g, ''),
                cardholderName: cardName,
                cardExpirationMonth: cardExpiry.split('/')[0],
                cardExpirationYear: '20' + cardExpiry.split('/')[1],
                securityCode: cardCvv,
                identificationType: 'CPF',
                identificationNumber: '00000000000'
            });
            
            if (!tokenResult.id) {
                throw new Error("Não foi possível gerar o token do cartão");
            }
            
            // Processar pagamento com o token seguro
            const paymentResult = await api.processCreditCardPayment({
                orderId,
                cardToken: tokenResult.id, // Apenas o token seguro
                payerEmail: (currentUser as any).email || 'user@livego.store',
                payerName: cardName,
                installments: 1
            });

            if (paymentResult.success) {
                // Pagamento aprovado - chamar callback para atualizar usuário
                onConfirmPurchase(packageDetails);
            } else {
                throw new Error("Payment declined");
            }
        } catch (error: any) {
            console.error('Erro no pagamento:', error);
            let errorMessage = "Pagamento falhou.";
            
            if (error.message?.includes('token')) {
                errorMessage = "Erro no cartão. Verifique os dados.";
            } else if (error.message?.includes('SDK')) {
                errorMessage = "Erro ao carregar sistema de pagamento.";
            } else if (error.cause?.[0]?.description) {
                errorMessage = error.cause[0].description;
            }
            
            addToast(ToastType.Error, errorMessage);
        } finally {
            setIsProcessing(false);
        }
    } else if (paymentMethod === 'pix') {
         // Manual confirmation check button (optional, since we have auto-poll)
         try {
            onConfirmPurchase(packageDetails);
         } catch(e) {
             addToast(ToastType.Info, "Pagamento ainda pendente.");
         }
    }
  };

  return (
    <div className="absolute inset-0 bg-black z-50 flex flex-col text-white font-sans">
      {/* Header */}
      <header className="flex items-center p-5 border-b border-white/[0.04] flex-shrink-0 bg-black">
        <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-white/5 transition-colors">
          <BackIcon className="w-6 h-6 text-white" />
        </button>
        <h1 className="flex-grow text-center text-lg font-bold tracking-wide">Checkout</h1>
        <div className="w-10"></div> {/* Spacer to center the title */}
      </header>

      <main className="flex-grow overflow-y-auto px-5 py-6 space-y-6 no-scrollbar bg-black">
        
        {/* Product Card */}
        <div className="bg-[#131317] rounded-[24px] p-4 flex items-center shadow-lg border border-white/[0.04]">
            <div className="w-16 h-16 rounded-[18px] bg-gradient-to-br from-amber-400/20 to-yellow-600/10 flex items-center justify-center flex-shrink-0 mr-4 border border-yellow-500/10">
                 <GoldCoinWithGIcon className="w-12 h-12" />
            </div>
            <div className="flex-grow">
                <h3 className="font-bold text-base text-zinc-100 tracking-wide">{packageDetails.diamonds.toLocaleString('pt-BR')} Diamonds Pack</h3>
                <p className="text-zinc-500 text-xs mt-0.5 font-mono">Order #{orderId || '884502'}</p>
            </div>
            <div className="text-right">
                 <span className="font-bold text-lg text-[#2ebd59] tracking-tight">R$ {packageDetails.price.toFixed(2).replace('.', ',')}</span>
            </div>
        </div>

        {/* Payment Method Tabs */}
        <div className="bg-[#131317] p-1.5 rounded-[18px] flex border border-white/[0.04]">
             <button 
                onClick={() => setPaymentMethod('pix')}
                className={`flex-1 flex items-center justify-center py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                    paymentMethod === 'pix' 
                    ? 'bg-white text-black shadow-md' 
                    : 'text-[#6b6c7a] hover:text-white bg-transparent'
                }`}
            >
                <PixIcon className={`w-5 h-5 mr-2 ${paymentMethod === 'pix' ? 'text-[#32BCAD]' : 'text-gray-500'}`} />
                Pix
            </button>
            <button 
                onClick={() => setPaymentMethod('credit_card')}
                className={`flex-1 flex items-center justify-center py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                    paymentMethod === 'credit_card' 
                    ? 'bg-white text-black shadow-md' 
                    : 'text-[#6b6c7a] hover:text-white bg-transparent'
                }`}
            >
                <CreditCardIcon className={`w-5 h-5 mr-1.5 ${paymentMethod === 'credit_card' ? 'text-black' : 'text-[#6b6c7a]'}`} />
                Cartão de Crédito
            </button>
        </div>

        {/* Payment Content */}
        {paymentMethod === 'pix' ? (
            <div className="flex flex-col items-center space-y-6 animate-fade-in-up">
                
                {/* Status Pill */}
                <div className="flex flex-col items-center space-y-3">
                    {pixStatus === 'pending' ? (
                        <div className="bg-[#ffb000]/10 border border-[#ffb000]/20 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center space-x-2 text-[#ffb000]">
                            <span className="w-2 h-2 bg-[#ffb000] rounded-full animate-ping"></span>
                            <span>Aguardando Pagamento...</span>
                        </div>
                    ) : (
                        <div className="bg-green-500/10 text-green-400 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center space-x-2">
                            <CheckCircleIcon className="w-4 h-4 text-green-400" />
                            <span>Pagamento Confirmado!</span>
                        </div>
                    )}
                    <div className="text-5xl font-black font-sans tracking-wide text-white select-none">
                        {formatTime(timeLeft)}
                    </div>
                </div>

                {/* QR Code Container with sleek glow */}
                <div className="relative group">
                    <div className="absolute -inset-1 bg-white/10 rounded-[32px] blur-xl opacity-75 transition duration-1000"></div>
                    <div className={`relative bg-white p-5 rounded-[28px] shadow-2xl transition-all duration-500 ${pixStatus === 'confirmed' ? 'opacity-50 grayscale' : 'opacity-100'} w-[230px] h-[230px] flex flex-col items-center justify-between`}>
                        {isLoadingPix ? (
                            <div className="flex-grow flex items-center justify-center">
                                <div className="animate-spin rounded-full h-10 w-10 border-4 border-t-transparent border-[#32BCAD]"></div>
                            </div>
                        ) : qrCodeBase64 ? (
                            <div className="flex-grow flex items-center justify-center">
                                <img 
                                    src={qrCodeBase64}
                                    alt="Pix QR Code" 
                                    className="w-40 h-40 object-contain mix-blend-multiply"
                                />
                            </div>
                        ) : (
                            <div className="flex-grow flex items-center justify-center">
                                <p className="text-zinc-400 text-xs text-center font-medium">QR Code não disponível</p>
                            </div>
                        )}
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide mt-2">Escaneie o QR Code para pagar</span>
                    </div>
                </div>
                
                {/* Copy Pix Code block */}
                <div className="w-full space-y-2 px-1">
                    <p className="text-[11px] text-[#6b6c7a] font-bold uppercase tracking-wider ml-1">Pix Copia e Cola</p>
                    <div className="bg-[#131317] rounded-2xl flex items-center p-1.5 pl-4 border border-white/[0.04] h-[58px]">
                        <div className="flex-grow overflow-hidden mr-3">
                            <p className="text-zinc-200 text-[13px] truncate font-mono select-all opacity-80">
                                {pixCode || "e3558240910302024a)seh4rtkw/0:h10920922232663..."}
                            </p>
                        </div>
                        <button 
                            onClick={handleCopyPixCode}
                            className="bg-[#24d366] hover:bg-[#20ba59] active:scale-95 text-black w-11 h-11 rounded-xl flex items-center justify-center transition-all shadow-lg flex-shrink-0"
                        >
                            <CopyIcon className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>
                
                {pixStatus === 'pending' && (
                    <p className="text-[#6b6c7a] text-xs text-center px-4 leading-relaxed">
                        Faça o pagamento no seu app de banco. <br/>A confirmação é automática.
                    </p>
                )}

            </div>
        ) : (
            <div className="space-y-5 animate-fade-in-up px-1">
                {/* Credit Card Form */}
                <div>
                    <label className="block text-xs font-bold text-[#6b6c7a] mb-2 uppercase tracking-wider ml-1">Número do Cartão</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="0000 0000 0000 0000"
                            className="w-full bg-[#131317] border border-white/[0.04] rounded-2xl px-4 py-4 text-white focus:border-green-500 focus:outline-none transition-colors placeholder-[#6b6c7a] font-mono text-sm"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value)}
                        />
                        <LockIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#24d366]" />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-[#6b6c7a] mb-2 uppercase tracking-wider ml-1">Nome no Cartão</label>
                    <input 
                        type="text" 
                        placeholder="Como está escrito no cartão"
                        className="w-full bg-[#131317] border border-white/[0.04] rounded-2xl px-4 py-4 text-white focus:border-green-500 focus:outline-none transition-colors placeholder-[#6b6c7a] text-sm"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                    />
                </div>

                <div className="flex space-x-4">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-[#6b6c7a] mb-2 uppercase tracking-wider ml-1">Validade</label>
                        <input 
                            type="text" 
                            placeholder="MM/AA"
                            className="w-full bg-[#131317] border border-white/[0.04] rounded-2xl px-4 py-4 text-white focus:border-green-500 focus:outline-none transition-colors placeholder-[#6b6c7a] text-center text-sm"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                        />
                    </div>
                     <div className="flex-1">
                        <div className="flex justify-between items-center mb-2 px-1">
                             <label className="block text-xs font-bold text-[#6b6c7a] uppercase tracking-wider">CVV</label>
                             <QuestionMarkIcon className="w-3.5 h-3.5 text-zinc-500" />
                        </div>
                        <input 
                            type="text" 
                            placeholder="123"
                            maxLength={4}
                            className="w-full bg-[#131317] border border-white/[0.04] rounded-2xl px-4 py-4 text-white focus:border-green-500 focus:outline-none transition-colors placeholder-[#6b6c7a] text-center text-sm"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                        />
                    </div>
                </div>
            </div>
        )}

      </main>

      {/* Footer */}
      <footer className="p-5 pb-8 bg-black border-t border-white/[0.04]">
        {paymentMethod === 'pix' && pixStatus === 'pending' ? (
            <div className="w-full bg-[#131317] border border-white/[0.04] rounded-2xl py-4 flex items-center justify-center space-x-3 h-[58px] mx-auto max-w-full">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#6b6c7a] border-t-white"></div>
                <span className="text-zinc-300 font-medium text-sm">Aguardando confirmação do banco...</span>
            </div>
        ) : (
             <button
              onClick={handleConfirm}
              disabled={isProcessing}
              className={`w-full text-white font-bold text-base py-4 rounded-[18px] shadow-lg transform transition-all active:scale-[0.98] flex items-center justify-center space-x-2 ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''} ${paymentMethod === 'pix' ? 'bg-[#2ebd59] hover:bg-[#20ba59] text-black shadow-lg shadow-[#ebd59]/20' : 'bg-purple-600 hover:bg-purple-700'}`}
            >
                {isProcessing ? (
                    <span>Processando...</span>
                ) : (
                    paymentMethod === 'pix' ? (
                        <span>Liberar Diamantes Agora</span>
                    ) : (
                        <span>Confirmar Pagamento</span>
                    )
                )}
            </button>
        )}
       
        <div className="mt-5 relative flex items-center justify-center text-[#6b6c7a] space-x-1.5 select-none">
            <LockIcon className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold tracking-widest uppercase mb-[1px]">Pagamento Seguro</span>
            {/* Tick shield icon on the bottom right as featured in the mockup */}
            <div className="absolute right-1 bottom-[-3px] opacity-70">
                <svg className="w-5 h-5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="currentColor" fillOpacity="0.05" />
                    <path d="m9 12 2 2 4-4" />
                </svg>
            </div>
        </div>
      </footer>
    </div>
  );
};

export default ConfirmPurchaseScreen;
