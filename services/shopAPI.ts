import { api } from './api';
import { User } from '../types';

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
}

export interface UserAvatar {
  avatarId: string;
  isCurrent: boolean;
}

export interface UserInventory {
  mochilas: Array<{ itemId: string }>;
  quadros: Array<{ itemId: string }>;
  carros: Array<{ itemId: string }>;
  bolhas: Array<{ itemId: string }>;
  aneis: Array<{ itemId: string }>;
  avatars: UserAvatar[];
}

export interface Frame {
  id: string;
  name: string;
  price: number;
  duration: number; // in days
  image: string;
  description: string;
}

export interface UserFrame {
  frameId: string;
  expirationDate: string;
  isEquipped: boolean;
}

// In-memory user inventory storage to keep the experience seamless across room loads
const localInventory: Record<string, UserInventory> = {};

const getOrInitInventory = (userId: string): UserInventory => {
  if (!localInventory[userId]) {
    localInventory[userId] = {
      mochilas: [],
      quadros: [],
      carros: [],
      bolhas: [],
      aneis: [],
      avatars: []
    };
  }
  return localInventory[userId];
};

const MOCK_ITEMS: Record<string, ShopItem[]> = {
  mochilas: [
    { id: 'mochila_1', name: 'Mochila Exploradora', description: 'Para carregar todos os seus pertences na transmissão.', price: 100, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&auto=format&fit=crop' },
    { id: 'mochila_2', name: 'Mochila Galáctica', description: 'Efeito cósmico de estrelas ao entrar na sala.', price: 250, image: 'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=400&auto=format&fit=crop' }
  ],
  quadros: [
    { id: 'quadro_1', name: 'Quadro Neon', description: 'Uma moldura brilhante para destacar sua foto de perfil.', price: 150, image: 'https://images.unsplash.com/photo-1543857778-c4a1a3e0b2eb?w=400&auto=format&fit=crop' },
    { id: 'quadro_2', name: 'Mármore Real', description: 'Para os transmissores mais elegantes.', price: 300, image: 'https://images.unsplash.com/photo-1618220179428-22790b461013?w=400&auto=format&fit=crop' }
  ],
  carros: [
    { id: 'carro_1', name: 'Super Esportivo', description: 'Efeito luxuoso de entrada de carro esportivo.', price: 1000, image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&auto=format&fit=crop' },
    { id: 'carro_2', name: 'Nave Espacial', description: 'Entre na live como um astronauta do futuro.', price: 2500, image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&auto=format&fit=crop' }
  ],
  bolhas: [
    { id: 'bolha_1', name: 'Bolha de Sabão', description: 'Efeito animado de bolhas ao redor da sua mensagem.', price: 80, image: 'https://images.unsplash.com/photo-1551608889-12fbd6dccd8a?w=400&auto=format&fit=crop' },
    { id: 'bolha_2', name: 'Fogo Escuro', description: 'Fundo escuro flamejante nas mensagens.', price: 200, image: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=400&auto=format&fit=crop' }
  ],
  aneis: [
    { id: 'anel_1', name: 'Anel Luminoso', description: 'Halo radiante de luz sob o seu nickname.', price: 400, image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&auto=format&fit=crop' },
    { id: 'anel_2', name: 'Anel de Diamante', description: 'Grito visual de status em todas as salas.', price: 1200, image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&auto=format&fit=crop' }
  ],
  avatars: [
    { id: 'avatar_1', name: 'Cyberpunk Boy', description: 'Visual retro-futurista.', price: 300, image: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400&auto=format&fit=crop' },
    { id: 'avatar_2', name: 'Anime Princess', description: 'Desenho estilo oriental com cores vibrantes.', price: 500, image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop' }
  ]
};

export const shopAPI = {
  mochilas: {
    getAll: async () => MOCK_ITEMS.mochilas,
    purchase: async (itemId: string, userId: string) => {
      const item = MOCK_ITEMS.mochilas.find(i => i.id === itemId);
      if (!item) throw new Error('Item não encontrado');
      const inv = getOrInitInventory(userId);
      inv.mochilas.push({ itemId });
      return { success: true, userDiamonds: 1000 };
    }
  },
  quadros: {
    getAll: async () => MOCK_ITEMS.quadros,
    purchase: async (itemId: string, userId: string) => {
      const item = MOCK_ITEMS.quadros.find(i => i.id === itemId);
      if (!item) throw new Error('Item não encontrado');
      const inv = getOrInitInventory(userId);
      inv.quadros.push({ itemId });
      return { success: true, userDiamonds: 1000 };
    }
  },
  carros: {
    getAll: async () => MOCK_ITEMS.carros,
    purchase: async (itemId: string, userId: string) => {
      const item = MOCK_ITEMS.carros.find(i => i.id === itemId);
      if (!item) throw new Error('Item não encontrado');
      const inv = getOrInitInventory(userId);
      inv.carros.push({ itemId });
      return { success: true, userDiamonds: 1000 };
    }
  },
  bolhas: {
    getAll: async () => MOCK_ITEMS.bolhas,
    purchase: async (itemId: string, userId: string) => {
      const item = MOCK_ITEMS.bolhas.find(i => i.id === itemId);
      if (!item) throw new Error('Item não encontrado');
      const inv = getOrInitInventory(userId);
      inv.bolhas.push({ itemId });
      return { success: true, userDiamonds: 1000 };
    }
  },
  aneis: {
    getAll: async () => MOCK_ITEMS.aneis,
    purchase: async (itemId: string, userId: string) => {
      const item = MOCK_ITEMS.aneis.find(i => i.id === itemId);
      if (!item) throw new Error('Item não encontrado');
      const inv = getOrInitInventory(userId);
      inv.aneis.push({ itemId });
      return { success: true, userDiamonds: 1000 };
    }
  },
  avatars: {
    getAll: async () => MOCK_ITEMS.avatars,
    purchase: async (itemId: string, userId: string) => {
      const item = MOCK_ITEMS.avatars.find(i => i.id === itemId);
      if (!item) throw new Error('Item não encontrado');
      const inv = getOrInitInventory(userId);
      inv.avatars.push({ avatarId: itemId, isCurrent: false });
      return { success: true, userDiamonds: 1000 };
    },
    equip: async (avatarId: string, userId: string) => {
      const inv = getOrInitInventory(userId);
      inv.avatars.forEach(av => {
        av.isCurrent = av.avatarId === avatarId;
      });
      const selected = MOCK_ITEMS.avatars.find(i => i.id === avatarId);
      return {
        success: true,
        currentAvatar: {
          imageUrl: selected ? selected.image : ''
        }
      };
    }
  },

  frames: {
    getAll: async (): Promise<Frame[]> => {
      try {
        const response = await api.getAvatarFrames();
        const fallbackFrames = [
          { id: 'FrameBlueCrystal', name: 'Royal Gold', price: 500, duration: 7, image: '', description: '' },
          { id: 'FrameRoseGarden', name: 'Cyber Neon', price: 300, duration: 7, image: '', description: '' },
          { id: 'FrameCopperPearls', name: 'Emerald Elegance', price: 450, duration: 7, image: '', description: '' },
          { id: 'FrameOrnateMagenta', name: 'Galaxy Spark', price: 350, duration: 7, image: '', description: '' },
          { id: 'FrameNeonFeathers', name: 'Fire Dragon', price: 300, duration: 7, image: '', description: '' },
          { id: 'FrameBaroqueElegance', name: 'Ice Crystal', price: 300, duration: 7, image: '', description: '' },
          { id: 'FrameMysticalWings', name: 'Steampunk Gear', price: 450, duration: 7, image: '', description: '' },
          { id: 'FrameCosmicFire', name: 'Sakura Bloom', price: 450, duration: 7, image: '', description: '' },
          { id: 'FrameCelestialCrown', name: 'Cosmic Ring', price: 350, duration: 7, image: '', description: '' }
        ];

        // Forçar a exibição dos belos quadros de avatar baseados na referência visual do usuário
        // independentemente do que o backend retornar por enquanto, garantindo a UI.
        if (!response || response.length === 0 || response.length < 9) {
          return fallbackFrames;
        }
        return response.map(f => {
          // tentar resgatar o fallback frame de mesmo nome
          const match = fallbackFrames.find(fallback => fallback.name === f.name);
          return {
            id: match ? match.id : f.id,
            name: f.name,
            price: f.price,
            duration: f.duration,
            image: '',
            description: f.name ? `Moldura exclusiva ${f.name}` : 'Moldura decorativa premium.'
          };
        });
      } catch (error) {
        return [
          { id: 'FrameBlueCrystal', name: 'Royal Gold', price: 500, duration: 7, image: '', description: '' },
          { id: 'FrameRoseGarden', name: 'Cyber Neon', price: 300, duration: 7, image: '', description: '' },
          { id: 'FrameCopperPearls', name: 'Emerald Elegance', price: 450, duration: 7, image: '', description: '' },
          { id: 'FrameOrnateMagenta', name: 'Galaxy Spark', price: 350, duration: 7, image: '', description: '' },
          { id: 'FrameNeonFeathers', name: 'Fire Dragon', price: 300, duration: 7, image: '', description: '' },
          { id: 'FrameBaroqueElegance', name: 'Ice Crystal', price: 300, duration: 7, image: '', description: '' },
          { id: 'FrameMysticalWings', name: 'Steampunk Gear', price: 450, duration: 7, image: '', description: '' },
          { id: 'FrameCosmicFire', name: 'Sakura Bloom', price: 450, duration: 7, image: '', description: '' },
          { id: 'FrameCelestialCrown', name: 'Cosmic Ring', price: 350, duration: 7, image: '', description: '' }
        ];
      }
    },
    getUserFrames: async (userId: string): Promise<UserFrame[]> => {
      try {
        const response = await api.getUserFrames(userId);
        return (response?.ownedFrames || []).map(f => ({
          frameId: f.frameId,
          expirationDate: f.expirationDate,
          isEquipped: response?.activeFrameId === f.frameId
        }));
      } catch {
        return [];
      }
    },
    getCurrent: async (userId: string): Promise<UserFrame | null> => {
      try {
        const response = await api.getUserFrames(userId);
        if (!response || !response.activeFrameId) return null;
        const active = (response.ownedFrames || []).find(f => f.frameId === response.activeFrameId);
        if (!active) return null;
        return {
          frameId: active.frameId,
          expirationDate: active.expirationDate,
          isEquipped: true
        };
      } catch {
        return null;
      }
    },
    purchase: async (frameId: string, userId: string) => {
      const response = await api.buyFrame(userId, frameId, 100, 7);
      return {
        success: response.success,
        userDiamonds: response.user?.diamonds || 0
      };
    },
    equip: async (frameId: string | null, userId: string) => {
      const response = await api.equipFrame(userId, frameId);
      return {
        success: response.success
      };
    }
  },

  getUserInventory: async (userId: string): Promise<UserInventory> => {
    return getOrInitInventory(userId);
  }
};
