'use client';

import Link from 'next/link';
import BookingWizard from '@/components/BookingWizard';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Nivel Gym
          </h1>
          <p className="text-lg text-gray-600">
            Sistema de Reservas
          </p>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Cliente</h3>
            <p className="text-gray-600 mb-4">Reserva tu sesión de entrenamiento</p>
            <div className="space-y-2">
              <p className="text-sm text-gray-500">• Selecciona fecha y hora</p>
              <p className="text-sm text-gray-500">• Elige tu entrenador</p>
              <p className="text-sm text-gray-500">• Confirma tu reserva</p>
            </div>
          </div>

          <Link href="/trainer" className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow block">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Entrenador</h3>
            <p className="text-gray-600 mb-4">Gestiona tu horario y citas</p>
            <div className="space-y-2">
              <p className="text-sm text-gray-500">• Registra tu disponibilidad</p>
              <p className="text-sm text-gray-500">• Visualiza tus citas</p>
              <p className="text-sm text-gray-500">• Organiza tu semana</p>
            </div>
          </Link>
        </div>

        <BookingWizard />
      </div>
    </main>
  );
}
