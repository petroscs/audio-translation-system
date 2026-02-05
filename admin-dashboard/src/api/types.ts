export type UserRole = 'Admin' | 'Translator' | 'Listener';
export type EventStatus = 'Draft' | 'Scheduled' | 'Live' | 'Completed';
export type SessionStatus = 'Active' | 'Ended' | 'Disconnected';
export type SessionRole = 'Translator' | 'Listener';

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  role: UserRole;
  password: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  role?: UserRole;
  password?: string;
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

export interface CreateEventRequest {
  name: string;
  description?: string;
  startTime?: string;
  endTime?: string;
}

export interface UpdateEventRequest {
  name?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
}

export interface Channel {
  id: string;
  eventId: string;
  name: string;
  languageCode: string;
  createdAt: string;
}

export interface CreateChannelRequest {
  name: string;
  languageCode: string;
}

export interface UpdateChannelRequest {
  name?: string;
  languageCode?: string;
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

export interface Recording {
  id: string;
  sessionId: string;
  filePath: string;
  durationSeconds: number;
  startedAt: string;
  endedAt: string | null;
  status: string;
}
