import { apiRequest } from './client';
import type { Event } from './types';

export async function getEvents() {
  return apiRequest<Event[]>('/api/events');
}

