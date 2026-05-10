import { parseISO } from 'date-fns';
import { Client } from '../types';
import { UserProfileRow } from '../types/supabase';

export class ClientMapper {
  // UserProfileRow does not include email or phone — those live in auth.users.
  // The caller must fetch those fields from the Supabase Auth API and pass them in.
  static toDomain(
    row: UserProfileRow,
    email: string,
    phone: string = '',
  ): Client {
    return {
      id: row.id,
      name: row.full_name ?? email,
      email,
      phone,
      status: 'active',
      createdAt: parseISO(row.created_at),
    };
  }
}
