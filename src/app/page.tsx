'use client';

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
            Reserva tu sesión de entrenamiento
          </p>
        </div>
        <BookingWizard />
      </div>
    </main>
  );
}
