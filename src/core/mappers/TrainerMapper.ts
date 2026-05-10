import { Trainer } from '../types';
import { TrainerRow } from '../types/supabase';

export class TrainerMapper {
  // availableSlots is not stored in the trainers table — it derives from trainer_schedules.
  // Callers populate it by passing the result of TrainerScheduleMapper.toAvailableSlots().
  static toDomain(row: TrainerRow, availableSlots: string[] = []): Trainer {
    return {
      id: row.id,
      name: row.name,
      availableSlots,
    };
  }
}
