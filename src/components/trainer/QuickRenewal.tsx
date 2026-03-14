import React, { useState } from 'react';
import { useViewModels } from '../../core/providers/ViewModelProvider';
import { Program } from '../../core/types';

interface QuickRenewalProps {
  program: Program;
  onSuccess?: () => void;
}

export const QuickRenewal: React.FC<QuickRenewalProps> = ({ program, onSuccess }) => {
  const { trainerViewModel } = useViewModels();
  const [isRenewing, setIsRenewing] = useState(false);
  const [newSessions, setNewSessions] = useState(program.totalSessions);
  const [reason, setReason] = useState('');

  const handleRenewal = async () => {
    setIsRenewing(true);
    try {
      const success = await trainerViewModel.renewClientProgram(program.id, {
        newTotalSessions: newSessions,
        reason: reason || 'Renovación estándar',
        renewedBy: trainerViewModel.selectedTrainer?.name || 'Entrenador'
      });
      
      if (success) {
        onSuccess?.();
      }
    } finally {
      setIsRenewing(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-gray-900">Renovar Programa</h4>
        <span className="text-sm text-gray-500">{program.clientName}</span>
      </div>

      <div className="space-y-4">
        {/* Información actual */}
        <div className="bg-gray-50 rounded p-3">
          <p className="text-sm text-gray-600 mb-2">Programa actual:</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="font-medium">Sesiones:</span> {program.usedSessions}/{program.totalSessions}
            </div>
            <div>
              <span className="font-medium">Restantes:</span> {program.remainingSessions}
            </div>
            <div>
              <span className="font-medium">Estado:</span> 
              <span className={`ml-1 px-2 py-1 rounded text-xs ${
                program.status === 'active' ? 'bg-green-100 text-green-800' :
                program.status === 'expired' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {program.status === 'active' ? 'Activo' :
                 program.status === 'expired' ? 'Expirado' :
                 program.status}
              </span>
            </div>
            <div>
              <span className="font-medium">Vence:</span> 
              {new Date(program.endDate).toLocaleDateString('es-ES')}
            </div>
          </div>
        </div>

        {/* Formulario de renovación */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nuevas sesiones
          </label>
          <input
            type="number"
            min="1"
            max="52"
            value={newSessions}
            onChange={(e) => setNewSessions(parseInt(e.target.value) || 1)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Mínimo 12 sesiones (3 veces por semana durante 1 mes)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Razón de renovación (opcional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ej: Cliente quiere aumentar frecuencia, preparación para competencia, etc."
          />
        </div>

        {/* Botones de acción */}
        <div className="flex gap-3">
          <button
            onClick={handleRenewal}
            disabled={isRenewing || newSessions < 12}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isRenewing ? 'Renovando...' : 'Renovar Programa'}
          </button>
          <button
            onClick={onSuccess}
            disabled={isRenewing}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
        </div>

        {/* Información de renovación */}
        {newSessions >= 12 && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-sm text-blue-800">
              <strong>Resumen de renovación:</strong>
            </p>
            <ul className="text-xs text-blue-700 mt-1 space-y-1">
              <li>• {newSessions} sesiones totales</li>
              <li>• Vigencia de {Math.ceil(newSessions / 3)} semanas (3 veces por semana)</li>
              <li>• Nueva fecha de vencimiento: {
                new Date(Date.now() + (Math.ceil(newSessions / 3) * 7 * 24 * 60 * 60 * 1000))
                  .toLocaleDateString('es-ES')
              }</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};