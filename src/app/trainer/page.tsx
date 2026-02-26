'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { observer } from 'mobx-react-lite';
import TrainerSchedule from '@/components/trainer/TrainerSchedule';
import TrainerAppointments from '@/components/trainer/TrainerAppointments';
import TrainerBookingWizard from '@/components/trainer/TrainerBookingWizard';
import { useTrainerBookingViewModel } from '@/core/providers/ViewModelProvider';
import { useData } from '@/core/providers/DataProvider';

export type TrainerView = 'schedule' | 'appointments' | 'booking';

function TrainerDashboardContent() {
  const [currentView, setCurrentView] = useState<TrainerView>('schedule');
  const trainerBookingVM = useTrainerBookingViewModel();
  const { trainers } = useData();

  // Inicializar el ViewModel cuando el componente se monte
  useEffect(() => {
    trainerBookingVM.initialize();
  }, [trainerBookingVM]);

  return (
    <main className="min-h-screen bg-white py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Panel del Entrenador - Nivel Gym
            </h1>
            <p className="text-lg text-gray-600">
              Gestiona tu horario y visualiza tus citas
            </p>
          </div>
          <Link 
            href="/" 
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            ← Volver al Inicio
          </Link>
        </div>

        {/* Navigation tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setCurrentView('schedule')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  currentView === 'schedule'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Registra tu disponibilidad
              </button>
              <button
                onClick={() => setCurrentView('appointments')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  currentView === 'appointments'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Mis Citas Reservadas
              </button>
              <button
                onClick={() => setCurrentView('booking')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  currentView === 'booking'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Reservar para Cliente
              </button>
            </nav>
          </div>

          <div className="p-6">
            {currentView === 'schedule' && <TrainerSchedule />}
            {currentView === 'appointments' && <TrainerAppointments />}
            {currentView === 'booking' && (
              <TrainerBookingWizard 
                onCreateBooking={trainerBookingVM.createBookingForWizard}
                trainers={trainers}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function TrainerDashboard() {
  return (
    <TrainerDashboardContent />
  );
}
