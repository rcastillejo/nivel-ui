'use client';

import { useState } from 'react';
import CalendarStep from '../CalendarStep';
import TimeGridStep from '../TimeGridStep';
import ConfirmationModal from '../ConfirmationModal';
import SuccessModal from '../SuccessModal';
import { Booking, ZoneType } from '@/core/types';

export type BookingStep = 'calendar' | 'time';

export interface BookingData {
  selectedDate: Date | null;
  selectedTrainer: string | null;
  selectedTime: string | null;
  selectedZone: ZoneType | null;
  clientName: string;
}

interface TrainerBookingWizardProps {
  onCreateBooking: (bookingData: Omit<Booking, 'id'>) => Promise<void>;
  trainers: Array<{ id: string; name: string }>;
}

export default function TrainerBookingWizard({ onCreateBooking, trainers }: TrainerBookingWizardProps) {
  const [currentStep, setCurrentStep] = useState<BookingStep>('calendar');
  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<BookingData>({
    selectedDate: null,
    selectedTrainer: null,
    selectedTime: null,
    selectedZone: null,
    clientName: '',
  });
  const [bookingData, setBookingData] = useState<BookingData>({
    selectedDate: null,
    selectedTrainer: null,
    selectedTime: null,
    selectedZone: null,
    clientName: '',
  });

  const handleClientNameChange = (name: string) => {
    setBookingData(prev => ({
      ...prev,
      clientName: name,
    }));
  };

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

  const handleZoneSelect = (zone: ZoneType) => {
    setBookingData(prev => ({
      ...prev,
      selectedZone: zone,
    }));
  };

  const handleBackToCalendar = () => {
    setCurrentStep('calendar');
    setBookingData(prev => ({
      ...prev,
      selectedTrainer: null,
      selectedTime: null,
      selectedZone: null,
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
    if (!bookingData.selectedDate || !bookingData.selectedTrainer || !bookingData.selectedTime || !bookingData.selectedZone || !bookingData.clientName.trim()) {
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
        clientName: bookingData.clientName.trim(),
        trainerId: trainer.id,
        trainerName: bookingData.selectedTrainer,
        date: bookingData.selectedDate,
        time: bookingData.selectedTime,
        duration: 60,
        zone: bookingData.selectedZone,
        status: 'confirmed'
      };

      await onCreateBooking(newBooking);

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
      selectedZone: null,
      clientName: '',
    });
  };

  const canConfirm = bookingData.selectedDate && 
                    bookingData.selectedTrainer && 
                    bookingData.selectedTime && 
                    bookingData.selectedZone && 
                    bookingData.clientName.trim();

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Header with client name input */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Reservar Cita para Cliente</h2>
        
        {/* Client name input */}
        <div className="mb-4">
          <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-2">
            Nombre del Cliente
          </label>
          <input
            type="text"
            id="clientName"
            value={bookingData.clientName}
            onChange={(e) => handleClientNameChange(e.target.value)}
            placeholder="Ingrese el nombre del cliente"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Progress indicator */}
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
            <p className="text-gray-600">Creando reserva para {bookingData.clientName}...</p>
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
            selectedZone={bookingData.selectedZone}
            onTimeSelect={handleTimeSelect}
            onZoneSelect={handleZoneSelect}
            onBack={handleBackToCalendar}
            onConfirm={canConfirm ? handleShowModal : () => {}}
          />
        )}
      </div>

      {/* Confirmation Modal */}
      {showModal && bookingData.selectedDate && bookingData.selectedTrainer && bookingData.selectedTime && bookingData.selectedZone && (
        <ConfirmationModal
          isOpen={showModal}
          selectedDate={bookingData.selectedDate}
          selectedTrainer={bookingData.selectedTrainer}
          selectedTime={bookingData.selectedTime}
          selectedZone={bookingData.selectedZone}
          onConfirm={handleConfirmBooking}
          onCancel={handleCloseModal}
        />
      )}

      {/* Success Modal */}
      {showSuccessModal && confirmedBooking.selectedDate && confirmedBooking.selectedTrainer && confirmedBooking.selectedTime && confirmedBooking.selectedZone && (
        <SuccessModal
          isOpen={showSuccessModal}
          selectedDate={confirmedBooking.selectedDate}
          selectedTrainer={confirmedBooking.selectedTrainer}
          selectedTime={confirmedBooking.selectedTime}
          selectedZone={confirmedBooking.selectedZone}
          onClose={handleCloseSuccessModal}
        />
      )}
    </div>
  );
}