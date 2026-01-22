'use client';

import Link from 'next/link';
import BookingView from '@/components/BookingView';

export default function ClientPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Nivel Gym - Reservas
            </h1>
            <p className="text-lg text-gray-600">
              Reserva tu sesión de entrenamiento con patrón MVVM
            </p>
          </div>
          <Link 
            href="/" 
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            ← Volver al Inicio
          </Link>
        </div>

        <BookingView />
      </div>
    </main>
  );
}
