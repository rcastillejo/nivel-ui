'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRescheduleViewModel } from '@/core/providers/ViewModelProvider';
import { ZONE_CONFIG } from '@/core/types';
import CalendarStep from '../CalendarStep';
import TimeSelectionView from '../TimeSelectionView';

interface RescheduleDialogProps {
  // Se llama cuando el cambio se guardó, para que la vista refresque sus listas
  onRescheduled: () => void;
}

const RescheduleDialog = observer(function RescheduleDialog({ onRescheduled }: RescheduleDialogProps) {
  const vm = useRescheduleViewModel();
  const target = vm.target;

  if (!target) {
    return null;
  }

  const zone = ZONE_CONFIG[target.zone];

  const handleTimeSelect = (trainerName: string, time: string) => {
    const trainer = vm.trainers.find((t) => `Entrenador ${t.name}` === trainerName);
    if (trainer) {
      vm.selectSlot(trainer.id, time);
    }
  };

  const handleConfirm = async () => {
    if (await vm.confirm()) {
      onRescheduled();
    }
  };

  return (
    <div
      data-testid="reschedule-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reschedule-dialog-title"
      className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full my-8">
        <div className="p-6 border-b border-gray-200 flex items-start justify-between gap-4">
          <div>
            <h3 id="reschedule-dialog-title" className="text-xl font-semibold text-gray-900">
              Reprogramar cita
            </h3>
            <p data-testid="reschedule-current" className="mt-1 text-sm text-gray-600">
              Cita actual:{' '}
              <span className="first-letter:uppercase">
                {format(target.date, "EEEE, d 'de' MMMM", { locale: es })}
              </span>{' '}
              · {target.time} · {target.trainerName} · {zone.icon} {zone.name}
            </p>
          </div>
          <button
            type="button"
            data-testid="reschedule-close"
            aria-label="Cerrar"
            onClick={() => vm.close()}
            disabled={vm.isSubmitting}
            className="text-2xl leading-none text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-8">
          {vm.error && (
            <p
              data-testid="reschedule-error"
              role="alert"
              className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800"
            >
              {vm.error}
            </p>
          )}

          <CalendarStep
            selectedDate={vm.selectedDate}
            onDateSelect={(date) => {
              void vm.setDate(date);
            }}
          />

          {vm.isLoading && (
            <p data-testid="reschedule-loading" className="text-center text-gray-600">
              Cargando horarios...
            </p>
          )}

          {vm.selectedDate && (
            <TimeSelectionView
              selectedDate={vm.selectedDate}
              trainers={vm.trainers}
              slotsByTrainer={vm.availableSlotsByTrainer}
              bookings={vm.bookings}
              selectedTrainerName={vm.selectedTrainerName}
              selectedTime={vm.selectedTime}
              selectedZone={vm.selectedZone}
              onTimeSelect={handleTimeSelect}
              onZoneSelect={(selectedZone) => vm.setZone(selectedZone)}
              onBack={() => vm.clearSlot()}
              onConfirm={handleConfirm}
              canConfirm={vm.canConfirm && !vm.isSubmitting}
              isSubmitting={vm.isSubmitting}
              title="¿A qué horario quieres mover tu cita?"
              confirmationTitle="Solo falta confirmar el cambio"
              confirmLabel="Confirmar cambio"
              submittingLabel="Guardando..."
              showProgramInfo={false}
            />
          )}
        </div>
      </div>
    </div>
  );
});

export default RescheduleDialog;
