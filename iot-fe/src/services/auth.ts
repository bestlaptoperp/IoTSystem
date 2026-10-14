import { api } from './api'
import type { ApiEnvelope } from '@/types/reading'
import type { AuthUser } from '@/types/auth'

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getMe: builder.query<ApiEnvelope<AuthUser>, void>({
      query: () => '/auth/me',
      providesTags: ['Me'],
    }),
    login: builder.mutation<ApiEnvelope<AuthUser>, { email: string; password: string }>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      invalidatesTags: ['Me'],
    }),
    logout: builder.mutation<ApiEnvelope<null>, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      invalidatesTags: ['Me'],
    }),
  }),
})

export const { useGetMeQuery, useLoginMutation, useLogoutMutation } = authApi
