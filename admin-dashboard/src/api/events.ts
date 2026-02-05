import { apiRequest } from './client';
import type { Event, CreateEventRequest, UpdateEventRequest } from './types';

export async function getEvents() {
  return apiRequest<Event[]>('/api/events');
}

export async function getEvent(id: string) {
  return apiRequest<Event>(`/api/events/${id}`);
}

export async function createEvent(body: CreateEventRequest) {
  return apiRequest<Event>('/api/events', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateEvent(id: string, body: UpdateEventRequest) {
  return apiRequest<Event>(`/api/events/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteEvent(id: string) {
  return apiRequest<unknown>(`/api/events/${id}`, { method: 'DELETE' });
}

export async function startEvent(id: string) {
  return apiRequest<unknown>(`/api/events/${id}/start`, { method: 'POST' });
}

export async function stopEvent(id: string) {
  return apiRequest<unknown>(`/api/events/${id}/stop`, { method: 'POST' });
}
