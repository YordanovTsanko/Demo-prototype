import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from '../api/config';

export const usePatents = () => {
  return useQuery({
    queryKey: ['patents'],
    queryFn: async () => {
      const { data } = await apiClient.get('/patents');
      return data;
    },
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const usePatentDetail = (patentId) => {
  return useQuery({
    queryKey: ['patent', patentId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/patents/${patentId}`);
      return data;
    },
    enabled: !!patentId,
    retry: 2,
  });
};

export const useChatMutation = () => {
  return useMutation({
    mutationFn: async ({ patentId, question }) => {
      const { data } = await apiClient.post('/chat', {
        patentId,
        question,
      });
      return data;
    },
    retry: 1,
  });
};

export const useSearchPatents = (query) => {
  return useQuery({
    queryKey: ['search', query],
    queryFn: async () => {
      const { data } = await apiClient.get('/search', {
        params: { q: query }
      });
      return data;
    },
    enabled: !!query && query.length > 2,
    retry: 1,
  });
};