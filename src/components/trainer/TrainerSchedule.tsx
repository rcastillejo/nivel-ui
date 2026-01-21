'use client';

import { useState } from 'react';
import SaveScheduleModal from './SaveScheduleModal';
import ScheduleSavedModal from './ScheduleSavedModal';

interface TimeSlot {
  time: string;
  available: boolean;
}

interface DaySchedule {
  day: string;
  slots: TimeSlot[];
}

const timeSlots = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

const daysOfWeek = [
  'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
];

// Horarios específicos por día
const getTimeSlotsForDay = (dayIndex: number) => {
  if (dayIndex === 5) { // Sábado (índice 5)
    return timeSlots.slice(0, 8); // De 06:00 a 13:00 (último horario 12:00)
  }
  return timeSlots.slice(0, 15); // Lunes a Viernes: De 06:00 a 20:00 (último horario 8pm)
};

export default function TrainerSchedule() {
  const [schedule, setSchedule] = useState<DaySchedule[]>(
    daysOfWeek.map((day, dayIndex) => ({
      day,
      slots: getTimeSlotsForDay(dayIndex).map(time => ({
        time,
        available: false
      }))
    }))
  );

  const [trainerInfo, setTrainerInfo] = useState({
    name: 'Diego Lamas',
    specialization: ''
  });

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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

  const handleConfirmSave = () => {
    // Here you would save to a backend or local storage
    console.log('Saving schedule:', { trainerInfo, schedule });
    setShowSaveModal(false);
    setShowSuccessModal(true);
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
              value={trainerInfo.name}
              onChange={(e) => setTrainerInfo(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecciona un entrenador</option>
              <option value="Diego Lamas">Diego Lamas</option>
              <option value="Jeanpierre Casas">Jeanpierre Casas</option>
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
          <div className="grid grid-cols-8 bg-gray-50 border-b">
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
          <p>• Usa "Seleccionar todo" para activar/desactivar todos los horarios de un día</p>
        </div>
      </div>

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
          disabled={!trainerInfo.name || getTotalAvailableSlots() === 0}
          className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
            trainerInfo.name && getTotalAvailableSlots() > 0
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
        trainerName={trainerInfo.name}
        specialization={trainerInfo.specialization}
        totalHours={getTotalAvailableSlots()}
        onConfirm={handleConfirmSave}
        onCancel={handleCancelSave}
      />

      {/* Success Modal */}
      <ScheduleSavedModal
        isOpen={showSuccessModal}
        trainerName={trainerInfo.name}
        specialization={trainerInfo.specialization}
        totalHours={getTotalAvailableSlots()}
        onClose={handleCloseSuccess}
      />
    </div>
  );
}
