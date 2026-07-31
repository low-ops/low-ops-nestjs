import type { CreateUserInput, UpdateUserInput, User } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, init);

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function listUsers(): Promise<User[]> {
  return request<User[]>('/users');
}

export function getUser(id: string): Promise<User> {
  return request<User>(`/users/${id}`);
}

export function createUser(input: CreateUserInput): Promise<User> {
  return request<User>('/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function updateUser(id: string, input: UpdateUserInput): Promise<User> {
  return request<User>(`/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function updateUserImage(id: string, file: File): Promise<User> {
  const body = new FormData();
  body.append('image', file);

  return request<User>(`/users/${id}/image`, {
    method: 'POST',
    body,
  });
}

export function deleteUser(id: string): Promise<User> {
  return request<User>(`/users/${id}`, {
    method: 'DELETE',
  });
}
