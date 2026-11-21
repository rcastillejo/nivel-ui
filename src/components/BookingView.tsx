'use client';

import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useBookingViewModel, useProgramViewModel } from '@/core/providers/ViewModelProvider';
import CalendarStep from './CalendarStep';
import TimeSelectionView from './TimeSelectionView';
import SuccessModal from './SuccessModal';
import { ZoneType } from '@/core/types';


const BookingView = observer(() => {
  const vm = useBookingViewModel();
  const programVM = useProgramViewModel();

  // Inicializar ViewModel después de la hidratación
  useEffect(() => {
    vm.initialize();
    programVM.loadActiveProgram(vm.clientId);
  }, [vm, programVM]);

  const handleDateSelect = (date: Date) => {
    void vm.setDate(date);
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
      await vm.refreshBookings();
      await programVM.loadActiveProgram(vm.clientId);
    }
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
            slotsByTrainer={vm.availableSlotsByTrainer}
            bookings={vm.bookings}
            selectedTrainerName={vm.selectedTrainerName}
            selectedTime={vm.selectedTime}
            selectedZone={vm.selectedZone}
            onTimeSelect={handleTimeSelect}
            onZoneSelect={handleZoneSelect}
            onBack={handleBackToCalendar}
            onConfirm={handleConfirmBooking}
            canConfirm={vm.canCreateBooking && !vm.isSubmitting}
            isSubmitting={vm.isSubmitting}
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

BookingView.displayName = 'BookingView';

export default BookingView;