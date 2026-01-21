'use client';

import { useState } from 'react';
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';

interface Appointment {
  id: string;
  clientName: string;
  date: Date;
  time: string;
  duration: number; // in minutes
  status: 'confirmed' | 'pending' | 'cancelled';
}

// Mock appointments data
const mockAppointments: Appointment[] = [
  {
    id: '1',
    clientName: 'María González',
    date: new Date(2026, 0, 20), // January 20, 2026
    time: '09:00',
    duration: 60,
    status: 'confirmed'
  },
  {
    id: '2',
    clientName: 'Carlos Ruiz',
    date: new Date(2026, 0, 20), // January 20, 2026
    time: '16:00',
    duration: 60,
    status: 'confirmed'
  },
  {
    id: '3',
    clientName: 'Ana Martín',
    date: new Date(2026, 0, 22), // January 22, 2026
    time: '10:00',
    duration: 60,
    status: 'cancelled'
  },
  {
    id: '4',
    clientName: 'Luis Torres',
    date: new Date(2026, 0, 24), // January 24, 2026
    time: '18:00',
    duration: 60,
    status: 'confirmed'
  },
  {
    id: '5',
    clientName: 'Patricia Vega',
    date: new Date(2026, 0, 25), // January 25, 2026
    time: '11:00',
    duration: 60,
    status: 'cancelled'
  }
];

export default function TrainerAppointments() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [appointments] = useState<Appointment[]>(mockAppointments);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Start on Monday
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter(apt => isSameDay(apt.date, date));
  };

  const getTotalAppointments = () => {
    return appointments.filter(apt => 
      apt.date >= weekStart && apt.date < addDays(weekStart, 7)
    ).length;
  };

  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: Appointment['status']) => {
    switch (status) {
      case 'confirmed':
        return '✓';
      case 'pending':
        return '⏳';
      case 'cancelled':
        return '✗';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with navigation */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Citas de la Semana
          </h3>
          <p className="text-sm text-gray-600">
            {format(weekStart, "d 'de' MMMM", { locale: es })} - {format(addDays(weekStart, 6), "d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            <span className="font-medium">{getTotalAppointments()}</span> citas esta semana
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
              className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
              title="Semana anterior"
            >
              ←
            </button>
            <button
              onClick={() => setCurrentWeek(new Date())}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Hoy
            </button>
            <button
              onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
              className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
              title="Semana siguiente"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Days header */}
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {weekDays.map((day, index) => (
            <div key={index} className="p-4 text-center">
              <div className="text-sm font-medium text-gray-700">
                {format(day, 'EEEE', { locale: es })}
              </div>
              <div className={`text-lg font-semibold mt-1 ${
                isSameDay(day, new Date()) ? 'text-blue-600' : 'text-gray-900'
              }`}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Appointments grid */}
        <div className="grid grid-cols-7 min-h-96">
          {weekDays.map((day, dayIndex) => {
            const dayAppointments = getAppointmentsForDay(day);
            
            return (
              <div key={dayIndex} className={`p-2 border-r border-gray-100 ${
                isSameDay(day, new Date()) ? 'bg-blue-50' : ''
              }`}>
                <div className="space-y-2">
                  {dayAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className={`p-2 rounded-md border text-xs ${getStatusColor(appointment.status)}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{appointment.time}</span>
                        <span className="text-xs">{getStatusIcon(appointment.status)}</span>
                      </div>
                      <div className="font-semibold">{appointment.clientName}</div>
                      <div className="text-xs opacity-75">{appointment.duration} min</div>
                    </div>
                  ))}
                  {dayAppointments.length === 0 && (
                    <div className="text-gray-400 text-center py-8 text-xs">
                      Sin citas
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
          <span>Confirmada</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
          <span>Cancelada</span>
        </div>
      </div>

      {/* Detailed appointments list */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Detalle de Citas</h4>
        {appointments
          .filter(apt => apt.date >= weekStart && apt.date < addDays(weekStart, 7))
          .sort((a, b) => a.date.getTime() - b.date.getTime() || a.time.localeCompare(b.time))
          .map((appointment) => (
            <div
              key={appointment.id}
              className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0"
            >
              <div>
                <div className="font-medium text-gray-900">{appointment.clientName}</div>
                <div className="text-sm text-gray-600">
                  {format(appointment.date, "EEEE, d 'de' MMMM", { locale: es })} a las {appointment.time}
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                  {appointment.status === 'confirmed' ? 'Confirmada' : 
                   appointment.status === 'pending' ? 'Pendiente' : 'Cancelada'}
                </span>
                <div className="text-xs text-gray-500 mt-1">{appointment.duration} minutos</div>
              </div>
            </div>
          ))
        }
        {appointments.filter(apt => apt.date >= weekStart && apt.date < addDays(weekStart, 7)).length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No tienes citas programadas para esta semana
          </div>
        )}
      </div>
    </div>
  );
}
