export type UserRole = 'Admin' | 'Translator' | 'Listener';
export type EventStatus = 'Draft' | 'Scheduled' | 'Live' | 'Completed';
export type SessionStatus = 'Active' | 'Ended' | 'Disconnected';
export type SessionRole = 'Translator' | 'Listener';

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface Event {
  id: string;
  name: string;
  description: string | null;
  startTime: string | null;
  endTime: string | null;
  status: EventStatus;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Channel {
  id: string;
  eventId: string;
  name: string;
  languageCode: string;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  eventId: string;
  channelId: string;
  role: SessionRole;
  status: SessionStatus;
  startedAt: string;
  endedAt: string | null;
}

