import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/api/client'

export function useMonitoring(window: '15m' | '1h' | '24h' = '1h', instance?: string, statusOnly = false) {
  return useQuery({
    queryKey: ['admin', 0, 'monitoring', window, instance, statusOnly],
    queryFn: ({ signal }) =>
      unwrap(api.GET('/api/v1/admin/monitoring', { signal, params: { query: { window, instance, statusOnly } } })),
    refetchInterval: 30_000,
    staleTime: 25_000,
    retry: false,
  })
}
