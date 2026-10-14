import { api } from './api'
import type { ApiEnvelope, Reading, ReadingBucket, ReadingQuery, StatusStat, SummaryStat } from '@/types/reading'

interface StatsQuery {
  deviceId?: string
  from?: string
  to?: string
}

export const readingApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getReadings: builder.query<ApiEnvelope<Reading[]>, ReadingQuery>({
      query: (params) => ({ url: '/readings', params }),
      providesTags: [{ type: 'Reading', id: 'LIST' }],
    }),
    getReadingBuckets: builder.query<ApiEnvelope<ReadingBucket[]>, ReadingQuery>({
      query: (params) => ({ url: '/readings', params }),
      providesTags: [{ type: 'Reading', id: 'BUCKET' }],
    }),
    getStatusStats: builder.query<ApiEnvelope<StatusStat[]>, StatsQuery>({
      query: (params) => ({ url: '/stats/status', params }),
      providesTags: [{ type: 'Stats', id: 'STATUS' }],
    }),
    getSummary: builder.query<ApiEnvelope<SummaryStat>, StatsQuery>({
      query: (params) => ({ url: '/stats/summary', params }),
      providesTags: [{ type: 'Stats', id: 'SUMMARY' }],
    }),
  }),
})

export const {
  useGetReadingsQuery,
  useGetReadingBucketsQuery,
  useGetStatusStatsQuery,
  useGetSummaryQuery,
} = readingApi
