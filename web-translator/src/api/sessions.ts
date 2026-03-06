import { apiRequest } from './client';
import type { Session, SessionStatus } from './types';

export async function createSession(eventId: string, channelId: string) {
  return apiRequest<Session>('/api/sessions', {
    method: 'POST',
    body: JSON.stringify({ eventId, channelId, role: 'Translator' }),
  });
}

export async function getSessions(params?: { eventId?: string; channelId?: string; status?: SessionStatus }) {
  const search = new URLSearchParams();
  if (params?.eventId) search.set('eventId', params.eventId);
  if (params?.channelId) search.set('channelId', params.channelId);
  if (params?.status) search.set('status', params.status);
  const q = search.toString();
  return apiRequest<Session[]>(`/api/sessions${q ? `?${q}` : ''}`);
}

export async function endSession(sessionId: string) {
  return apiRequest<Session>(`/api/sessions/${sessionId}/end`, { method: 'PUT' });
}

export async function getSession(sessionId: string) {
  return apiRequest<Session>(`/api/sessions/${sessionId}`);
}

export async function pauseBroadcast(sessionId: string) {
  return apiRequest<void>(`/api/sessions/${sessionId}/broadcast/pause`, { method: 'POST' });
}

export async function getProducerStats(sessionId: string, mediasoupProducerId: string) {
  return apiRequest<Record<string, unknown>>(
    `/api/sessions/${sessionId}/producer-stats?mediasoupProducerId=${encodeURIComponent(mediasoupProducerId)}`
  );
}

