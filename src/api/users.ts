import { apiRequest } from './client'
import type { User } from './types'

/**
 * Own-profile layer (T009). The update shape is a type-level whitelist of
 * the seven editable profile fields — privilege flags (`is_superuser`,
 * `is_active`) cannot even be expressed here (same class as review C2).
 */
export interface ProfileUpdate {
  first_name?: string
  last_name?: string
  phone?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  postal_code?: string | null
}

export function fetchMyProfile(): Promise<User> {
  return apiRequest<User>('/api/v1/users/me')
}

export function updateMyProfile(data: ProfileUpdate): Promise<User> {
  return apiRequest<User>('/api/v1/users/me', { method: 'PUT', body: data })
}
