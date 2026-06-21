'use client';

import React, { createContext, useContext, useEffect, useMemo, ReactNode } from 'react';
import { BookingViewModel } from '../view-models/BookingViewModel';
import { BookingModel } from '../models/BookingModel';
import { ProgramViewModel } from '../view-models/ProgramViewModel';
import { ProgramModel } from '../models/ProgramModel';
import { TrainerViewModel } from '../view-models/TrainerViewModel';
import { TrainerModel } from '../models/TrainerModel';
import { ClientViewModel } from '../view-models/ClientViewModel';
import { ClientModel } from '../models/ClientModel';
import { useDataService } from './DataProvider';
import { useAuthViewModel } from './AuthProvider';

interface ViewModelContextType {
  bookingVM: BookingViewModel;
  programVM: ProgramViewModel;
  trainerVM: TrainerViewModel;
  clientVM: ClientViewModel;
}

const ViewModelContext = createContext<ViewModelContextType | null>(null);

interface ViewModelProviderProps {
  children: ReactNode;
}

export function ViewModelProvider({ children }: ViewModelProviderProps) {
  const service = useDataService();
  const authVM = useAuthViewModel();

  const viewModels = useMemo(() => {
    const bookingModel = new BookingModel(service);
    const programModel = new ProgramModel(service);
    const trainerModel = new TrainerModel(service);
    const clientModel = new ClientModel(service);

    const bookingVM = new BookingViewModel(bookingModel, programModel);
    const programVM = new ProgramViewModel(programModel);
    const trainerVM = new TrainerViewModel(bookingModel, trainerModel);
    const clientVM = new ClientViewModel(clientModel);

    return { bookingVM, programVM, trainerVM, clientVM };
  }, [service]);

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
}

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
