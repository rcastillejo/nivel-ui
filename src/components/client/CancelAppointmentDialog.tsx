'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Booking, ZONE_CONFIG } from '@/core/types';

interface CancelAppointmentDialogProps {
  booking: Booking;
  isCancelling: boolean;
  error: string | null;
  onConfirm: () => void;
  onDismiss: () => void;
}

export default function CancelAppointmentDialog({
  booking,
  isCancelling,
  error,
  onConfirm,
  onDismiss,
}: CancelAppointmentDialogProps) {
  const zone = ZONE_CONFIG[booking.zone];

  return (
    <div
      data-testid="cancel-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-dialog-title"
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <h3 id="cancel-dialog-title" className="text-xl font-semibold text-gray-900 text-center">
            Cancelar cita
          </h3>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-gray-600 text-center">¿Seguro que quieres cancelar esta cita?</p>
          <div className="rounded-lg bg-gray-50 p-4 text-center">
            <p className="font-semibold text-gray-900 first-letter:uppercase">
              {format(booking.date, "EEEE, d 'de' MMMM", { locale: es })} · {booking.time}
            </p>
            <p className="text-sm text-gray-600">
              {booking.trainerName} · {zone.icon} {zone.name}
            </p>
          </div>

          {error && (
            <p data-testid="cancel-error" role="alert" className="text-sm text-red-700 text-center">
              {error}
            </p>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            type="button"
            data-testid="cancel-dismiss"
            onClick={onDismiss}
            disabled={isCancelling}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Mantener cita
          </button>
          <button
            type="button"
            data-testid="cancel-confirm"
            onClick={onConfirm}
            disabled={isCancelling}
            className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isCancelling ? 'Cancelando...' : 'Sí, cancelar'}
          </button>
        </div>
      </div>
    </div>
  );
}
