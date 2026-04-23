// @ts-nocheck
import { vi } from 'vitest'
import type { Database } from '@/lib/types/database'

export type TableName = keyof Database['public']['Tables']
export type Enums = Database['public']['Enums']

export function createMockSupabaseClient() {
  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    then: vi.fn().mockReturnThis(),
    catch: vi.fn().mockReturnThis(),
    // Allow overriding the final resolution per test
    _resolveValue: null as any,
    _resolveError: null as any,
  }

  // Singleton chain builder returned by `from` to allow configuring responses across calls
  const chain = {
    select: vi.fn((...args: any[]) => {
      chain._selectArgs = args
      return chain
    }),
    insert: vi.fn((...args: any[]) => {
      chain._insertArgs = args
      return chain
    }),
    update: vi.fn((...args: any[]) => {
      chain._updateArgs = args
      return chain
    }),
    delete: vi.fn(() => {
      chain._deleteCalled = true
      return chain
    }),
    upsert: vi.fn((...args: any[]) => {
      chain._upsertArgs = args
      return chain
    }),
    eq: vi.fn((...args: any[]) => {
      chain._eqArgs = chain._eqArgs || []
      chain._eqArgs.push(args)
      return chain
    }),
    in: vi.fn((...args: any[]) => {
      chain._inArgs = chain._inArgs || []
      chain._inArgs.push(args)
      return chain
    }),
    order: vi.fn((...args: any[]) => {
      chain._orderArgs = chain._orderArgs || []
      chain._orderArgs.push(args)
      return chain
    }),
    single: vi.fn(() => chain),
    maybeSingle: vi.fn(() => chain),
    count: vi.fn((...args: any[]) => {
      chain._countArgs = args
      return chain
    }),
    then: vi.fn((onFulfilled: any, _onRejected: any) => {
      const result = {
        data: chain._data !== undefined ? chain._data : null,
        error: chain._error || null,
      }
      return Promise.resolve(onFulfilled ? onFulfilled(result) : result)
    }),
    // Test helpers
    _data: null as any,
    _error: null as any,
    _resolve(data: any, error?: any) {
      chain._data = data
      chain._error = error || null
    },
    reset() {
      chain._data = null
      chain._error = null
      chain._selectArgs = undefined
      chain._insertArgs = undefined
      chain._updateArgs = undefined
      chain._deleteCalled = false
      chain._upsertArgs = undefined
      chain._eqArgs = []
      chain._inArgs = []
      chain._orderArgs = []
      chain._countArgs = undefined
    },
  }

  const fromFn = vi.fn(() => chain)

  const mockAuth = {
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
    signInWithOAuth: vi.fn().mockResolvedValue({ data: { provider: 'google', url: 'https://accounts.google.com' }, error: null }),
    signUp: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
  }

  const client = {
    from: fromFn,
    auth: mockAuth,
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: '' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: '' } }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn().mockReturnThis(),
  }

  return client
}

// Helper to build a mock user fixture
export function mockUser(overrides: Partial<{ id: string; email: string }> = {}) {
  return {
    id: 'user-123',
    email: 'teacher@example.com',
    ...overrides,
  }
}
