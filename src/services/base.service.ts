// // // // // import { supabase } from '@/lib/supabase'
// // // // // import { PostgrestError } from '@supabase/supabase-js'

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class BaseService<T> {
  constructor(protected tableName: string) {}

  protected handleError(error: PostgrestError | null): never {
    if (error) {
      console.error(`Error en ${this.tableName}:`, error);
      // Include error code and details for better debugging
      const _errorMessage = error.code
        ? `${error.code}: ${error.message}`
        : error.message;
      throw new Error(errorMessage);
    }
    throw new Error('Error desconocido');
  }

  async getAll(params?: PaginationParams): Promise<PaginatedResponse<T>> {
    const _page = params?.page || 1;
    const _limit = params?.limit || 10;
    const _from = (page - 1) * limit;
    const _to = from + limit - 1;

    const { data, error, count } = await supabase
      .from(this.tableName)
      .select('*', { count: 'exact' })
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) this.handleError(error);

    return {
      data: data || [],
      count: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  async getById(id: string): Promise<T> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) this.handleError(error);
    return data;
  }

  async create(item: Partial<T>): Promise<T> {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(item)
      .select()
      .single();

    if (error) this.handleError(error);
    return data;
  }

  async update(id: string, updates: Partial<T>): Promise<T> {
    const { data, error } = await supabase
      .from(this.tableName)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) this.handleError(error);
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(this.tableName).delete().eq('id', id);

    if (error) this.handleError(error);
  }

  // Método para queries personalizadas
  protected query() {
    return supabase.from(this.tableName);
  }
}
