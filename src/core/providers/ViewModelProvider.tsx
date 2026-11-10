'use client';

import React, { createContext, useContext, useEffect, useMemo, ReactNode } from 'react';
import { observer } from 'mobx-react-lite';
import { BookingViewModel } from '../view-models/BookingViewModel';
import { BookingModel } from '../models/BookingModel';
import { ProgramViewModel } from '../view-models/ProgramViewModel';
import { ProgramModel } from '../models/ProgramModel';
import { TrainerViewModel } from '../view-models/TrainerViewModel';
import { TrainerModel } from '../models/TrainerModel';
import { ClientViewModel } from '../view-models/ClientViewModel';
import { ClientModel } from '../models/ClientModel';
import { ClientAppointmentsViewModel } from '../view-models/ClientAppointmentsViewModel';
import { BookingCommandsModel } from '../models/BookingCommandsModel';
import { IBookingCommands } from '../repositories';
import { EdgeFunctionBookingCommands } from '../services/EdgeFunctionBookingCommands';
import { LocalBookingCommands } from '../services/LocalBookingCommands';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { useDataService, useIsLocalStorageFallback } from './DataProvider';
import { useAuthViewModel } from './AuthProvider';

interface ViewModelContextType {
  bookingVM: BookingViewModel;
  programVM: ProgramViewModel;
  trainerVM: TrainerViewModel;
  clientVM: ClientViewModel;
  clientAppointmentsVM: ClientAppointmentsViewModel;
}

const ViewModelContext = createContext<ViewModelContextType | null>(null);

interface ViewModelProviderProps {
  children: ReactNode;
}

export const ViewModelProvider = observer(function ViewModelProvider({ children }: ViewModelProviderProps) {
  const service = useDataService();
  const isLocalStorageFallback = useIsLocalStorageFallback();
  const authVM = useAuthViewModel();

  const viewModels = useMemo(() => {
    const bookingModel = new BookingModel(service);
    const programModel = new ProgramModel(service);
    const trainerModel = new TrainerModel(service);
    const clientModel = new ClientModel(service);

    // Con Supabase las reservas se ejecutan en la Edge Function (reglas garantizadas en
    // el servidor); sin Supabase (modo local) se ejecutan los mismos casos de uso en el navegador.
    const supabase = getSupabaseBrowserClient();
    const commands: IBookingCommands =
      supabase && !isLocalStorageFallback
        ? new EdgeFunctionBookingCommands(supabase)
        : new LocalBookingCommands(
            new BookingCommandsModel(bookingModel, programModel),
            () => authVM.currentUser?.id ?? ''
          );

    const bookingVM = new BookingViewModel(bookingModel, commands);
    const programVM = new ProgramViewModel(programModel);
    const trainerVM = new TrainerViewModel(bookingModel, trainerModel);
    const clientVM = new ClientViewModel(clientModel);
    const clientAppointmentsVM = new ClientAppointmentsViewModel(bookingModel);

    return { bookingVM, programVM, trainerVM, clientVM, clientAppointmentsVM };
  }, [service, isLocalStorageFallback, authVM]);

  useEffect(() => {
    viewModels.clientVM.loadClients();
  }, [viewModels]);

  useEffect(() => {
    viewModels.bookingVM.setClientId(authVM.currentUser?.id ?? '');
  }, [authVM.currentUser, viewModels.bookingVM]);

  return (
    <ViewModelContext.Provider value={viewModels}>
      {children}
    </ViewModelContext.Provider>
  );
});

export function useViewModels(): ViewModelContextType {
  const context = useContext(ViewModelContext);
  if (!context) {
    throw new Error('useViewModels debe usarse dentro de ViewModelProvider');
  }
  return context;
}

export function useBookingViewModel() {
  const { bookingVM } = useViewModels();
  return bookingVM;
}

export function useProgramViewModel() {
  const { programVM } = useViewModels();
  return programVM;
}

export function useTrainerViewModel() {
  const { trainerVM } = useViewModels();
  return trainerVM;
}

export function useClientViewModel() {
  const { clientVM } = useViewModels();
  return clientVM;
}

export function useClientAppointmentsViewModel(): ClientAppointmentsViewModel {
  const { clientAppointmentsVM } = useViewModels();
  return clientAppointmentsVM;
}
