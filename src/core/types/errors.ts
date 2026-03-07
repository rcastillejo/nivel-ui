import { ZoneType, ZONE_CONFIG } from './index';

export class BookingCapacityError extends Error {
  constructor(
    public zone: ZoneType,
    public current: number,
    public max: number
  ) {
    super(`El ${ZONE_CONFIG[zone].name} está lleno (${current}/${max})`);
    this.name = 'BookingCapacityError';
  }
}