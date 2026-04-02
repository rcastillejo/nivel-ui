'use client';

import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useProgramViewModel } from '@/core/providers/ViewModelProvider';
import { useData } from '@/core/providers/DataProvider';
import { Program } from '@/core/types';

interface RenewProgramModalProps {
  program: Program;
  onClose: () => void;
  onSuccess: () => void;
}

const RenewProgramModal = observer(function RenewProgramModal({
  program,
  onClose,
  onSuccess
}: RenewProgramModalProps) {
  const programVM = useProgramViewModel();
  const { clients } = useData();
  const [newSessions, setNewSessions] = useState(program.totalSessions);

  const clientNames = program.clientIds
    .map(id => clients.find(c => c.id === id)?.name ?? id)
    .join(', ');

  const handleRenew = async () => {
    const success = await programVM.renewProgram(program.id, newSessions);
    if (success) {
      onSuccess();
    }
  };

  return (
    <div data-testid="renew-modal" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Renovar Programa</h3>
          <button
            data-testid="renew-modal-close-x"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p data-testid="renew-modal-program-name" className="text-sm font-medium text-gray-700">{program.name}</p>
          <p data-testid="renew-modal-clients" className="text-sm text-gray-500 mt-1">Cliente(s): {clientNames}</p>
          <p data-testid="renew-modal-sessions-used" className="text-sm text-gray-500">
            Sesiones usadas: {program.usedSessions} / {program.totalSessions}
          </p>
        </div>

        {programVM.error && (
          <div data-testid="renew-modal-error" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {programVM.error}
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Número de sesiones nuevas
          </label>
          <input
            data-testid="input-new-sessions"
            type="number"
            min={1}
            value={newSessions}
            onChange={e => setNewSessions(parseInt(e.target.value, 10) || 1)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex space-x-3">
          <button
            data-testid="renew-modal-cancel"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            data-testid="renew-modal-submit"
            onClick={handleRenew}
            disabled={programVM.isLoading || newSessions < 1}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {programVM.isLoading ? 'Renovando...' : 'Renovar'}
          </button>
        </div>
      </div>
    </div>
  );
});

export default RenewProgramModal;
