'use client';

import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useBookingViewModel } from '@/core/providers/ViewModelProvider';
import { useData } from '@/core/providers/DataProvider';
import CalendarStep from './CalendarStep';
import SuccessModal from './SuccessModal';
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ZoneType, ZONE_CONFIG } from '@/core/types';

// Muestra las sesiones pendientes del programa activo en la sección de confirmación
const ProgramSessionInfo = observer(() => {
  const vm = useBookingViewModel();

  if (!vm.hasActiveProgram || vm.pendingSessions === null) {
    return null;
  }

  const pendingAfterBooking = vm.pendingSessions - 1;
  const isLow = pendingAfterBooking >= 0 && pendingAfterBooking < 3;

  return (
    <div className={`rounded-lg p-3 mb-4 border text-sm ${
      isLow ? 'bg-orange-50 border-orange-200' : 'bg-indigo-50 border-indigo-200'
    }`}>
      <div className="flex items-center gap-2">
        <svg className={`w-4 h-4 flex-shrink-0 ${isLow ? 'text-orange-500' : 'text-indigo-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className={isLow ? 'text-orange-800' : 'text-indigo-800'}>
          <span className="font-semibold">Mi Programa:</span>{' '}
          {vm.pendingSessions === 0
            ? 'No tienes sesiones pendientes. Habla con tu entrenador para renovar.'
            : pendingAfterBooking <= 0
            ? 'Esta será tu última sesión del programa.'
            : (
              <>
                Después de esta reserva te quedarán{' '}
                <span className="font-semibold">{pendingAfterBooking} sesión{pendingAfterBooking !== 1 ? 'es' : ''}</span>.
                {isLow && ' ¡Considera renovar pronto!'}
              </>
            )}
        </p>
      </div>
    </div>
  );
});

const BookingView = observer(() => {
  const vm = useBookingViewModel();
  const { bookings, refreshBookings } = useData();

  // Inicializar ViewModel después de la hidratación
  useEffect(() => {
    vm.initialize();
  }, [vm]);

  // Actualizar bookings en el ViewModel cuando cambian
  useEffect(() => {
    vm.setBookings(bookings);
  }, [bookings, vm]);

  const handleDateSelect = (date: Date) => {
    vm.setDate(date);
  };

  const handleTimeSelect = (trainerName: string, time: string) => {
    // Extraer el ID del entrenador basado en el nombre
    const trainer = vm.trainers.find(t => `Entrenador ${t.name}` === trainerName);
    if (trainer) {
      vm.setTrainer(trainer.id);
      vm.setTime(time);
    }
  };

  const handleZoneSelect = (zone: ZoneType) => {
    vm.setZone(zone);
  };

  const handleConfirmBooking = async () => {
    const success = await vm.createBooking();
    if (success) {
      // Actualizar datos de bookings para reflejar el aforo en tiempo real
      await refreshBookings();
    }
    // El modal se abre automáticamente desde el ViewModel si la reserva es exitosa
  };

  const handleBackToCalendar = () => {
    vm.resetForm();
  };

  // No renderizar estado de loading inicial para evitar hydration mismatch
  if (vm.isLoading && vm.trainers.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Error Display */}
      {vm.error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex justify-between items-center">
            <p className="text-red-800">{vm.error}</p>
            <button
              onClick={() => vm.clearError()}
              className="text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Progress indicator */}
      {vm.selectedDate && (
        <div className="text-center mb-6">
          <div className="inline-flex items-center px-4 py-2 bg-green-50 border border-green-200 rounded-full text-sm">
            <svg className="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-800 font-medium">
              {vm.selectedTime ? 'Reserva lista para confirmar' : 'Fecha seleccionada'}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {/* Step 1 - Calendar */}
        <CalendarStep
          selectedDate={vm.selectedDate}
          onDateSelect={handleDateSelect}
        />

        {/* Step 2 - Time Selection */}
        {vm.selectedDate && (
          <TimeSelectionView
            selectedDate={vm.selectedDate}
            trainers={vm.trainers}
            selectedTrainerName={vm.selectedTrainerName}
            selectedTime={vm.selectedTime}
            selectedZone={vm.selectedZone}
            onTimeSelect={handleTimeSelect}
            onZoneSelect={handleZoneSelect}
            onBack={handleBackToCalendar}
            onConfirm={handleConfirmBooking}
            canConfirm={vm.canCreateBooking}
          />
        )}
      </div>

      {/* Success Modal */}
      {vm.showSuccessModal && vm.confirmedBooking && (
        <SuccessModal
          isOpen={vm.showSuccessModal}
          selectedDate={vm.confirmedBooking.date}
          selectedTrainer={vm.confirmedBooking.trainerName}
          selectedTime={vm.confirmedBooking.time}
          selectedZone={vm.confirmedBooking.zone}
          onClose={() => vm.closeSuccessModal()}
        />
      )}
    </div>
  );
});

// Componente separado para la selección de horarios
interface TimeSelectionViewProps {
  selectedDate: Date;
  trainers: Array<{
    id: string;
    name: string;
    availableSlots: string[];
  }>;
  selectedTrainerName: string | null;
  selectedTime: string | null;
  selectedZone: ZoneType | null;
  onTimeSelect: (trainer: string, time: string) => void;
  onZoneSelect: (zone: ZoneType) => void;
  onBack: () => void;
  onConfirm: () => void;
  canConfirm: boolean;
}

const TimeSelectionView: React.FC<TimeSelectionViewProps> = ({
  selectedDate,
  trainers,
  selectedTrainerName,
  selectedTime,
  selectedZone,
  onTimeSelect,
  onZoneSelect,
  onBack,
  onConfirm,
  canConfirm
}) => {
  const { bookings } = useData();

  // Function to calculate capacity for a specific zone, time slot and trainer
  const getZoneCapacity = (trainerId: string, time: string, zone: ZoneType) => {
    // Para GYM: capacidad por entrenador
    if (zone === 'gym') {
      const gymBookings = bookings.filter(booking => 
        booking.trainerId === trainerId && 
        isSameDay(booking.date, selectedDate) && 
        booking.time === time &&
        booking.zone === 'gym' &&
        booking.status === 'confirmed'
      );
      
      return {
        current: gymBookings.length,
        max: ZONE_CONFIG.gym.maxCapacity,
        available: gymBookings.length < ZONE_CONFIG.gym.maxCapacity
      };
    }

    // Para GABINETE: capacidad global
    const gabineteBookings = bookings.filter(booking => 
      isSameDay(booking.date, selectedDate) && 
      booking.time === time &&
      booking.zone === 'gabinete' &&
      booking.status === 'confirmed'
    );
    
    return {
      current: gabineteBookings.length,
      max: ZONE_CONFIG.gabinete.maxCapacity,
      available: gabineteBookings.length < ZONE_CONFIG.gabinete.maxCapacity
    };
  };

  return (
    <div className="border-t border-gray-200 pt-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          ¿Qué horario prefieres?
        </h2>
      </div>

      <div className="space-y-6">
        {trainers.map((trainer) => (
          <div key={trainer.id} className="border border-gray-200 rounded-lg p-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Entrenador {trainer.name}</h3>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {trainer.availableSlots.map((time: string) => {
                const isSelected = selectedTrainerName === `Entrenador ${trainer.name}` && selectedTime === time;
                const gymCapacity = getZoneCapacity(trainer.id, time, 'gym');
                const gabineteCapacity = getZoneCapacity(trainer.id, time, 'gabinete');
                
                return (
                  <button
                    key={time}
                    onClick={() => onTimeSelect(`Entrenador ${trainer.name}`, time)}
                    disabled={!gymCapacity.available && !gabineteCapacity.available}
                    className={`px-3 py-2 text-sm font-medium rounded-md border transition-all duration-200 ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                        : !gymCapacity.available && !gabineteCapacity.available
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                    }`}
                  >
                    <div className="text-center">
                      <div className="font-medium">{time}</div>
                      <div className={`text-xs mt-1 ${isSelected ? 'text-blue-100' : !gymCapacity.available && !gabineteCapacity.available ? 'text-gray-400' : 'text-gray-500'}`}>
                        <div className="flex justify-center gap-1">
                          <span>{gymCapacity.current}/{gymCapacity.max}</span>
                          <span>/</span>
                          <span>{gabineteCapacity.current}/{gabineteCapacity.max}</span>
                        </div>
                        <div className="text-xs opacity-75">
                          GYM / GABINETE
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation section */}
      {selectedTrainerName && selectedTime && (
        <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl shadow-sm">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 className="text-xl font-semibold text-gray-900 mb-2">
              ¡Perfecto! Solo falta confirmar tu reserva
            </h4>
          </div>

          <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
            <div className="text-center mb-3">
              <h5 className="text-lg font-semibold text-gray-900">{selectedTrainerName}</h5>
              <div className="text-gray-700 mt-2">
                <span className="capitalize">{format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}</span>
                <span className="text-2xl font-bold text-blue-600 block mt-1">{selectedTime}</span>
              </div>
            </div>
          </div>

          {/* Zone Selection */}
          <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
            <h6 className="font-semibold text-gray-900 mb-3 text-center">¿Dónde prefieres tu sesión?</h6>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(ZONE_CONFIG).map(([zone, config]) => (
                <button
                  key={zone}
                  onClick={() => onZoneSelect(zone as ZoneType)}
                  className={`px-4 py-3 rounded-lg border font-medium transition-all duration-200 ${
                    selectedZone === zone
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <span className="text-2xl mb-1">{config.icon}</span>
                    <span>{config.name}</span>
                  </div>
                </button>
              ))}
            </div>
            {selectedZone && (
              <div className="mt-3 text-center">
                <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {ZONE_CONFIG[selectedZone].label}
                </span>
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="text-center">
              <h6 className="font-semibold text-blue-900 mb-2">Recuerda traer:</h6>
              <div className="flex justify-center gap-6 text-sm text-blue-800">
                <span>🥤 Agua</span>
                <span>🏃‍♂️ Ropa deportiva</span>
                <span>🧺 Toalla</span>
              </div>
              <p className="text-xs text-blue-700 mt-2 flex items-center justify-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Llega 10 min antes
              </p>
            </div>
          </div>

          {/* Info del programa activo */}
          <ProgramSessionInfo />

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onBack}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Modificar Selección
            </button>
            <button
              onClick={onConfirm}
              disabled={!canConfirm}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors shadow-md ${
                canConfirm
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Confirmar Reserva
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

BookingView.displayName = 'BookingView';

export default BookingView;