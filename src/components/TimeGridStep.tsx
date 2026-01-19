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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Seleccionar Horario y Entrenador
        </h2>
        <div className="inline-flex items-center px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-blue-800 font-medium capitalize">{formattedDate}</span>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Selecciona un horario disponible para completar tu reserva
        </p>
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
              Confirmar tu Reserva
            </h4>
            <p className="text-gray-600">
              Revisa los detalles de tu sesión de entrenamiento
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
            <h5 className="font-semibold text-gray-900 mb-3 text-center">Detalles de la reserva</h5>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600 font-medium">Fecha:</span>
                <span className="font-semibold text-gray-900 capitalize">{formattedDate}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600 font-medium">Entrenador:</span>
                <span className="font-semibold text-gray-900">{selectedTrainer}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600 font-medium">Hora:</span>
                <span className="font-semibold text-gray-900">{selectedTime}</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h6 className="font-semibold text-blue-900 mb-1">Importante:</h6>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Llega 10 minutos antes de tu sesión</li>
                  <li>• Trae agua y una toalla</li>
                  <li>• Usa ropa deportiva adecuada</li>
                </ul>
              </div>
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
