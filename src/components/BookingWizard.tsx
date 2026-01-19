'use client';

import { useState } from 'react';
import CalendarStep from './CalendarStep';
import TimeGridStep from './TimeGridStep';
import ConfirmationModal from './ConfirmationModal';
import SuccessModal from './SuccessModal';

export type BookingStep = 'calendar' | 'time';

export interface BookingData {
  selectedDate: Date | null;
  selectedTrainer: string | null;
  selectedTime: string | null;
}

export default function BookingWizard() {
  const [currentStep, setCurrentStep] = useState<BookingStep>('calendar');
  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
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
    setConfirmedBooking({ ...bookingData });
    setShowSuccessModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleConfirmBooking = () => {
    // Save confirmed booking data for success modal
    setConfirmedBooking({ ...bookingData });
    setShowModal(false);
    setShowSuccessModal(true);
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
