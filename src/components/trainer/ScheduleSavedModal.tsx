'use client';

interface ScheduleSavedModalProps {
  isOpen: boolean;
  trainerName: string;
  specialization: string;
  totalHours: number;
  onClose: () => void;
}

export default function ScheduleSavedModal({
  isOpen,
  trainerName,
  specialization,
  totalHours,
  onClose
}: ScheduleSavedModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900 text-center">
            ¡Horario Guardado Exitosamente!
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
              Tu horario ha sido configurado correctamente
            </h4>
            <p className="text-gray-600">
              Los clientes ya pueden ver tu disponibilidad y hacer reservas.
            </p>
          </div>

          {/* Schedule summary */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-green-900 mb-3 text-center">Configuración guardada</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-green-700">Entrenador:</span>
                <span className="font-medium text-green-900">{trainerName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-green-700">Especialización:</span>
                <span className="font-medium text-green-900">{specialization}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-green-700">Horas disponibles:</span>
                <span className="font-medium text-green-900">{totalHours} horas semanales</span>
              </div>
            </div>
          </div>

          {/* Additional info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h5 className="font-semibold text-blue-900 mb-2">Próximos pasos:</h5>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Los clientes pueden reservar citas en tu horario disponible</li>
              <li>• Puedes ver tus citas en la sección "Mis Citas Reservadas"</li>
              <li>• Modifica tu horario cuando necesites hacer cambios</li>
            </ul>
          </div>

          <div className="text-sm text-gray-500 text-center">
            <p>Recuerda mantener tu horario actualizado para brindar el mejor servicio.</p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
