'use client';

interface SaveScheduleModalProps {
  isOpen: boolean;
  trainerName: string;
  specialization?: string;
  totalHours: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function SaveScheduleModal({
  isOpen,
  trainerName,
  specialization,
  totalHours,
  onConfirm,
  onCancel
}: SaveScheduleModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900 text-center">
            Confirmar Guardado de Horario
          </h3>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que deseas guardar tu horario de disponibilidad?
            </p>
          </div>

          {/* Schedule summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-blue-900 mb-3 text-center">Resumen del horario</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-blue-700">Entrenador:</span>
                <span className="font-medium text-blue-900">Entrenador {trainerName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-700">Horas disponibles:</span>
                <span className="font-medium text-blue-900">{totalHours} horas</span>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h5 className="font-semibold text-yellow-900 mb-1">Importante:</h5>
                <p className="text-sm text-yellow-800">
                  Una vez guardado, este horario estará disponible para que los clientes puedan hacer reservas.
                </p>
              </div>
            </div>
          </div>

          <div className="text-sm text-gray-500 text-center">
            <p>Podrás modificar tu horario en cualquier momento desde esta pantalla.</p>
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
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Guardar Horario
          </button>
        </div>
      </div>
    </div>
  );
}
