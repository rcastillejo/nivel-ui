'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ConfirmationModalProps {
  isOpen: boolean;
  selectedDate: Date;
  selectedTrainer: string;
  selectedTime: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationModal({
  isOpen,
  selectedDate,
  selectedTrainer,
  selectedTime,
  onConfirm,
  onCancel
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const formattedDate = format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900 text-center">
            Confirmar Reserva
          </h3>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que deseas confirmar esta reserva?
            </p>
          </div>

          {/* Booking details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-gray-900 mb-3 text-center">Detalles de la reserva</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Fecha:</span>
                <span className="font-medium text-gray-900 capitalize">{formattedDate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Entrenador:</span>
                <span className="font-medium text-gray-900">{selectedTrainer}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Hora:</span>
                <span className="font-medium text-gray-900">{selectedTime}</span>
              </div>
            </div>
          </div>

          <div className="text-sm text-gray-500 text-center mb-6">
            <p>Una vez confirmada, recibirás un email con los detalles de tu reserva.</p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
