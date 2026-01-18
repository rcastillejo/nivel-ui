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
    setShowModal(true);
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
      {/* Progress indicator */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center space-x-4">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
            currentStep === 'calendar' ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'
          }`}>
            1
          </div>
          <div className={`w-12 h-0.5 ${
            currentStep === 'time' ? 'bg-blue-600' : 'bg-gray-300'
          }`}></div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
            currentStep === 'time' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
          }`}>
            2
          </div>
        </div>
      </div>

      {/* Step content */}
      {currentStep === 'calendar' && (
        <CalendarStep
          selectedDate={bookingData.selectedDate}
          onDateSelect={handleDateSelect}
        />
      )}

      {currentStep === 'time' && (
        <TimeGridStep
          selectedDate={bookingData.selectedDate!}
          selectedTrainer={bookingData.selectedTrainer}
          selectedTime={bookingData.selectedTime}
          onTimeSelect={handleTimeSelect}
          onBack={handleBackToCalendar}
          onConfirm={handleShowModal}
        />
      )}

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
