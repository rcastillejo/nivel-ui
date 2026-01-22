'use client';

import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useBookingViewModel } from '@/core/providers/ViewModelProvider';
import CalendarStep from './CalendarStep';
import SuccessModal from './SuccessModal';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const BookingView = observer(() => {
  const vm = useBookingViewModel();

  // Inicializar ViewModel después de la hidratación
  useEffect(() => {
    vm.initialize();
  }, [vm]);

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

  const handleConfirmBooking = async () => {
    await vm.createBooking();
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
            onTimeSelect={handleTimeSelect}
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
  onTimeSelect: (trainer: string, time: string) => void;
  onBack: () => void;
  onConfirm: () => void;
  canConfirm: boolean;
}

const TimeSelectionView: React.FC<TimeSelectionViewProps> = ({
  selectedDate,
  trainers,
  selectedTrainerName,
  selectedTime,
  onTimeSelect,
  onBack,
  onConfirm,
  canConfirm
}) => {
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
            
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {trainer.availableSlots.map((time: string) => {
                const isSelected = selectedTrainerName === `Entrenador ${trainer.name}` && selectedTime === time;
                
                return (
                  <button
                    key={time}
                    onClick={() => onTimeSelect(`Entrenador ${trainer.name}`, time)}
                    className={`px-3 py-2 text-sm font-medium rounded-md border transition-all duration-200 ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                    }`}
                  >
                    {time}
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
