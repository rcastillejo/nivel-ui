'use client';

import Link from 'next/link';
import ClientAppointmentsView from '@/components/client/ClientAppointmentsView';

export default function ClientAppointmentsPage() {
  return (
    <main className="min-h-screen bg-white py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mis citas</h1>
          <Link
            href="/client"
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            ← Volver a reservar
          </Link>
        </div>

        <ClientAppointmentsView />
      </div>
    </main>
  );
}
