'use client';

import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useProgramViewModel, useBookingViewModel } from '@/core/providers/ViewModelProvider';

const MINIMUM_SESSIONS_FOR_RESULTS = 12;

const ClientProgramView = observer(() => {
  const vm = useProgramViewModel();
  const bookingVM = useBookingViewModel();

  useEffect(() => {
    vm.loadActiveProgram('client1');
  }, [vm]);

  // Recargar el programa cuando se confirma una reserva
  useEffect(() => {
    if (bookingVM.confirmedBooking) {
      vm.loadActiveProgram('client1');
    }
  }, [bookingVM.confirmedBooking, vm]);

  if (!vm.hasActiveProgram || !vm.activeProgram) {
    return null;
  }

  const program = vm.activeProgram;
  const pendingSessions = vm.activeProgramPendingSessions!;
  const progress = vm.activeProgramProgress!;
  const hasLowSessions = pendingSessions > 0 && pendingSessions < 3;
  const isCompleted = pendingSessions === 0;
  const reachedMinimum = program.usedSessions >= MINIMUM_SESSIONS_FOR_RESULTS;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Mi Programa</h2>
          <p className="text-sm text-gray-500">{program.name}</p>
        </div>
      </div>

      {program.description && (
        <p className="text-sm text-gray-600 mb-4">{program.description}</p>
      )}

      {/* Barra de progreso */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700">Progreso de sesiones</span>
          <span className="text-sm font-semibold text-gray-900">
            {program.usedSessions} / {program.totalSessions}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              isCompleted
                ? 'bg-green-500'
                : hasLowSessions
                ? 'bg-orange-500'
                : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Contador de sesiones pendientes */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{program.usedSessions}</div>
          <div className="text-xs text-gray-500 mt-1">Sesiones realizadas</div>
        </div>
        <div className={`rounded-lg p-3 text-center border ${
          isCompleted
            ? 'bg-green-50 border-green-200'
            : hasLowSessions
            ? 'bg-orange-50 border-orange-200'
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className={`text-2xl font-bold ${
            isCompleted ? 'text-green-700' : hasLowSessions ? 'text-orange-700' : 'text-blue-700'
          }`}>
            {pendingSessions}
          </div>
          <div className={`text-xs mt-1 ${
            isCompleted ? 'text-green-600' : hasLowSessions ? 'text-orange-600' : 'text-blue-600'
          }`}>
            Sesiones pendientes
          </div>
        </div>
      </div>

      {/* Advertencia de sesiones bajas */}
      {hasLowSessions && (
        <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg mb-4">
          <svg className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-orange-800">
            <span className="font-semibold">¡Quedan pocas sesiones!</span> Te quedan {pendingSessions} sesión{pendingSessions !== 1 ? 'es' : ''}.
            Habla con tu entrenador para renovar el programa.
          </p>
        </div>
      )}

      {/* Programa completado */}
      {isCompleted && (
        <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
          <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-green-800">
            <span className="font-semibold">¡Programa completado!</span> Has terminado todas tus sesiones.
            Contacta con tu entrenador para renovar.
          </p>
        </div>
      )}

      {/* Indicador de sesiones mínimas para resultados */}
      <div className={`flex items-start gap-2 p-3 rounded-lg border ${
        reachedMinimum
          ? 'bg-green-50 border-green-200'
          : 'bg-blue-50 border-blue-200'
      }`}>
        {reachedMinimum ? (
          <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        <p className={`text-sm ${reachedMinimum ? 'text-green-800' : 'text-blue-800'}`}>
          {reachedMinimum ? (
            <>
              <span className="font-semibold">¡Ya ves resultados!</span> Has superado las {MINIMUM_SESSIONS_FOR_RESULTS} sesiones
              mínimas recomendadas para obtener resultados visibles.
            </>
          ) : (
            <>
              <span className="font-semibold">Sesiones recomendadas:</span> Se necesitan al menos{' '}
              <span className="font-semibold">{MINIMUM_SESSIONS_FOR_RESULTS} sesiones</span> para resultados visibles.
              Te faltan {MINIMUM_SESSIONS_FOR_RESULTS - program.usedSessions} para alcanzar ese hito.
            </>
          )}
        </p>
      </div>
    </div>
  );
});

ClientProgramView.displayName = 'ClientProgramView';

export default ClientProgramView;
