'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Nivel Gym
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Sistema de Reservas
          </p>
          <div className="w-24 h-1 bg-blue-600 mx-auto"></div>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          <Link href="/client" className="bg-white rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition-all duration-300 hover:scale-105 block">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">Cliente</h3>
            <p className="text-gray-600 mb-6">Reserva tu sesión de entrenamiento</p>
            <div className="space-y-3">
              <p className="text-sm text-gray-500">• Selecciona fecha y hora</p>
              <p className="text-sm text-gray-500">• Elige tu entrenador</p>
              <p className="text-sm text-gray-500">• Confirma tu reserva</p>
            </div>
            <div className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
              Hacer Reserva
            </div>
          </Link>

          <Link href="/trainer" className="bg-white rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition-all duration-300 hover:scale-105 block">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">Entrenador</h3>
            <p className="text-gray-600 mb-6">Gestiona tu horario y citas</p>
            <div className="space-y-3">
              <p className="text-sm text-gray-500">• Registra tu disponibilidad</p>
              <p className="text-sm text-gray-500">• Visualiza tus citas</p>
              <p className="text-sm text-gray-500">• Organiza tu semana</p>
            </div>
            <div className="mt-6 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
              Panel de Control
            </div>
          </Link>
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-500 text-sm">
            Selecciona tu perfil para acceder a las funciones correspondientes
          </p>
        </div>
      </div>
    </main>
  );
}
