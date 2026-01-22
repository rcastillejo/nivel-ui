'use client';

import { useState } from 'react';
import CalendarStep from './CalendarStep';
import TimeGridStep from './TimeGridStep';
import ConfirmationModal from './ConfirmationModal';
import SuccessModal from './SuccessModal';
import { useData } from '@/core/providers/DataProvider';
import { Booking } from '@/core/types';

export type BookingStep = 'calendar' | 'time';

export interface BookingData {
  selectedDate: Date | null;
  selectedTrainer: string | null;
  selectedTime: string | null;
}

export default function BookingWizard() {
  const { createBooking, trainers } = useData();
  const [currentStep, setCurrentStep] = useState<BookingStep>('calendar');
  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<BookingData>({
    selectedDate: null,
    selectedTrainer: null,
    selectedTime: null,
  });
  const [bookingData, setBookingData] = useState<BookingData>({
    selectedDate: null,
    selectedTrainer: null,
    selectedTime: null,
  });

  const handleDateSelect = (date: Date) => {
    setBookingData(prev => ({
      ...prev,
      selectedDate: date,
    }));
    setCurrentStep('time');
  };

  const handleTimeSelect = (trainer: string, time: string) => {
    setBookingData(prev => ({
      ...prev,
      selectedTrainer: trainer,
      selectedTime: time,
    }));
  };

  const handleBackToCalendar = () => {
    setCurrentStep('calendar');
    setBookingData(prev => ({
      ...prev,
      selectedTrainer: null,
      selectedTime: null,
    }));
  };

  const handleShowModal = () => {
    // Skip confirmation modal and go directly to success
    handleConfirmBooking();
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleConfirmBooking = async () => {
    if (!bookingData.selectedDate || !bookingData.selectedTrainer || !bookingData.selectedTime) {
      return;
    }

    setIsCreatingBooking(true);
    try {
      // Encontrar el trainer por nombre
      const trainer = trainers.find(t => `Entrenador ${t.name}` === bookingData.selectedTrainer);
      if (!trainer) {
        throw new Error('Entrenador no encontrado');
      }

      // Crear la reserva usando el nuevo sistema
      const newBooking: Omit<Booking, 'id'> = {
        clientName: 'Cliente Demo', // En una app real, esto vendría de un formulario
        trainerId: trainer.id,
        trainerName: bookingData.selectedTrainer,
        date: bookingData.selectedDate,
        time: bookingData.selectedTime,
        duration: 60,
        status: 'confirmed'
      };

      await createBooking(newBooking);

      // Guardar datos confirmados y mostrar modal de éxito
      setConfirmedBooking({ ...bookingData });
      setShowModal(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Error al crear la reserva. Por favor intenta nuevamente.');
    } finally {
      setIsCreatingBooking(false);
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    // Reset wizard
    setCurrentStep('calendar');
    setBookingData({
      selectedDate: null,
      selectedTrainer: null,
      selectedTime: null,
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Progress indicator - simplified */}
      {bookingData.selectedDate && (
        <div className="text-center mb-6">
          <div className="inline-flex items-center px-4 py-2 bg-green-50 border border-green-200 rounded-full text-sm">
            <svg className="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-800 font-medium">
              {bookingData.selectedTime ? 'Reserva lista para confirmar' : 'Fecha seleccionada'}
            </span>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {isCreatingBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Creando tu reserva...</p>
          </div>
        </div>
      )}

      {/* Unified step content */}
      <div className="space-y-8">
        {/* Step 1 - Calendar (always visible) */}
        <CalendarStep
          selectedDate={bookingData.selectedDate}
          onDateSelect={handleDateSelect}
        />

        {/* Step 2 - Time Grid (visible after date selection) */}
        {bookingData.selectedDate && (
          <TimeGridStep
            selectedDate={bookingData.selectedDate}
            selectedTrainer={bookingData.selectedTrainer}
            selectedTime={bookingData.selectedTime}
            onTimeSelect={handleTimeSelect}
            onBack={handleBackToCalendar}
            onConfirm={handleShowModal}
          />
        )}
      </div>

      {/* Confirmation Modal */}
      {showModal && bookingData.selectedDate && bookingData.selectedTrainer && bookingData.selectedTime && (
        <ConfirmationModal
          isOpen={showModal}
          selectedDate={bookingData.selectedDate}
          selectedTrainer={bookingData.selectedTrainer}
          selectedTime={bookingData.selectedTime}
          onConfirm={handleConfirmBooking}
          onCancel={handleCloseModal}
        />
      )}

      {/* Success Modal */}
      {showSuccessModal && confirmedBooking.selectedDate && confirmedBooking.selectedTrainer && confirmedBooking.selectedTime && (
        <SuccessModal
          isOpen={showSuccessModal}
          selectedDate={confirmedBooking.selectedDate}
          selectedTrainer={confirmedBooking.selectedTrainer}
          selectedTime={confirmedBooking.selectedTime}
          onClose={handleCloseSuccessModal}
        />
      )}
    </div>
  );
}
