'use client';

import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useClientAppointmentsViewModel } from '@/core/providers/ViewModelProvider';
import { useAuthViewModel } from '@/core/providers/AuthProvider';
import { Booking, ZONE_CONFIG } from '@/core/types';

const STATUS_LABELS: Record<Booking['status'], string> = {
  confirmed: 'Confirmada',
  pending: 'Pendiente',
  cancelled: 'Cancelada',
};

const STATUS_STYLES: Record<Booking['status'], string> = {
  confirmed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
};

function AppointmentItem({ booking }: { booking: Booking }) {
  const zone = ZONE_CONFIG[booking.zone];

  return (
    <li
      data-testid={`appointment-item-${booking.id}`}
      className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-4"
    >
      <div>
        <p className="font-semibold text-gray-900 first-letter:uppercase">
          {format(booking.date, "EEEE, d 'de' MMMM", { locale: es })} · {booking.time}
        </p>
        <p className="text-sm text-gray-600">
          {booking.trainerName} · {zone.icon} {zone.name}
        </p>
      </div>
      <span
        data-testid={`appointment-status-${booking.id}`}
        className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[booking.status]}`}
      >
        {STATUS_LABELS[booking.status]}
      </span>
    </li>
  );
}

const ClientAppointmentsView = observer(() => {
  const vm = useClientAppointmentsViewModel();
  const authVM = useAuthViewModel();

  useEffect(() => {
    const userId = authVM.currentUser?.id;
    if (userId) {
      vm.load(userId);
    }
  }, [vm, authVM.currentUser]);

  if (vm.isLoading) {
    return (
      <p data-testid="appointments-loading" className="text-gray-600">
        Cargando tus citas...
      </p>
    );
  }

  if (vm.error) {
    return (
      <p data-testid="appointments-error" role="alert" className="text-red-700">
        {vm.error}
      </p>
    );
  }

  if (vm.isEmpty) {
    return (
      <p data-testid="appointments-empty" className="text-gray-600">
        Aún no tienes citas reservadas.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {vm.hasUpcoming && (
        <section data-testid="appointments-upcoming">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Próximas citas</h2>
          <ul className="space-y-3">
            {vm.upcoming.map((booking) => (
              <AppointmentItem key={booking.id} booking={booking} />
            ))}
          </ul>
        </section>
      )}
      {vm.hasPast && (
        <section data-testid="appointments-history">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Historial</h2>
          <ul className="space-y-3">
            {vm.past.map((booking) => (
              <AppointmentItem key={booking.id} booking={booking} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
});

export default ClientAppointmentsView;
