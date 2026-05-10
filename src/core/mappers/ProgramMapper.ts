import { format, parseISO } from 'date-fns';
import { Program } from '../types';
import { ProgramInsert, ProgramRow } from '../types/supabase';

export class ProgramMapper {
  static toDomain(row: ProgramRow): Program {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      trainerId: row.trainer_id,
      clientIds: row.client_ids,
      startDate: parseISO(row.start_date),
      endDate: parseISO(row.end_date),
      totalSessions: row.total_sessions,
      usedSessions: row.used_sessions,
      status: row.status,
      ...(row.previous_program_id !== null && { previousProgramId: row.previous_program_id }),
    };
  }

  static toInsert(program: Omit<Program, 'id'>): ProgramInsert {
    return {
      name: program.name,
      description: program.description,
      trainer_id: program.trainerId,
      client_ids: program.clientIds,
      start_date: format(program.startDate, 'yyyy-MM-dd'),
      end_date: format(program.endDate, 'yyyy-MM-dd'),
      total_sessions: program.totalSessions,
      used_sessions: program.usedSessions,
      status: program.status,
      previous_program_id: program.previousProgramId ?? null,
    };
  }
}
