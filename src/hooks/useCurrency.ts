import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { BusinessProfile } from '../types';

export function useCurrency() {
  const { data: business } = useQuery<BusinessProfile>({
    queryKey: ['business'],
    queryFn: () => api.get('/settings/business').then((r) => r.data),
  });

  return business?.currency || '$';
}
