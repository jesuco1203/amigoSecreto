export interface Participant {
  id: string;
  name: string;
  interests: string;
  avatar?: string;
}

export interface Match {
  santaId: string;
  gifteeId: string;
}

export interface GiftSuggestion {
  title: string;
  description: string;
  estimatedPrice: string;
}

export enum AppPhase {
  SETUP = 'SETUP',
  DRAW = 'DRAW',
  REVEAL = 'REVEAL',
  FINISHED = 'FINISHED'
}

export interface GlobalSettings {
  budget: string;
  exchangeDate: string;
  isConfigured: boolean;
}