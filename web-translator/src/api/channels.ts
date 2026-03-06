import { apiRequest } from './client';
import type { Channel } from './types';

export async function getChannels(eventId: string) {
  return apiRequest<Channel[]>(`/api/events/${eventId}/channels`);
}

