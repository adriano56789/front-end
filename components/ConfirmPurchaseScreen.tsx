import React from 'react';
import { ToastType, PurchaseCurrency, CadastralData } from '../types';

// ═══ MERCADO PAGO REMOVIDO — LiveGo usa SOMENTE Payoneer ═══
// O checkout de depósitos (Pix/cartão via Mercado Pago) foi desativado.
// Esta tela mantém o contrato de props e informa a transição ao usuário.
// Saques continuam 100% funcionais via Payoneer (Pix BRL / USD / EUR).

interface ConfirmPurchaseScreenProps {
  onClose: () => void;
  packageDetails: {
    diamonds: number;
    price: number;
    isFreeDev?: boolean;
    currency?: PurchaseCurrency;
  };
  onConfirmPurchase: (pkg: { diamonds: number; price: number; currency?: PurchaseCurrency }) => void;
  addToast: (type: ToastType, message: string) => void;
  currentUser: { id: string; email?: string; cadastral?: CadastralData };
}

const ConfirmPurchaseScreen: React.FC<ConfirmPurchaseScreenProps> = ({ onClose, packageDetails }) => {
  return (
    <div className="absolute inset-0 bg-[#0f1015] z-50 flex flex-col text-white">
      <header className="flex items-center p-4 py-5 flex-shrink-0">
        <button onClick={onClose} className="p-1 -ml-1 flex items-center justify-center text-gray-300 hover:text-white transition-colors" aria-label="Voltar">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-[17px] font-bold text-white ml-2">Confirmar Compra</h1>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center px-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#241a38] flex items-center justify-center">
          <span className="text-[28px]">💳</span>
        </div>
        <h2 className="text-[18px] font-black">Depósitos em transição</h2>
        <p className="text-[#8e9196] text-[13px] font-medium leading-relaxed">
          O Mercado Pago foi desativado e os depósitos retornarão em breve com um novo provedor.
        </p>
        {packageDetails && (
          <p className="text-[#5c5966] text-[12px] font-medium">
            Pacote selecionado: {packageDetails.diamonds} diamantes
          </p>
        )}
      </main>

      <footer className="p-5 mb-4">
        <button
          onClick={onClose}
          className="w-full bg-[#7a3be9] hover:bg-[#6b2ed3] text-white text-[15px] font-bold py-[14px] rounded-full transition-colors"
        >
          Entendi
        </button>
      </footer>
    </div>
  );
};

export default ConfirmPurchaseScreen;
