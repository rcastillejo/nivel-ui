'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { BookingViewModel } from '../view-models/BookingViewModel';
import { TrainerViewModel } from '../view-models/TrainerViewModel';
import { BookingModel } from '../models/BookingModel';
import { useData } from './DataProvider';

interface ViewModelContextType {
  bookingVM: BookingViewModel;
  trainerViewModel: TrainerViewModel;
}

const ViewModelContext = createContext<ViewModelContextType | null>(null);

interface ViewModelProviderProps {
  children: ReactNode;
}

export function ViewModelProvider({ children }: ViewModelProviderProps) {
  const { service } = useData();

  const viewModels = useMemo(() => {
    const bookingModel = new BookingModel(service);
    const bookingVM = new BookingViewModel(bookingModel);
    const trainerViewModel = new TrainerViewModel(bookingModel);

    return {
      bookingVM,
      trainerViewModel
    };
  }, [service]);

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

// Hook específico para booking
export function useBookingViewModel() {
  const { bookingVM } = useViewModels();
  return bookingVM;
}

// Hook específico para trainer
export function useTrainerViewModel() {
  const { trainerViewModel } = useViewModels();
  return trainerViewModel;
}
