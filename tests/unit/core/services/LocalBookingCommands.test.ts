import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocalBookingCommands } from '@/core/services/LocalBookingCommands';
import { BookingCommandsModel } from '@/core/models/BookingCommandsModel';
import { Booking } from '@/core/types';

const commandsModel = { createBooking: vi.fn(), cancelBooking: vi.fn() };
const fixedNow = new Date('2026-11-10T12:00:00.000Z');
const booking = { id: 'b1' } as Booking;

describe('LocalBookingCommands', () => {
  let commands: LocalBookingCommands;
  let clientId = 'client1';

  beforeEach(() => {
    vi.clearAllMocks();
    clientId = 'client1';
    commands = new LocalBookingCommands(commandsModel as unknown as BookingCommandsModel, () => clientId, () => fixedNow);
    commandsModel.createBooking.mockResolvedValue(booking);
    commandsModel.cancelBooking.mockResolvedValue(booking);
  });

  it('create delegates with the current client id and clock', async () => {
    const request = { trainerId: 't1', date: '2026-11-15', time: '09:00', zone: 'gym' as const, timeZone: 'America/Lima' };

    await expect(commands.create(request)).resolves.toBe(booking);

    expect(commandsModel.createBooking).toHaveBeenCalledWith({ clientId: 'client1', ...request }, fixedNow);
  });

  it('cancel delegates with the current client id and clock', async () => {
    await expect(commands.cancel('b1')).resolves.toBe(booking);

    expect(commandsModel.cancelBooking).toHaveBeenCalledWith('b1', 'client1', fixedNow);
  });

  it('reads the client id lazily so a later login is respected', async () => {
    clientId = 'client2';

    await commands.cancel('b1');

    expect(commandsModel.cancelBooking).toHaveBeenCalledWith('b1', 'client2', fixedNow);
  });
});
