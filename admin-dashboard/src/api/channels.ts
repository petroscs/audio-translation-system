import { apiRequest } from './client';
import type { Channel, CreateChannelRequest, UpdateChannelRequest } from './types';

export async function getChannels(eventId: string) {
  return apiRequest<Channel[]>(`/api/events/${eventId}/channels`);
}

export async function getChannel(id: string) {
  return apiRequest<Channel>(`/api/channels/${id}`);
}

export async function createChannel(eventId: string, body: CreateChannelRequest) {
  return apiRequest<Channel>(`/api/events/${eventId}/channels`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateChannel(id: string, body: UpdateChannelRequest) {
  return apiRequest<Channel>(`/api/channels/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function deleteChannel(id: string) {
  return apiRequest<unknown>(`/api/channels/${id}`, { method: 'DELETE' });
}
