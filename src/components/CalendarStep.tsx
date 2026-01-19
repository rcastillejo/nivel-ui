'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface CalendarStepProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
}

export default function CalendarStep({ selectedDate, onDateSelect }: CalendarStepProps) {
  const [tempDate, setTempDate] = useState<Date | null>(selectedDate);

  const handleDateChange = (date: Date | null) => {
    setTempDate(date);
    if (date) {
      onDateSelect(date);
    }
  };

  const today = new Date();
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 2); // Minimum 2 days from today
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 2); // Allow booking up to 2 months in advance

  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        ¿Cuándo quieres entrenar?
      </h2>
      <p className="text-sm text-orange-600 mb-6">
        Reservas con mínimo 2 días de anticipación
      </p>

      <div className="flex justify-center mb-8">
        <div className="calendar-container">
          <DatePicker
            selected={tempDate}
            onChange={handleDateChange}
            minDate={minDate}
            maxDate={maxDate}
            inline
            showMonthDropdown
            showYearDropdown
            dropdownMode="select"
            calendarClassName="custom-calendar"
            dayClassName={(date) => {
              const isSelected = tempDate && 
                date.toDateString() === tempDate.toDateString();
              const isToday = date.toDateString() === today.toDateString();
              
              if (isSelected) {
                return 'selected-day';
              }
              if (isToday) {
                return 'today-day';
              }
              return 'normal-day';
            }}
          />
        </div>
      </div>

      {tempDate && (
        <div className="text-center mt-4">
          <div className="inline-flex items-center px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
            <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-800 font-medium capitalize">
              {format(tempDate, "EEEE, d 'de' MMMM", { locale: es })}
            </span>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-calendar {
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          font-family: inherit;
        }
        
        .custom-calendar .react-datepicker__header {
          background-color: #f8fafc;
          border-bottom: 1px solid #e5e7eb;
          border-radius: 0.75rem 0.75rem 0 0;
        }
        
        .custom-calendar .react-datepicker__current-month {
          font-weight: 600;
          font-size: 1.1rem;
          color: #374151;
        }
        
        .custom-calendar .react-datepicker__day-names {
          margin-bottom: 0.5rem;
        }
        
        .custom-calendar .react-datepicker__day-name {
          color: #6b7280;
          font-weight: 500;
          width: 2.5rem;
          height: 2.5rem;
          line-height: 2.5rem;
        }
        
        .custom-calendar .react-datepicker__day {
          width: 2.5rem;
          height: 2.5rem;
          line-height: 2.5rem;
          border-radius: 0.375rem;
          transition: all 0.2s;
        }
        
        .normal-day {
          color: #374151;
        }
        
        .normal-day:hover {
          background-color: #eff6ff;
          color: #2563eb;
        }
        
        .today-day {
          background-color: #fef3c7;
          color: #92400e;
          font-weight: 600;
        }
        
        .selected-day {
          background-color: #2563eb !important;
          color: white !important;
          font-weight: 600;
        }
        
        .react-datepicker__day--disabled {
          color: #d1d5db !important;
          cursor: not-allowed !important;
        }
        
        .react-datepicker__day--outside-month {
          color: #d1d5db;
        }
      `}</style>
    </div>
  );
}
