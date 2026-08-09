import React from 'react';
import { Gift } from '../../types';
import {
  // Popular Icons we just created
  CoracaoGiftIcon,
  RosaGiftIcon,
  FlorGiftIcon,
  RoscaGiftIcon,
  BalaoGiftIcon,
  ChocolateGiftIcon,
  BatomGiftIcon,
  CafeGiftIcon,
  HamburguerGiftIcon,
  PerfumeGiftIcon,
  PizzaGiftIcon,
  PirulitoGiftIcon,
  
  // Premium Luxury Icons already existing
  PrivateJetGiftIcon,
  RingGiftIcon,
  LionGiftIcon,
  SportsCarGiftIcon,
  PhoenixGiftIcon,
  SuperCarGiftIcon,
  DragonGiftIcon,
  CastleGiftIcon,
  UniverseGiftIcon,
  HelicopterGiftIcon,
  PlanetGiftIcon,
  YachtGiftIcon,
  GalaxyGiftIcon,
  KingsCrownGiftIcon,
  PremiumDiamondGiftIcon,
  PrivateIslandGiftIcon
} from '../icons';

// Map of names to SVG Components
const NAME_TO_SVG_MAP: Record<string, React.ComponentType<any>> = {
  // Popular Gifts
  'Coração': CoracaoGiftIcon,
  'Rosa': RosaGiftIcon,
  'Flor': FlorGiftIcon,
  'Rosca': RoscaGiftIcon,
  'Balão': BalaoGiftIcon,
  'Chocolate': ChocolateGiftIcon,
  'Batom': BatomGiftIcon,
  'Café': CafeGiftIcon,
  'Hambúrguer': HamburguerGiftIcon,
  'Perfume': PerfumeGiftIcon,
  'Pizza': PizzaGiftIcon,
  'Pirulito': PirulitoGiftIcon,

  // Luxury / Premium Gifts
  // 'Foguete' fica SEM componente SVG de propósito: usa a imagem PNG real
  // (/gifts/foguete.png) no painel e a animação Lottie em tela cheia.
  'Jato Privado': JatoJetIconWrapper, // wrapper below
  'Anel': RingGiftIcon,
  'Fênix': PhoenixGiftIcon,
  'Leão': LionGiftIcon,
  'Supercarro': SuperCarGiftIcon,
  'Dragão': DragonGiftIcon,
  'Castelo': CastleGiftIcon,
  'Iate': YachtGiftIcon,
  'Galáxia': GalaxyGiftIcon,
  'Coroa Real': KingsCrownGiftIcon,
  'Coroa': KingsCrownGiftIcon,
  'Diamante Azul': PremiumDiamondGiftIcon,
  'Carro Esportivo': SportsCarGiftIcon,
  'Carro': SportsCarGiftIcon,
  'Universos': UniverseGiftIcon,
  'Universo': UniverseGiftIcon,
  'Helicóptero': HelicopterGiftIcon,
  'Planeta': PlanetGiftIcon,
  'Ilha Privada': PrivateIslandGiftIcon
};

// Simple wrappers/safeguards if any name is slightly different
function JatoJetIconWrapper(props: any) {
  return <PrivateJetGiftIcon {...props} />;
}

// 🎵 Ícones de presente que vêm do PACOTE ZEGO (arquivos reais em public/):
// o ícone é o SVG ANIMADO self-contained (212 frames embutidos) — substitui
// o PNG estático do banco. O `animationUrl` do banco (musicbox.mp4) é
// descartado: a animação é o lottie (musicbox.json) e o fallback de vídeo é
// o webm (musicbox.webm), resolvidos pelo mapa local.
const GIFT_SVG_ICON_OVERRIDES: Record<string, string> = {
  'caixa_de_musica': '/gifts/caixa_de_musica.svg',
};

/**
 * Enriches a gift array by attaching React SVG components based on the gift's name.
 * This can be run on lists fetched from the API.
 */
export function enrichGiftsWithComponents(gifts: Gift[]): Gift[] {
  if (!gifts || !Array.isArray(gifts)) return gifts;
  
  return gifts.map(g => {
    const iconOverride = g.id ? GIFT_SVG_ICON_OVERRIDES[g.id] : undefined;
    if (iconOverride) {
      return {
        ...g,
        icon: iconOverride,
        animationUrl: undefined,
        component: undefined,
      };
    }
    // Retain existing component if already present, otherwise match by name
    if (g.component) return g;
    
    const Component = NAME_TO_SVG_MAP[g.name];
    if (Component) {
      return {
        ...g,
        // Instantiate the component with standard props/dimensions
        component: React.createElement(Component) as any
      };
    }
    return g;
  });
}

/**
 * Enriches a single gift item.
 */
export function enrichSingleGift(gift: Gift): Gift {
  if (!gift) return gift;
  const iconOverride = gift.id ? GIFT_SVG_ICON_OVERRIDES[gift.id] : undefined;
  if (iconOverride) {
    return {
      ...gift,
      icon: iconOverride,
      animationUrl: undefined,
      component: undefined,
    };
  }
  if (gift.component) return gift;
  
  const Component = NAME_TO_SVG_MAP[gift.name];
  if (Component) {
    return {
      ...gift,
      component: React.createElement(Component) as any
    };
  }
  return gift;
}
