// // // // // import { BaseService } from './base.service';
// // // // // import { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

class ProfileService extends BaseService<Profile> {
  constructor() {
    super('profiles');
  }

  async getByUserId(userId: string): Promise<Profile> {
    return this.getById(userId);
  }

  async update(userId: string, updates: ProfileUpdate): Promise<Profile> {
    return super.update(userId, updates);
  }

  async updateAvatar(userId: string, avatarUrl: string): Promise<Profile> {
    return this.update(userId, { avatar_url: avatarUrl });
  }
}

export const _profileService = new ProfileService();
