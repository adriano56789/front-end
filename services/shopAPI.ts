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
  duration: number;
  image: string;
  description: string;
}

export interface UserFrame {
  frameId: string;
  expirationDate: string;
  isEquipped: boolean;
}

const FALLBACK_FRAMES: Frame[] = [
  { id: 'FrameBlueCrystal', name: 'Royal Gold', price: 500, duration: 3, image: '', description: '' },
  { id: 'FrameRoseGarden', name: 'Cyber Neon', price: 300, duration: 3, image: '', description: '' },
  { id: 'FrameCopperPearls', name: 'Emerald Elegance', price: 450, duration: 3, image: '', description: '' },
  { id: 'FrameOrnateMagenta', name: 'Galaxy Spark', price: 350, duration: 3, image: '', description: '' },
  { id: 'FrameNeonFeathers', name: 'Fire Dragon', price: 300, duration: 3, image: '', description: '' },
  { id: 'FrameBaroqueElegance', name: 'Ice Crystal', price: 300, duration: 3, image: '', description: '' },
  { id: 'FrameMysticalWings', name: 'Steampunk Gear', price: 450, duration: 3, image: '', description: '' },
  { id: 'FrameCosmicFire', name: 'Sakura Bloom', price: 450, duration: 3, image: '', description: '' },
  { id: 'FrameCelestialCrown', name: 'Cosmic Ring', price: 350, duration: 3, image: '', description: '' },
  { id: 'Frame20275', name: 'Primavera', price: 500, duration: 3, image: '', description: '' }
];

export const shopAPI = {
  mochilas: {
    getAll: async (): Promise<ShopItem[]> => {
      return api.shop.getMochilas();
    },
    purchase: async (itemId: string, userId: string) => {
      const result = await api.shop.buyMochila(itemId, userId);
      return { success: result.success, userDiamonds: result.userDiamonds };
    }
  },
  quadros: {
    getAll: async (): Promise<ShopItem[]> => {
      return api.shop.getQuadros();
    },
    purchase: async (itemId: string, userId: string) => {
      const result = await api.shop.buyQuadro(itemId, userId);
      return { success: result.success, userDiamonds: result.userDiamonds };
    }
  },
  carros: {
    getAll: async (): Promise<ShopItem[]> => {
      return api.shop.getCarros();
    },
    purchase: async (itemId: string, userId: string) => {
      const result = await api.shop.buyCarro(itemId, userId);
      return { success: result.success, userDiamonds: result.userDiamonds };
    }
  },
  bolhas: {
    getAll: async (): Promise<ShopItem[]> => {
      return api.shop.getBolhas();
    },
    purchase: async (itemId: string, userId: string) => {
      const result = await api.shop.buyBolha(itemId, userId);
      return { success: result.success, userDiamonds: result.userDiamonds };
    }
  },
  aneis: {
    getAll: async (): Promise<ShopItem[]> => {
      return api.shop.getAneis();
    },
    purchase: async (itemId: string, userId: string) => {
      const result = await api.shop.buyAnel(itemId, userId);
      return { success: result.success, userDiamonds: result.userDiamonds };
    }
  },
  avatars: {
    getAll: async (): Promise<ShopItem[]> => {
      return api.shop.getAvatars();
    },
    purchase: async (itemId: string, userId: string) => {
      const result = await api.shop.buyAvatar(itemId, userId);
      return { success: result.success, userDiamonds: result.userDiamonds };
    },
    equip: async (avatarId: string, userId: string) => {
      const result = await api.shop.equipAvatar(avatarId, userId);
      return {
        success: result.success,
        currentAvatar: result.currentAvatar
      };
    }
  },

  frames: {
    getAll: async (): Promise<Frame[]> => {
      try {
        const response = await api.getAvatarFrames();
        if (!response || response.length === 0) {
          return FALLBACK_FRAMES;
        }
        return response.map(f => {
          const match = FALLBACK_FRAMES.find(fallback => fallback.name === f.name);
          return {
            id: match ? match.id : f.id,
            name: f.name,
            price: f.price,
            duration: f.duration,
            image: '',
            description: f.name ? `Moldura exclusiva ${f.name}` : 'Moldura decorativa premium.'
          };
        });
      } catch {
        return FALLBACK_FRAMES;
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
      // ⏳ REGRA: quadro de avatar vale EXATAMENTE 3 dias (o backend ignora a
      // duração enviada e aplica 3 dias — ou permanente para o dono).
      const response = await api.buyFrame(userId, frameId, 100, 3);
      return {
        success: response.success,
        userDiamonds: response.user?.diamonds || 0
      };
    },
    equip: async (frameId: string | null, userId: string) => {
      const response = await api.equipFrame(userId, frameId);
      return { success: response.success };
    }
  },

  getUserInventory: async (userId: string): Promise<UserInventory> => {
    try {
      const inventory = await api.shop.getUserInventory(userId);
      return {
        mochilas: inventory.mochilas || [],
        quadros: inventory.quadros || [],
        carros: inventory.carros || [],
        bolhas: inventory.bolhas || [],
        aneis: inventory.aneis || [],
        avatars: inventory.avatars || []
      };
    } catch {
      // Fallback: inventário vazio em caso de erro
      return {
        mochilas: [],
        quadros: [],
        carros: [],
        bolhas: [],
        aneis: [],
        avatars: []
      };
    }
  }
};
