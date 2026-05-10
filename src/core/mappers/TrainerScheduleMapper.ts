import { addDays, format, getDay, startOfWeek } from 'date-fns';
import { DaySchedule, TimeSlot, TrainerSchedule } from '../types';
import { TrainerScheduleInsert, TrainerScheduleRow } from '../types/supabase';

// Structural note: The domain TrainerSchedule uses a weekly pattern (Mon–Sat indexed 0–5).
// Supabase stores one row per slot per specific calendar date.
// These mappers bridge that gap in both directions.

const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const;

// Returns the weeklySchedule day index (0=Mon … 5=Sat) for a YYYY-MM-DD string.
// Returns -1 for Sunday (not a working day).
function toDayIndex(dateString: string): number {
  const jsDay = new Date(dateString + 'T12:00:00').getDay(); // midday avoids DST edge cases
  return jsDay === 0 ? -1 : jsDay - 1;
}

export class TrainerScheduleMapper {
  // Builds a weekly TrainerSchedule from rows that may span multiple dates.
  // Rows are grouped by day-of-week; the most permissive (any available=true) wins per slot.
  static toDomain(
    rows: TrainerScheduleRow[],
    trainerId: string,
    trainerName: string,
  ): TrainerSchedule {
    // Accumulate slots per day index
    const slotsByDay = new Map<number, Map<string, boolean>>();

    for (const row of rows) {
      const dayIndex = toDayIndex(row.date);
      if (dayIndex < 0) continue; // skip Sunday rows

      if (!slotsByDay.has(dayIndex)) {
        slotsByDay.set(dayIndex, new Map());
      }
      const daySlots = slotsByDay.get(dayIndex)!;
      // If any row for this (day, slot) is available, mark it available
      const current = daySlots.get(row.time_slot) ?? false;
      daySlots.set(row.time_slot, current || row.is_available);
    }

    const weeklySchedule: DaySchedule[] = DAY_NAMES.map((day, index) => {
      const daySlots = slotsByDay.get(index) ?? new Map<string, boolean>();
      const slots: TimeSlot[] = Array.from(daySlots.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([time, available]) => ({ time, available }));
      return { day, slots };
    });

    return { trainerId, trainerName, weeklySchedule };
  }

  // Returns the sorted list of available time strings for a specific date's rows.
  // Used by SupabaseDataService.trainers.getAvailableSlots() for a single date lookup.
  static toAvailableSlots(rows: TrainerScheduleRow[]): string[] {
    return rows
      .filter((r) => r.is_available)
      .map((r) => r.time_slot)
      .sort();
  }

  // Expands a weekly TrainerSchedule into insert rows for one calendar week.
  // weekStartDate should be a Monday; the function covers Mon–Sat (6 days).
  static toInsertRows(
    schedule: TrainerSchedule,
    weekStartDate: Date,
  ): TrainerScheduleInsert[] {
    const monday = startOfWeek(weekStartDate, { weekStartsOn: 1 });
    const rows: TrainerScheduleInsert[] = [];

    schedule.weeklySchedule.forEach((daySchedule, dayIndex) => {
      // dayIndex 0=Mon … 5=Sat
      const date = addDays(monday, dayIndex);
      const dateString = format(date, 'yyyy-MM-dd');

      for (const slot of daySchedule.slots) {
        rows.push({
          trainer_id: schedule.trainerId,
          date: dateString,
          time_slot: slot.time,
          is_available: slot.available,
        });
      }
    });

    return rows;
  }

  // Convenience: day-of-week index → day name (for building DaySchedule manually).
  static dayName(index: number): string {
    return DAY_NAMES[index] ?? '';
  }

  // Returns the day index (0=Mon … 5=Sat, -1=Sun) for a given Date.
  static dayIndexFromDate(date: Date): number {
    const jsDay = getDay(date);
    return jsDay === 0 ? -1 : jsDay - 1;
  }
}
