'use client';

import BookingView from '@/components/BookingView';
import ClientProgramView from '@/components/ClientProgramView';
import { useAuthViewModel } from '@/core/providers/AuthProvider';

export default function ClientPage() {
  const authVM = useAuthViewModel();

  return (
    <main className="min-h-screen bg-white py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Nivel Gym - Reservas
            </h1>
            <p className="text-lg text-gray-600">
              Reserva tu sesión de entrenamiento
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {authVM.currentUser && (
              <span className="text-sm text-gray-500">{authVM.currentUser.email}</span>
            )}
            <button
              onClick={() => authVM.signOut()}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        <ClientProgramView />
        <BookingView />
      </div>
    </main>
  );
}
