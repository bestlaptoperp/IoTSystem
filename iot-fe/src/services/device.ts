import { api } from './api'
import type { ApiEnvelope } from '@/types/reading'
import type { Device } from '@/types/device'

export const deviceApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getDevices: builder.query<ApiEnvelope<Device[]>, void>({
      query: () => '/devices',
      providesTags: [{ type: 'Device', id: 'LIST' }],
    }),
  }),
})

export const { useGetDevicesQuery } = deviceApi
