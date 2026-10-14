import { api } from './api'
import type { ApiEnvelope } from '@/types/reading'
import type { Command, CreateCommandPayload } from '@/types/command'

export const commandApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getCommands: builder.query<ApiEnvelope<Command[]>, { deviceId?: string }>({
      query: (params) => ({ url: '/commands', params }),
      providesTags: [{ type: 'Command', id: 'LIST' }],
    }),
    createCommand: builder.mutation<ApiEnvelope<Command>, CreateCommandPayload>({
      query: (body) => ({ url: '/commands', method: 'POST', body }),
      invalidatesTags: [{ type: 'Command', id: 'LIST' }],
    }),
  }),
})

export const { useGetCommandsQuery, useCreateCommandMutation } = commandApi
