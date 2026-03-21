import React, { useEffect, useMemo } from 'react';
import { useViewModels } from '../core/providers/ViewModelProvider';

interface ClientProgramInfoProps {
  clientId?: string;
}

export const ClientProgramInfo: React.FC<ClientProgramInfoProps> = ({ clientId }) => {
  const { trainerViewModel, programVM, programMediator } = useViewModels();

  useEffect(() => {
    console.log('ClientProgramInfo: clientId:', clientId);
    if (clientId) {
      programMediator.loadProgramsForTrainer(clientId);
      // También cargar programas para el BookingViewModel para validación de reservas
      programMediator.loadProgramsForBooking(clientId);
    }
  }, [programMediator, clientId]);

  // Forzar inicialización de datos de ejemplo para el cliente
  useEffect(() => {
    const initializeSampleData = async () => {
      try {
        // Verificar si ya existen programas del cliente
        const existingPrograms = await programVM.getProgramsByClient(clientId || '');
        console.log('ClientProgramInfo: Existing programs before initialization:', existingPrograms);
        
        if (existingPrograms.length === 0) {
          // Crear programa de ejemplo para el cliente actual
          const sampleProgram = await programVM.createProgram({
            clientId: clientId || 'client_001',
            trainerId: 'trainer_001',
            clientName: 'Cliente Ejemplo',
            trainerName: 'Juan Pérez',
            totalSessions: 12,
            minimumSessions: 8,
            frequencyPerWeek: 3,
            startDate: new Date().toISOString().split('T')[0],
            endDate: (() => {
              const date = new Date();
              date.setDate(date.getDate() + 28);
              return date.toISOString().split('T')[0];
            })()
          });
          
          console.log('ClientProgramInfo: Sample program created:', sampleProgram);
          
          // Forzar recarga de datos después de crear el programa
          if (clientId) {
            programMediator.loadProgramsForTrainer(clientId);
            programMediator.loadProgramsForBooking(clientId);
          }
        }
      } catch (error) {
        console.error('ClientProgramInfo: Error initializing sample data:', error);
      }
    };

    console.log('ClientProgramInfo: Initializing with clientId:', clientId);
    initializeSampleData();
  }, [clientId, trainerViewModel, programVM]);

  const activePrograms = trainerViewModel.getActiveProgramsByClient(clientId || '');
  const activeProgram = activePrograms.length > 0 ? activePrograms[0] : null;
  
  console.log('ClientProgramInfo: activePrograms:', activePrograms);
  console.log('ClientProgramInfo: activeProgram:', activeProgram);

  const programStatus = useMemo(() => {
    if (!activeProgram) return null;

    const progressPercentage = (activeProgram.usedSessions / activeProgram.totalSessions) * 100;
    const isLowSessions = activeProgram.remainingSessions <= 3;
    const isExpired = activeProgram.status === 'expired';
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const isExpiringSoon = new Date(activeProgram.endDate) <= sevenDaysFromNow;

    return {
      progressPercentage,
      isLowSessions,
      isExpired,
      isExpiringSoon
    };
  }, [activeProgram]);

  if (!activeProgram) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Sin programa activo
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>No tienes un programa de entrenamiento activo. Contacta a tu entrenador para comenzar.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!programStatus) return null;

  return (
    <div className={`rounded-lg p-4 ${programStatus.isExpired ? 'bg-red-50 border border-red-200' : programStatus.isExpiringSoon ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Mi Programa de Entrenamiento</h3>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          activeProgram.status === 'active' ? 'bg-green-100 text-green-800' :
          activeProgram.status === 'expired' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {activeProgram.status === 'active' ? 'Activo' :
           activeProgram.status === 'expired' ? 'Expirado' :
           activeProgram.status}
        </span>
      </div>

      {/* Información básica del programa */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-500">Entrenador</p>
          <p className="text-sm font-medium text-gray-900">{activeProgram.trainerName}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Frecuencia</p>
          <p className="text-sm font-medium text-gray-900">{activeProgram.frequencyPerWeek} veces por semana</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Inicio</p>
          <p className="text-sm font-medium text-gray-900">
            {new Date(activeProgram.startDate).toLocaleDateString('es-ES')}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Vencimiento</p>
          <p className="text-sm font-medium text-gray-900">
            {new Date(activeProgram.endDate).toLocaleDateString('es-ES')}
          </p>
        </div>
      </div>

      {/* Progress bar de sesiones */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm text-gray-500">Progreso de sesiones</p>
          <p className="text-sm font-medium text-gray-900">
            {activeProgram.usedSessions} / {activeProgram.totalSessions} clases
          </p>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              programStatus.isLowSessions ? 'bg-red-500' : 'bg-blue-500'
            }`}
            style={{ width: `${programStatus.progressPercentage}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {activeProgram.remainingSessions} clases restantes
        </p>
      </div>

      {/* Alertas */}
      {programStatus.isExpired && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-3">
          <p className="text-sm">
            <strong>Tu programa ha expirado.</strong> Contacta a tu entrenador para renovarlo.
          </p>
        </div>
      )}

      {programStatus.isExpiringSoon && !programStatus.isExpired && (
        <div className="bg-orange-100 border border-orange-400 text-orange-700 px-3 py-2 rounded mb-3">
          <p className="text-sm">
            <strong>Tu programa expira pronto.</strong> Te quedan {activeProgram.remainingSessions} clases.
          </p>
        </div>
      )}

      {programStatus.isLowSessions && !programStatus.isExpired && !programStatus.isExpiringSoon && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-3 py-2 rounded mb-3">
          <p className="text-sm">
            <strong>Te quedan pocas clases.</strong> Considera renovar tu programa.
          </p>
        </div>
      )}

      {/* Estadísticas adicionales */}
      <div className="border-t pt-3">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-600">{activeProgram.totalSessions}</p>
            <p className="text-xs text-gray-500">Total clases</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{activeProgram.usedSessions}</p>
            <p className="text-xs text-gray-500">Completadas</p>
          </div>
          <div>
            <p className={`text-2xl font-bold ${programStatus.isLowSessions ? 'text-red-600' : 'text-orange-600'}`}>
              {activeProgram.remainingSessions}
            </p>
            <p className="text-xs text-gray-500">Restantes</p>
          </div>
        </div>
      </div>
    </div>
  );
};