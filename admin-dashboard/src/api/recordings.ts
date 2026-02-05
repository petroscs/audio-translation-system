import { apiRequest, apiDownload } from './client';
import type { Recording } from './types';

export async function getRecordings(params?: {
  eventId?: string;
  channelId?: string;
  sessionId?: string;
}) {
  const search = new URLSearchParams();
  if (params?.eventId) search.set('eventId', params.eventId);
  if (params?.channelId) search.set('channelId', params.channelId);
  if (params?.sessionId) search.set('sessionId', params.sessionId);
  const q = search.toString();
  return apiRequest<Recording[]>(`/api/recordings${q ? `?${q}` : ''}`);
}

export async function getRecording(id: string) {
  return apiRequest<Recording>(`/api/recordings/${id}`);
}

export async function downloadRecording(id: string): Promise<Blob> {
  return apiDownload(`/api/recordings/${id}/download`);
}

export async function deleteRecording(id: string) {
  return apiRequest<unknown>(`/api/recordings/${id}`, { method: 'DELETE' });
}
