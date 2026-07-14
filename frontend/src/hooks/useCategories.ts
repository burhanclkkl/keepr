import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export interface Category {
  id: number;
  name: string;
  icon: string | null;
  user_id: number;
  is_public?: boolean;
  share_slug?: string | null;
  parent_id?: number | null;
  collaborator_role?: 'viewer' | 'editor' | null;
  created_at: string;
}

export const useCategories = () => {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get<Category[]>('/api/categories');
      return response.data;
    },
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; icon?: string; parent_id?: number | null }) => {
      const response = await api.post<Category>('/api/categories', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name?: string; icon?: string } }) => {
      const response = await api.put<Category>(`/api/categories/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['keeps'] });
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete<{ message: string }>(`/api/categories/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      // Invalidate keeps since keeps under this category will now have their category set to null
      queryClient.invalidateQueries({ queryKey: ['keeps'] });
    },
  });
};

export const useShareCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_public }: { id: number; is_public: boolean }) => {
      const response = await api.post<Category>(`/api/categories/${id}/share`, { is_public });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
};
