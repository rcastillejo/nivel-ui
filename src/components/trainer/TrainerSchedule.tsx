'use client';

import { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import SaveScheduleModal from './SaveScheduleModal';
import ScheduleSavedModal from './ScheduleSavedModal';
import { useTrainerViewModel } from '@/core/providers/ViewModelProvider';
import { DaySchedule, TrainerSchedule } from '@/core/types';

const timeSlots = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

const daysOfWeek = [
  'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
];

const getTimeSlotsForDay = (dayIndex: number) => {
  if (dayIndex === 5) {
    return timeSlots.slice(0, 8);
  }
  return timeSlots.slice(0, 15);
};

const buildDefaultSchedule = (): DaySchedule[] =>
  daysOfWeek.map((day, dayIndex) => ({
    day,
    slots: getTimeSlotsForDay(dayIndex).map(time => ({ time, available: false }))
  }));

const TrainerScheduleComponent = observer(function TrainerSchedule() {
  const vm = useTrainerViewModel();
  const currentSchedule = vm.currentSchedule;

  const [schedule, setSchedule] = useState<DaySchedule[]>(buildDefaultSchedule);
  const [trainerName, setTrainerName] = useState('Diego Lamas');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const trainersToDisplay = vm.trainers.length > 0
    ? vm.trainers
    : [{ id: '', name: 'Diego Lamas' }, { id: '', name: 'Jeanpierre Casas' }];

  useEffect(() => {
    vm.loadTrainers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Set trainer in ViewModel when trainers list loads or trainer name changes
  useEffect(() => {
    if (vm.trainers.length > 0 && trainerName) {
      const trainer = vm.trainers.find(t => t.name === trainerName);
      if (trainer && vm.selectedTrainerId !== trainer.id) {
        vm.setSelectedTrainer(trainer.id);
      }
    }
  }, [vm.trainers.length, trainerName]); // eslint-disable-line react-hooks/exhaustive-deps

  // Populate local schedule when the VM loads one from persistence
  useEffect(() => {
    if (currentSchedule) {
      const slotsByDay: DaySchedule[] = daysOfWeek.map((day, dayIndex) => {
        const storedDay = currentSchedule.weeklySchedule[dayIndex];
        const slotMap = storedDay
          ? Object.fromEntries(storedDay.slots.map(s => [s.time, s.available]))
          : {};
        return {
          day,
          slots: getTimeSlotsForDay(dayIndex).map(time => ({
            time,
            available: slotMap[time] ?? false
          }))
        };
      });
      setSchedule(slotsByDay);
    }
  }, [currentSchedule]);

  const handleSlotToggle = (dayIndex: number, slotIndex: number) => {
    setSchedule(prev => prev.map((day, dIndex) =>
      dIndex === dayIndex
        ? {
            ...day,
            slots: day.slots.map((slot, sIndex) =>
              sIndex === slotIndex
                ? { ...slot, available: !slot.available }
                : slot
            )
          }
        : day
    ));
  };

  const handleSelectAllDay = (dayIndex: number) => {
    const allSelected = schedule[dayIndex].slots.every(slot => slot.available);
    setSchedule(prev => prev.map((day, dIndex) =>
      dIndex === dayIndex
        ? {
            ...day,
            slots: day.slots.map(slot => ({ ...slot, available: !allSelected }))
          }
        : day
    ));
  };

  const handleSaveSchedule = () => {
    setShowSaveModal(true);
  };

  const handleConfirmSave = async () => {
    // Search in trainersToDisplay so the hardcoded fallbacks are also found
    const trainer = trainersToDisplay.find(t => t.name === trainerName);
    if (!trainer?.id) {
      // Trainers haven't loaded from the server yet; inform the user
      setShowSaveModal(false);
      return;
    }

    setIsSaving(true);
    const scheduleData: TrainerSchedule = {
      trainerId: trainer.id,
      trainerName: trainer.name,
      weeklySchedule: schedule
    };

    const success = await vm.saveSchedule(scheduleData);
    setIsSaving(false);
    setShowSaveModal(false);
    if (success) {
      setShowSuccessModal(true);
    }
  };

  const handleCancelSave = () => {
    setShowSaveModal(false);
  };

  const handleCloseSuccess = () => {
    setShowSuccessModal(false);
  };

  const getTotalAvailableSlots = () => {
    return schedule.reduce((total, day) =>
      total + day.slots.filter(slot => slot.available).length, 0
    );
  };

  return (
    <div className="space-y-6">
      {/* Trainer Info Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Información del Entrenador</h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entrenador
            </label>
            <select
              value={trainerName}
              onChange={(e) => setTrainerName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecciona un entrenador</option>
              {trainersToDisplay.map(t => (
                <option key={t.id || t.name} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Schedule Grid */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Configurar Horario Semanal
          </h3>
          <div className="text-sm text-gray-600">
            Total de horas disponibles: <span className="font-semibold">{getTotalAvailableSlots()}</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Time header */}
          <div className="grid grid-cols-8 bg-white border-b">
            <div className="p-3 font-medium text-gray-700 text-center">Horario</div>
            {daysOfWeek.map(day => (
              <div key={day} className="p-3 font-medium text-gray-700 text-center">
                <div>{day}</div>
                <button
                  onClick={() => handleSelectAllDay(daysOfWeek.indexOf(day))}
                  className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                >
                  Seleccionar todo
                </button>
              </div>
            ))}
          </div>

          {/* Time slots grid */}
          {timeSlots.slice(0, Math.max(...daysOfWeek.map((_, dayIndex) => getTimeSlotsForDay(dayIndex).length))).map((time, timeIndex) => (
            <div key={time} className="grid grid-cols-8 border-b border-gray-100 hover:bg-gray-50">
              <div className="p-3 text-center font-medium text-gray-600 bg-gray-25">
                {time}
              </div>
              {daysOfWeek.map((day, dayIndex) => {
                const daySlots = getTimeSlotsForDay(dayIndex);
                const slot = schedule[dayIndex].slots[timeIndex];
                const isTimeAvailable = timeIndex < daySlots.length;

                return (
                  <div key={`${day}-${time}`} className="p-2 text-center">
                    {isTimeAvailable ? (
                      <button
                        onClick={() => handleSlotToggle(dayIndex, timeIndex)}
                        className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                          slot && slot.available
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'bg-white border-gray-300 hover:border-green-400'
                        }`}
                        title={slot && slot.available ? 'Disponible - Click para desactivar' : 'No disponible - Click para activar'}
                      >
                        {slot && slot.available ? '✓' : ''}
                      </button>
                    ) : (
                      <div className="w-8 h-8 flex items-center justify-center">
                        <span className="text-gray-300 text-sm">-</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="text-sm text-gray-500 mt-2">
          <p>• Haz clic en los círculos para marcar tu disponibilidad</p>
          <p>• Usa &quot;Seleccionar todo&quot; para activar/desactivar todos los horarios de un día</p>
        </div>
      </div>

      {/* Error feedback */}
      {vm.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {vm.error}
        </div>
      )}

      {/* Save Section */}
      <div className="flex justify-between items-center pt-6 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          {getTotalAvailableSlots() > 0 ? (
            <span className="text-green-600 font-medium">
              ✓ {getTotalAvailableSlots()} horas configuradas
            </span>
          ) : (
            <span className="text-gray-500">
              Selecciona al menos un horario disponible
            </span>
          )}
        </div>
        <button
          onClick={handleSaveSchedule}
          disabled={!trainerName || getTotalAvailableSlots() === 0}
          className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
            trainerName && getTotalAvailableSlots() > 0
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Guardar Horario
        </button>
      </div>

      {/* Save Confirmation Modal */}
      <SaveScheduleModal
        isOpen={showSaveModal}
        trainerName={trainerName}
        specialization=""
        totalHours={getTotalAvailableSlots()}
        onConfirm={handleConfirmSave}
        onCancel={handleCancelSave}
        isSaving={isSaving}
      />

      {/* Success Modal */}
      <ScheduleSavedModal
        isOpen={showSuccessModal}
        trainerName={trainerName}
        specialization=""
        totalHours={getTotalAvailableSlots()}
        onClose={handleCloseSuccess}
      />
    </div>
  );
});

export default TrainerScheduleComponent;
