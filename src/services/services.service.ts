// // // // // import { BaseService } from './base.service'
// // // // // import { Database } from '@/types/database'

type Service = Database['public']['Tables']['services']['Row'];
type ServiceInsert = Database['public']['Tables']['services']['Insert'];
type ServiceUpdate = Database['public']['Tables']['services']['Update'];

class ServicesService extends BaseService<Service> {
  constructor() {
    super('services');
  }

  async getServicesByBarbershop(barbershopId: string): Promise<Service[]> {
    const { data, error } = await this.query()
      .select('*')
      .eq('barbershop_id', barbershopId)
      .order('order_index', { ascending: true });

    if (error) this.handleError(error);
    return data || [];
  }

  async getActiveServices(): Promise<Service[]> {
    const { data, error } = await this.query()
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) this.handleError(error);
    return data || [];
  }

  async getServicesByIds(ids: string[]): Promise<Service[]> {
    const { data, error } = await this.query().select('*').in('id', ids);

    if (error) this.handleError(error);
    return data || [];
  }

  async createService(service: ServiceInsert): Promise<Service> {
    return this.create(service);
  }

  async updateService(id: string, updates: ServiceUpdate): Promise<Service> {
    return this.update(id, updates);
  }

  async toggleServiceStatus(id: string): Promise<Service> {
    const _service = await this.getById(id);
    return this.update(id, { is_active: !service.is_active });
  }

  async getServiceDuration(serviceId: string): Promise<number> {
    const { data, error } = await this.query()
      .select('duration_minutes')
      .eq('id', serviceId)
      .single();

    if (error) this.handleError(error);
    return data?.duration_minutes || 30; // Default 30 minutos
  }

  async updateServiceOrder(
    serviceId: string,
    newOrderIndex: number
  ): Promise<Service> {
    return this.update(serviceId, { order_index: newOrderIndex });
  }

  async getAllServicesByBarbershop(barbershopId: string): Promise<Service[]> {
    const { data, error } = await this.query()
      .select('*')
      .eq('barbershop_id', barbershopId)
      .order('order_index', { ascending: true });

    if (error) this.handleError(error);
    return data || [];
  }
}

export const _servicesService = new ServicesService();
