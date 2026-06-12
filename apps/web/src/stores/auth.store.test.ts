import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './auth.store'

beforeEach(() => {
  useAuthStore.setState({ user: null, accessToken: null, isAuthenticated: false })
})

describe('auth store', () => {
  it('starts unauthenticated', () => {
    const { isAuthenticated, user, accessToken } = useAuthStore.getState()
    expect(isAuthenticated).toBe(false)
    expect(user).toBeNull()
    expect(accessToken).toBeNull()
  })

  it('setAuth persists user, token, and sets authenticated', () => {
    const user = { id: '1', email: 'admin@test.com', role: 'manager' }
    useAuthStore.getState().setAuth(user, 'tok123')
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.user).toEqual(user)
    expect(state.accessToken).toBe('tok123')
  })

  it('clearAuth resets all auth state', () => {
    useAuthStore.getState().setAuth({ id: '1', email: 'x@y.com', role: 'waiter' }, 'tok')
    useAuthStore.getState().clearAuth()
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(state.accessToken).toBeNull()
  })
})
