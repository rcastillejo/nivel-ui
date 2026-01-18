'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SuccessModalProps {
  isOpen: boolean;
  selectedDate: Date;
  selectedTrainer: string;
  selectedTime: string;
  onClose: () => void;
}

export default function SuccessModal({
  isOpen,
  selectedDate,
  selectedTrainer,
  selectedTime,
  onClose
}: SuccessModalProps) {
  if (!isOpen) return null;

  const formattedDate = format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900 text-center">
            ¡Reserva Confirmada!
          </h3>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              ¡Tu sesión ha sido reservada exitosamente!
            </h4>
            <p className="text-gray-600">
              Te enviaremos un email de confirmación con todos los detalles.
            </p>
          </div>

          {/* Booking details */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-green-900 mb-3 text-center">Detalles de tu reserva</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-green-700">Fecha:</span>
                <span className="font-medium text-green-900 capitalize">{formattedDate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-green-700">Entrenador:</span>
                <span className="font-medium text-green-900">{selectedTrainer}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-green-700">Hora:</span>
                <span className="font-medium text-green-900">{selectedTime}</span>
              </div>
            </div>
          </div>

          {/* Additional info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h5 className="font-semibold text-blue-900 mb-2">Recordatorio:</h5>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Llega 10 minutos antes de tu sesión</li>
              <li>• Trae agua y una toalla</li>
              <li>• Usa ropa deportiva adecuada</li>
            </ul>
          </div>

          <div className="text-sm text-gray-500 text-center">
            <p>Si necesitas cancelar o modificar tu reserva, contáctanos con al menos 2 horas de anticipación.</p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Hacer Nueva Reserva
          </button>
        </div>
      </div>
    </div>
  );
}
