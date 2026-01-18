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
    name: 'Carlos Mendoza',
    specialization: 'Fuerza y Acondicionamiento',
    availableSlots: ['09:00', '10:00', '11:00', '16:00', '17:00', '18:00']
  },
  {
    id: 'trainer2',
    name: 'Ana Torres',
    specialization: 'Yoga y Flexibilidad',
    availableSlots: ['08:00', '09:00', '15:00', '16:00', '19:00', '20:00']
  },
  {
    id: 'trainer3',
    name: 'Miguel Rodriguez',
    specialization: 'CrossFit y HIIT',
    availableSlots: ['07:00', '08:00', '12:00', '17:00', '18:00', '19:00']
  },
  {
    id: 'trainer4',
    name: 'Laura García',
    specialization: 'Pilates y Core',
    availableSlots: ['10:00', '11:00', '14:00', '15:00', '16:00', '17:00']
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
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Seleccionar Horario
        </h2>
        <p className="text-gray-600">
          Fecha seleccionada: <span className="font-semibold text-gray-900 capitalize">{formattedDate}</span>
        </p>
      </div>

      <div className="space-y-6">
        {trainers.map((trainer) => (
          <div key={trainer.id} className="border border-gray-200 rounded-lg p-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{trainer.name}</h3>
              <p className="text-sm text-gray-600">{trainer.specialization}</p>
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
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">Resumen de la reserva:</h4>
          <div className="text-blue-800">
            <p><strong>Fecha:</strong> {formattedDate}</p>
            <p><strong>Entrenador:</strong> {selectedTrainer}</p>
            <p><strong>Hora:</strong> {selectedTime}</p>
          </div>
        </div>
      )}

      <div className="flex justify-between mt-8">
        <button
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
        >
          Volver
        </button>
        
        <button
          onClick={onConfirm}
          disabled={!selectedTrainer || !selectedTime}
          className={`px-8 py-3 rounded-lg font-semibold transition-colors ${
            selectedTrainer && selectedTime
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Confirmar Reserva
        </button>
      </div>
    </div>
  );
}
