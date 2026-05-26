export type MessageSender = 'business' | 'customer';

export interface Message {
  id: string;
  sender: MessageSender;
  text: string;
  timestamp: string; // ISO or casual time
  status: 'sent' | 'delivered' | 'read';
  audioUrl?: string;   // data URI or base64 stream of recorded voice note
  audioDuration?: number; // duration in seconds
  callLog?: {
    type: 'completed' | 'missed' | 'rejected';
    duration: number; // in seconds
  };
}

export type CustomerMood = 'irritado' | 'curioso' | 'satisfeito' | 'indeciso' | 'com pressa';

export interface CustomerPersona {
  id: string;
  name: string;
  avatar: string; // Emoji, icon prefix, or image
  phone: string;
  mood: CustomerMood;
  businessContext: string; // Detail on why they are talking to us
  tags: string[]; // e.g., ["Urgente", "Novo Lead", "Pós-Venda"]
}

export interface Conversation {
  id: string;
  customer: CustomerPersona;
  messages: Message[];
  unreadCount: number;
  lastUpdated: string;
  notes?: string; // Private internal notes for this customer
}

export interface CompanySetting {
  name: string;
  businessType: string;
  welcomeMessage: string;
}

export interface QuickReply {
  id: string;
  shortcut: string;
  text: string;
}
