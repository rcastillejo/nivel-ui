'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Trainer, ZONE_CONFIG, ZoneType } from '@/core/types';
import { useTrainerBookingViewModel } from '@/core/providers/ViewModelProvider';

interface TimeGridStepWithCapacityProps {
  selectedDate: Date;
  selectedTrainer: string | null;
  selectedTime: string | null;
  selectedZone: ZoneType | null;
  onTimeSelect: (trainer: string, time: string) => void;
  onZoneSelect: (zone: ZoneType) => void;
  onBack: () => void;
  onConfirm: () => void;
}

export default function TimeGridStepWithCapacity({
  selectedDate,
  selectedTrainer,
  selectedTime,
  selectedZone,
  onTimeSelect,
  onZoneSelect,
  onBack,
  onConfirm
}: TimeGridStepWithCapacityProps) {
  const viewModel = useTrainerBookingViewModel();
  const { trainers, isLoading } = viewModel;
  const formattedDate = format(selectedDate, "EEEE, d 'de' MMMM", { locale: es });

  // Cargar horarios disponibles para cada entrenador cuando se selecciona una fecha
  React.useEffect(() => {
    if (selectedDate && trainers.length > 0) {
      trainers.forEach(trainer => {
        viewModel.loadAvailableSlots(trainer.id, selectedDate);
      });
    }
  }, [selectedDate, trainers]);

  const handleSlotClick = (trainerId: string, trainerName: string, time: string) => {
    onTimeSelect(trainerName, time);
  };

  if (isLoading) {
    return (
      <div className="border-t border-gray-200 pt-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando disponibilidad...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 pt-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          ¿Qué horario prefieres?
        </h2>
        <p className="text-gray-600">
          Se muestra la disponibilidad actual considerando las reservas existentes
        </p>
      </div>

      <div className="space-y-6">
        {trainers.map((trainer: Trainer) => {
          // Obtener los slots disponibles para este entrenador y fecha
          const availableSlotsForTrainer = viewModel.availableSlotsByTrainer[trainer.id] || [];
          const trainerDefaultSlots = trainer.availableSlots;
          
          return (
            <div key={trainer.id} className="border border-gray-200 rounded-lg p-4">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Entrenador {trainer.name}</h3>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <div className="flex items-center gap-1 text-green-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Disponible ({availableSlotsForTrainer.length})</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>
                      Lleno ({trainerDefaultSlots.length - availableSlotsForTrainer.length})
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {trainerDefaultSlots.map((time: string) => {
                  const isSelected = selectedTrainer === `Entrenador ${trainer.name}` && selectedTime === time;
                  const isAvailable = availableSlotsForTrainer.includes(time);
                  
                  return (
                    <button
                      key={time}
                      onClick={() => isAvailable && handleSlotClick(trainer.id, `Entrenador ${trainer.name}`, time)}
                      disabled={!isAvailable}
                      className={`px-3 py-2 text-sm font-medium rounded-md border transition-all duration-200 ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                          : isAvailable
                          ? 'bg-white text-gray-700 border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                          : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through'
                      }`}
                      title={!isAvailable ? 'Horario lleno' : 'Horario disponible'}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
              
              {availableSlotsForTrainer.length === 0 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 text-center">
                    <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Todos los horarios están llenos para este día
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedTrainer && selectedTime && (
        <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl shadow-sm">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 className="text-xl font-semibold text-gray-900 mb-2">
              ¡Perfecto! Solo falta confirmar tu reserva
            </h4>
          </div>

          <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
            <div className="text-center mb-3">
              <h5 className="text-lg font-semibold text-gray-900">{selectedTrainer}</h5>
              <div className="text-gray-700 mt-2">
                <span className="capitalize">{format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}</span>
                <span className="text-2xl font-bold text-blue-600 block mt-1">{selectedTime}</span>
              </div>
            </div>
          </div>

          {/* Zone Selection */}
          <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
            <h6 className="font-semibold text-gray-900 mb-3 text-center">¿Dónde prefieres tu sesión?</h6>
            <div className="grid grid-cols-2 gap-3">
              {Object.values(ZONE_CONFIG).map((zone) => (
                <button
                  key={zone.id}
                  onClick={() => onZoneSelect(zone.id)}
                  className={`px-4 py-3 rounded-lg border font-medium transition-all duration-200 ${
                    selectedZone === zone.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <span className="text-2xl mb-1">{zone.icon}</span>
                    <span>{zone.name}</span>
                  </div>
                </button>
              ))}
            </div>
            {selectedZone && (
              <div className="mt-3 text-center">
                <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {ZONE_CONFIG[selectedZone].label}
                </span>
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="text-center">
              <h6 className="font-semibold text-blue-900 mb-2">Recuerda traer:</h6>
              <div className="flex justify-center gap-6 text-sm text-blue-800">
                <span>🥤 Agua</span>
                <span>🏃‍♂️ Ropa deportiva</span>
                <span>🧺 Toalla</span>
              </div>
              <p className="text-xs text-blue-700 mt-2 flex items-center justify-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Llega 10 min antes
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => onTimeSelect('', '')}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Modificar Selección
            </button>
            <button
              onClick={onConfirm}
              disabled={!selectedZone}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors shadow-md ${
                selectedZone
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {selectedZone ? 'Confirmar Reserva' : 'Selecciona una zona'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}