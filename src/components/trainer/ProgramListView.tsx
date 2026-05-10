'use client';

import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useProgramViewModel } from '@/core/providers/ViewModelProvider';
import { useData } from '@/core/providers/DataProvider';
import { Program } from '@/core/types';
import RenewProgramModal from './RenewProgramModal';

const TRAINER_ID = 'trainer1';

function SessionsBar({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{used} usadas</span>
        <span>{total - used} restantes</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            pct >= 90 ? 'bg-red-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-xs text-gray-400 mt-1 text-right">{total} total</div>
    </div>
  );
}

function StatusBadge({ status }: { status: Program['status'] }) {
  const map: Record<Program['status'], { label: string; cls: string }> = {
    active: { label: 'Activo', cls: 'bg-green-100 text-green-800 border-green-200' },
    inactive: { label: 'Inactivo', cls: 'bg-gray-100 text-gray-700 border-gray-200' },
    expired: { label: 'Expirado', cls: 'bg-red-100 text-red-700 border-red-200' }
  };
  const { label, cls } = map[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}

const ProgramListView = observer(function ProgramListView() {
  const programVM = useProgramViewModel();
  const { clients } = useData();
  const [renewTarget, setRenewTarget] = useState<Program | null>(null);

  useEffect(() => {
    programVM.loadPrograms(TRAINER_ID);
  }, [programVM]);

  const getClientNames = (clientIds: string[]) =>
    clientIds
      .map(id => clients.find(c => c.id === id)?.name ?? id)
      .join(', ');

  const handleRenewSuccess = async () => {
    setRenewTarget(null);
    await programVM.loadPrograms(TRAINER_ID);
  };

  if (programVM.isLoading) {
    return (
      <div data-testid="program-list-loading" className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando programas...</div>
      </div>
    );
  }

  const activePrograms = programVM.programs.filter(p => p.status === 'active');
  const otherPrograms = programVM.programs.filter(p => p.status !== 'active');

  return (
    <div data-testid="program-list-view" className="space-y-6">
      {programVM.error && (
        <div data-testid="program-list-error" className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {programVM.error}
        </div>
      )}

      {/* Active programs */}
      <div data-testid="active-programs-section">
        <h4 data-testid="active-programs-count" className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Programas Activos ({activePrograms.length})
        </h4>
        {activePrograms.length === 0 ? (
          <div data-testid="active-programs-empty" className="text-center text-gray-400 py-8 border border-dashed border-gray-200 rounded-lg">
            No hay programas activos. Crea uno desde el formulario.
          </div>
        ) : (
          <div data-testid="active-programs-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activePrograms.map(program => (
              <div
                key={program.id}
                data-testid={`program-card-${program.id}`}
                className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <p data-testid={`program-card-name-${program.id}`} className="font-semibold text-gray-900 truncate">{program.name}</p>
                    <p data-testid={`program-card-clients-${program.id}`} className="text-xs text-gray-500 mt-0.5 truncate">
                      {getClientNames(program.clientIds)}
                    </p>
                  </div>
                  <span data-testid={`status-badge-${program.id}`}>
                    <StatusBadge status={program.status} />
                  </span>
                </div>

                <div data-testid={`sessions-bar-${program.id}`} className="my-3">
                  <SessionsBar used={program.usedSessions} total={program.totalSessions} />
                </div>

                <div className="text-xs text-gray-500 mb-3 space-y-1">
                  <div className="flex justify-between">
                    <span>Inicio:</span>
                    <span>{format(program.startDate, "d MMM yyyy", { locale: es })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fin:</span>
                    <span>{format(program.endDate, "d MMM yyyy", { locale: es })}</span>
                  </div>
                </div>

                <button
                  data-testid={`renew-program-btn-${program.id}`}
                  onClick={() => setRenewTarget(program)}
                  className="w-full px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Renovar Programa
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historical programs */}
      {otherPrograms.length > 0 && (
        <div data-testid="historical-programs-section">
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Historial ({otherPrograms.length})
          </h4>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table data-testid="historical-programs-table" className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Programa</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Cliente(s)</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Sesiones</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Fechas</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {otherPrograms.map(program => (
                  <tr data-testid={`historical-program-row-${program.id}`} key={program.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{program.name}</td>
                    <td className="px-4 py-3 text-gray-600">{getClientNames(program.clientIds)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {program.usedSessions}/{program.totalSessions}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={program.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {format(program.startDate, "d MMM yy", { locale: es })} —{' '}
                      {format(program.endDate, "d MMM yy", { locale: es })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {renewTarget && (
        <RenewProgramModal
          program={renewTarget}
          onClose={() => setRenewTarget(null)}
          onSuccess={handleRenewSuccess}
        />
      )}
    </div>
  );
});

export default ProgramListView;
