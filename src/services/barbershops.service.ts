// // // // // import { BaseService } from './base.service'
// // // // // import { Database } from '@/types/database'

type Barbershop = Database['public']['Tables']['barbershops']['Row'];
type BarbershopInsert = Database['public']['Tables']['barbershops']['Insert'];
type BarbershopUpdate = Database['public']['Tables']['barbershops']['Update'];

class BarbershopService extends BaseService<Barbershop> {
  constructor() {
    super('barbershops');
  }

  async getActive() {
    const { data, error } = await this.query().select('*').order('name');

    if (error) this.handleError(error);
    return data || [];
  }

  async getBySlug(slug: string): Promise<Barbershop | null> {
    const { data, error } = await this.query()
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No encontrado
      this.handleError(error);
    }

    return data;
  }

  async getWorkingHours(barbershopId: string) {
    const { data, error } = await this.query()
      .select('opening_time, closing_time, time_slot_duration')
      .eq('id', barbershopId)
      .single();

    if (error) this.handleError(error);
    return data;
  }

  async createBarbershop(barbershop: BarbershopInsert): Promise<Barbershop> {
    return this.create(barbershop);
  }

  async updateBarbershop(
    id: string,
    updates: BarbershopUpdate
  ): Promise<Barbershop> {
    return this.update(id, updates);
  }

  async getByOwner(ownerId: string): Promise<Barbershop[]> {
    const { data, error } = await this.query()
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) this.handleError(error);
    return data || [];
  }
}

export const _barbershopService = new BarbershopService();
