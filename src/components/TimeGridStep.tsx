'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Trainer {
  id: string;
  name: string;
  specialization: string;
  availableSlots: string[];
}

interface TimeGridStepProps {
  selectedDate: Date;
  selectedTrainer: string | null;
  selectedTime: string | null;
  onTimeSelect: (trainer: string, time: string) => void;
  onBack: () => void;
  onConfirm: () => void;
}

// Mock data for trainers
const trainers: Trainer[] = [
  {
    id: 'trainer1',
    name: 'Entrenador Diego Lamas',
    specialization: '',
    availableSlots: ['09:00', '10:00', '11:00', '16:00', '17:00', '18:00']
  },
  {
    id: 'trainer2',
    name: 'Entrenador Jeanpierre Casas',
    specialization: '',
    availableSlots: ['08:00', '09:00', '15:00', '16:00', '19:00', '20:00']
  }
];

export default function TimeGridStep({
  selectedDate,
  selectedTrainer,
  selectedTime,
  onTimeSelect,
  onBack,
  onConfirm
}: TimeGridStepProps) {
  const formattedDate = format(selectedDate, "EEEE, d 'de' MMMM", { locale: es });

  const handleSlotClick = (trainerId: string, trainerName: string, time: string) => {
    onTimeSelect(trainerName, time);
  };

  return (
    <div className="border-t border-gray-200 pt-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          ¿Qué horario prefieres?
        </h2>
      </div>

      <div className="space-y-6">
        {trainers.map((trainer) => (
          <div key={trainer.id} className="border border-gray-200 rounded-lg p-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{trainer.name}</h3>
            </div>
            
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {trainer.availableSlots.map((time) => {
                const isSelected = selectedTrainer === trainer.name && selectedTime === time;
                
                return (
                  <button
                    key={time}
                    onClick={() => handleSlotClick(trainer.id, trainer.name, time)}
                    className={`px-3 py-2 text-sm font-medium rounded-md border transition-all duration-200 ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                    }`}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
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
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-md"
            >
              Confirmar Reserva
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
