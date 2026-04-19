import { TrainerSchedule } from '../types';
import { IDataService } from '../repositories';

export class ScheduleModel {
  constructor(private dataService: IDataService) {}

  async getTrainerSchedule(trainerId: string): Promise<TrainerSchedule | null> {
    return this.dataService.trainers.getSchedule(trainerId);
  }

  async getAvailableSlots(trainerId: string, date: Date): Promise<string[]> {
    const trainer = await this.dataService.trainers.getById(trainerId);
    if (!trainer) return [];

    const trainerSchedule = await this.dataService.trainers.getSchedule(trainerId);
    if (!trainerSchedule) {
      return [...trainer.availableSlots];
    }

    const dayOfWeek = date.getDay();
    const dayIndex = dayOfWeek === 0 ? -1 : dayOfWeek - 1;

    if (dayIndex < 0 || dayIndex > 5) return [];

    const daySchedule = trainerSchedule.weeklySchedule[dayIndex];
    if (!daySchedule) return [];

    return daySchedule.slots
      .filter(slot => slot.available)
      .map(slot => slot.time);
  }

  async isSlotAvailable(trainerId: string, date: Date, time: string): Promise<boolean> {
    const availableSlots = await this.getAvailableSlots(trainerId, date);
    return availableSlots.includes(time);
  }
}
