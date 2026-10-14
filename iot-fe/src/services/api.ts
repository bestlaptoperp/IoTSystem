import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api',
    credentials: 'include', // Kirim cookie httpOnly
  }),
  tagTypes: ['Me', 'Device', 'Reading', 'Stats', 'Command'],
  endpoints: () => ({}),
})
