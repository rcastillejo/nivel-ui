import React, { useEffect, useState } from 'react';
import { useViewModels } from '../../core/providers/ViewModelProvider';
import { Program } from '../../core/types';
import { ClientProgramInfo } from '../ClientProgramInfo';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface RenewalData {
  newTotalSessions: number;
  reason: string;
}

export const ProgramManager: React.FC = () => {
  const { trainerViewModel } = useViewModels();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [renewalData, setRenewalData] = useState<RenewalData>({
    newTotalSessions: 12,
    reason: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  // Datos de ejemplo - en una app real vendrían de una API
  const mockClients: Client[] = [
    { id: 'client_001', name: 'Juan Pérez', email: 'juan@email.com', phone: '987654321' },
    { id: 'client_002', name: 'María García', email: 'maria@email.com', phone: '987654322' },
    { id: 'client_003', name: 'Carlos López', email: 'carlos@email.com', phone: '987654323' }
  ];

  useEffect(() => {
    trainerViewModel.loadTrainers();
    trainerViewModel.loadClientPrograms();
  }, [trainerViewModel]);

  useEffect(() => {
    if (selectedClient) {
      trainerViewModel.loadClientPrograms(selectedClient.id);
    }
  }, [selectedClient, trainerViewModel]);

  const handleRenewProgram = async (program: Program) => {
    setSelectedProgram(program);
    setShowRenewalModal(true);
    setRenewalData({
      newTotalSessions: 12, // Default
      reason: ''
    });
  };

  const confirmRenewal = async () => {
    if (!selectedProgram || !selectedClient) return;

    setIsLoading(true);
    try {
      const success = await trainerViewModel.renewClientProgram(selectedProgram.id, {
        newTotalSessions: renewalData.newTotalSessions,
        reason: renewalData.reason,
        renewedBy: trainerViewModel.selectedTrainer?.name || 'Entrenador'
      });

      if (success) {
        setShowRenewalModal(false);
        setSelectedProgram(null);
        // Recargar programas
        trainerViewModel.loadClientPrograms(selectedClient.id);
      }
    } catch (error) {
      console.error('Error renovando programa:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getClientPrograms = (): Program[] => {
    if (!selectedClient) return [];
    return trainerViewModel.getActiveProgramsByClient(selectedClient.id);
  };

  const getAllPrograms = (): Program[] => {
    if (!selectedClient) return [];
    return trainerViewModel.clientPrograms.filter(p => p.clientId === selectedClient.id);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Gestión de Programas</h2>

      {/* Selector de clientes */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Seleccionar Cliente</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {mockClients.map((client) => (
            <div
              key={client.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedClient?.id === client.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedClient(client)}
            >
              <h4 className="font-medium text-gray-900">{client.name}</h4>
              <p className="text-sm text-gray-500">{client.email}</p>
              <p className="text-sm text-gray-500">{client.phone}</p>
              {selectedClient?.id === client.id && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-2">
                  Seleccionado
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Programas del cliente seleccionado */}
      {selectedClient && (
        <div className="space-y-6">
          {/* Programa activo */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Programa Activo</h3>
            <ClientProgramInfo clientId={selectedClient.id} />
          </div>

          {/* Todos los programas (histórico) */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Historial de Programas</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Clases
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Periodo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Frecuencia
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getAllPrograms().map((program) => (
                    <tr key={program.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {program.id.slice(-8)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          program.status === 'active' ? 'bg-green-100 text-green-800' :
                          program.status === 'expired' ? 'bg-red-100 text-red-800' :
                          program.status === 'renewed' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {program.status === 'active' ? 'Activo' :
                           program.status === 'expired' ? 'Expirado' :
                           program.status === 'renewed' ? 'Renovado' :
                           program.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {program.usedSessions}/{program.totalSessions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(program.startDate).toLocaleDateString('es-ES')} - {new Date(program.endDate).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {program.frequencyPerWeek}/semana
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {program.status === 'active' && (
                          <button
                            onClick={() => handleRenewProgram(program)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Renovar
                          </button>
                        )}
                        <button className="text-gray-600 hover:text-gray-900">
                          Ver detalles
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {getAllPrograms().length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No hay programas registrados para este cliente
                </div>
              )}
            </div>
          </div>

          {/* Estadísticas del cliente */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Estadísticas del Cliente</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {getAllPrograms().length}
                </p>
                <p className="text-sm text-gray-500">Programas totales</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {getAllPrograms().reduce((total, p) => total + p.usedSessions, 0)}
                </p>
                <p className="text-sm text-gray-500">Clases completadas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {getClientPrograms().reduce((total, p) => total + p.remainingSessions, 0)}
                </p>
                <p className="text-sm text-gray-500">Clases restantes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {Math.round(getAllPrograms().reduce((total, p) => total + p.usedSessions, 0) / getAllPrograms().length || 0)}
                </p>
                <p className="text-sm text-gray-500">Promedio por programa</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de renovación */}
      {showRenewalModal && selectedProgram && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Renovar Programa {selectedProgram.id.slice(-8)}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nuevo número de sesiones
                </label>
                <input
                  type="number"
                  min="1"
                  max="52"
                  value={renewalData.newTotalSessions}
                  onChange={(e) => setRenewalData({
                    ...renewalData,
                    newTotalSessions: parseInt(e.target.value) || 1
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Recomendado: 12 sesiones (1 mes)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo de renovación
                </label>
                <textarea
                  rows={3}
                  value={renewalData.reason}
                  onChange={(e) => setRenewalData({
                    ...renewalData,
                    reason: e.target.value
                  })}
                  placeholder="Ej: Cliente satisfecho, quiere continuar con su progreso..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Resumen:</strong> El programa será renovado con {renewalData.newTotalSessions} sesiones nuevas.
                  El programa actual será marcado como renovado.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowRenewalModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={confirmRenewal}
                disabled={isLoading || !renewalData.newTotalSessions}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Renovando...' : 'Confirmar Renovación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};