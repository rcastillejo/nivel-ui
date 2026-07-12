'use client';

import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { format } from 'date-fns';
import { useProgramViewModel, useClientViewModel } from '@/core/providers/ViewModelProvider';
import { useAuthViewModel } from '@/core/providers/AuthProvider';

function getTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function toLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function computeWeeklyFrequency(
  startDateStr: string,
  endDateStr: string,
  totalSessions: number
): string {
  if (!startDateStr || !endDateStr || totalSessions <= 0) return '—';
  const start = toLocalDate(startDateStr);
  const end = toLocalDate(endDateStr);
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return '—';
  const weeks = diffMs / (7 * 24 * 60 * 60 * 1000);
  if (weeks < 1) return `${totalSessions} sesiones (< 1 semana)`;
  const freq = totalSessions / weeks;
  return `${freq.toFixed(1)} sesiones/semana`;
}

const CreateProgramForm = observer(function CreateProgramForm() {
  const programVM = useProgramViewModel();
  const clientVM = useClientViewModel();
  const authVM = useAuthViewModel();
  const trainerId = authVM.currentUser?.id;

  useEffect(() => {
    if (trainerId) {
      programVM.setFormTrainerId(trainerId);
    }
  }, [programVM, trainerId]);

  const { formData } = programVM;

  const startDateStr = formData.startDate
    ? format(formData.startDate, 'yyyy-MM-dd')
    : '';
  const endDateStr = formData.endDate
    ? format(formData.endDate, 'yyyy-MM-dd')
    : '';

  const weeklyFrequency = computeWeeklyFrequency(
    startDateStr,
    endDateStr,
    formData.totalSessions
  );

  const handleClientToggle = (clientId: string) => {
    const current = formData.clientIds;
    if (current.includes(clientId)) {
      programVM.setFormClientIds(current.filter(id => id !== clientId));
    } else {
      programVM.setFormClientIds([...current, clientId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await programVM.createProgram();
  };

  return (
    <form data-testid="create-program-form" onSubmit={handleSubmit} className="space-y-5">
      {programVM.error && (
        <div data-testid="create-program-error" className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {programVM.error}
        </div>
      )}

      {programVM.showSuccessModal && programVM.createdProgram && (
        <div data-testid="create-program-success" className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          Programa <strong>{programVM.createdProgram.name}</strong> creado exitosamente.
          <button
            type="button"
            onClick={() => programVM.closeSuccessModal()}
            className="ml-2 underline"
          >
            Cerrar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del programa <span className="text-red-500">*</span>
          </label>
          <input
            data-testid="input-program-name"
            type="text"
            value={formData.name}
            onChange={e => programVM.setFormName(e.target.value)}
            placeholder="Ej. Plan de tonificación"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Total de sesiones <span className="text-red-500">*</span>
          </label>
          <input
            data-testid="input-total-sessions"
            type="number"
            min={1}
            value={formData.totalSessions || ''}
            onChange={e =>
              programVM.setFormTotalSessions(parseInt(e.target.value, 10) || 0)
            }
            placeholder="Ej. 12"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha de inicio <span className="text-red-500">*</span>
          </label>
          <input
            data-testid="input-start-date"
            type="date"
            min={getTomorrow()}
            value={startDateStr}
            onChange={e => {
              if (e.target.value) {
                programVM.setFormStartDate(toLocalDate(e.target.value));
              }
            }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha de fin <span className="text-red-500">*</span>
          </label>
          <input
            data-testid="input-end-date"
            type="date"
            min={startDateStr || getTomorrow()}
            value={endDateStr}
            onChange={e => {
              if (e.target.value) {
                programVM.setFormEndDate(toLocalDate(e.target.value));
              }
            }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Frecuencia semanal estimada
        </label>
        <div data-testid="weekly-frequency-display" className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600">
          {weeklyFrequency}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descripción <span className="text-red-500">*</span>
        </label>
        <textarea
          data-testid="input-description"
          value={formData.description}
          onChange={e => programVM.setFormDescription(e.target.value)}
          placeholder="Objetivos y detalles del programa..."
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cliente(s) <span className="text-red-500">*</span>
        </label>
        <div data-testid="clientVM.clients-checkbox-container" className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
          {clientVM.clients.filter(c => c.status === 'active').map(client => (
            <label
              key={client.id}
              className="flex items-center space-x-2 cursor-pointer"
            >
              <input
                data-testid={`client-checkbox-${client.id}`}
                type="checkbox"
                checked={formData.clientIds.includes(client.id)}
                onChange={() => handleClientToggle(client.id)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 truncate">{client.name}</span>
            </label>
          ))}
          {clientVM.clients.filter(c => c.status === 'active').length === 0 && (
            <p className="text-sm text-gray-400 col-span-full">No hay clientes activos</p>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-2">
        <button
          data-testid="btn-clear-form"
          type="button"
          onClick={() => {
            programVM.resetForm();
            if (trainerId) {
              programVM.setFormTrainerId(trainerId);
            }
            programVM.clearError();
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Limpiar
        </button>
        <button
          data-testid="btn-submit-program"
          type="submit"
          disabled={programVM.isLoading || !programVM.canCreateProgram}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {programVM.isLoading ? 'Guardando...' : 'Crear Programa'}
        </button>
      </div>
    </form>
  );
});

export default CreateProgramForm;
