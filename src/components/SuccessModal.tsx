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
          </div>

          {/* Booking details - Simplified */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="text-center">
              <div className="text-lg font-semibold text-green-900 mb-2">{selectedTrainer}</div>
              <div className="text-green-800">
                <div className="capitalize">{format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}</div>
                <div className="text-xl font-bold text-green-800 mt-1">{selectedTime}</div>
              </div>
            </div>
          </div>

          <div className="text-center text-sm text-gray-600 mb-4">
            <p>📧 Recibirás un email de confirmación</p>
            <p className="mt-2 text-xs flex items-center justify-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Llega 10 min antes • Trae agua y toalla
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
          >
            Salir
          </button>
        </div>
      </div>
    </div>
  );
}
