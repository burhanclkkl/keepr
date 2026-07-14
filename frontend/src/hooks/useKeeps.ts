import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export interface Keep {
  id: number;
  url: string;
  title: string | null;
  description: string | null;
  category_id: number | null;
  category_name: string | null;
  user_id: number;
  is_favorite: boolean;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  reading_time_minutes?: number | null;
  reminder_at?: string | null;
  is_reminder_sent?: boolean;
  isOptimistic?: boolean; // Client-only flag for blur skeletons
}

interface KeepsParams {
  category_id?: number | string | null;
  search?: string;
}

export const useKeeps = (params: KeepsParams = {}) => {
  return useQuery<Keep[]>({
    queryKey: ['keeps', params],
    queryFn: async () => {
      const { category_id, search } = params;
      const queryParams = new URLSearchParams();
      if (category_id !== undefined && category_id !== null) {
        queryParams.append('category_id', String(category_id));
      }
      if (search) {
        queryParams.append('search', search);
      }
      
      const response = await api.get<Keep[]>(`/api/keeps?${queryParams.toString()}`);
      return response.data;
    },
  });
};

export const useCreateKeep = (currentParams: KeepsParams = {}) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { url: string; category_id?: number | null; title?: string; description?: string }) => {
      const response = await api.post<Keep>('/api/keeps', data);
      return response.data;
    },
    // Optimistic UI updates
    onMutate: async (newKeepVariables) => {
      const queryKey = ['keeps', currentParams];
      
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the current state of keeps
      const previousKeeps = queryClient.getQueryData<Keep[]>(queryKey);

      // Fabricate an optimistic item (with temporary negative ID)
      const optimisticKeep: Keep = {
        id: -Date.now(),
        url: newKeepVariables.url,
        title: 'Bağlantı Çözümleniyor...',
        description: 'İçerik bilgileri web sitesinden alınıyor, bu işlem birkaç saniye sürebilir.',
        category_id: newKeepVariables.category_id || null,
        category_name: null,
        user_id: 0,
        is_favorite: false,
        is_pinned: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        isOptimistic: true,
      };

      // Instantly inject the optimistic item at the top of the list
      if (previousKeeps) {
        queryClient.setQueryData<Keep[]>(queryKey, [optimisticKeep, ...previousKeeps]);
      } else {
        queryClient.setQueryData<Keep[]>(queryKey, [optimisticKeep]);
      }

      // Return snapshot and queryKey for potential rollback
      return { previousKeeps, queryKey };
    },
    onError: (_err, _newKeep, context) => {
      // Rollback to previous state on error
      if (context) {
        queryClient.setQueryData(context.queryKey, context.previousKeeps);
      }
    },
    onSettled: (_data, _error, _variables, _context) => {
      // Invalidate all queries starting with 'keeps' to sync count badges
      queryClient.invalidateQueries({ queryKey: ['keeps'] });
    },
  });
};

export const useUpdateKeep = (_currentParams: KeepsParams = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { title?: string; description?: string; image_url?: string; category_id?: number | null; is_favorite?: boolean; is_pinned?: boolean } }) => {
      const response = await api.put<Keep>(`/api/keeps/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keeps'] });
    },
  });
};

export const useDeleteKeep = (currentParams: KeepsParams = {}) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete<{ message: string }>(`/api/keeps/${id}`);
      return response.data;
    },
    // Optimistic Delete
    onMutate: async (deletedId) => {
      const queryKey = ['keeps', currentParams];
      await queryClient.cancelQueries({ queryKey });
      
      const previousKeeps = queryClient.getQueryData<Keep[]>(queryKey);
      
      if (previousKeeps) {
        queryClient.setQueryData<Keep[]>(queryKey, previousKeeps.filter(k => k.id !== deletedId));
      }
      
      return { previousKeeps, queryKey };
    },
    onError: (_err, _deletedId, context) => {
      if (context) {
        queryClient.setQueryData(context.queryKey, context.previousKeeps);
      }
    },
    onSettled: (_data, _error, _variables, _context) => {
      // Invalidate all queries starting with 'keeps' to sync count badges
      queryClient.invalidateQueries({ queryKey: ['keeps'] });
    },
  });
};

export const useBulkMoveKeeps = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, categoryId }: { ids: number[]; categoryId: number | null }) => {
      const response = await api.post<{ message: string }>('/api/keeps/bulk-move', { ids, category_id: categoryId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keeps'] });
    },
  });
};

export const useBulkFavoriteKeeps = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, isFavorite }: { ids: number[]; isFavorite: boolean }) => {
      const response = await api.post<{ message: string }>('/api/keeps/bulk-favorite', { ids, is_favorite: isFavorite });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keeps'] });
    },
  });
};

export const useBulkPinKeeps = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, isPinned }: { ids: number[]; isPinned: boolean }) => {
      const response = await api.post<{ message: string }>('/api/keeps/bulk-pin', { ids, is_pinned: isPinned });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keeps'] });
    },
  });
};
