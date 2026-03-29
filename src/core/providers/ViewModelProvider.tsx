'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { BookingViewModel } from '../view-models/BookingViewModel';
import { BookingModel } from '../models/BookingModel';
import { ProgramViewModel } from '../view-models/ProgramViewModel';
import { ProgramModel } from '../models/ProgramModel';
import { useData } from './DataProvider';

interface ViewModelContextType {
  bookingVM: BookingViewModel;
  programVM: ProgramViewModel;
}

const ViewModelContext = createContext<ViewModelContextType | null>(null);

interface ViewModelProviderProps {
  children: ReactNode;
}

export function ViewModelProvider({ children }: ViewModelProviderProps) {
  const { service } = useData();

  const viewModels = useMemo(() => {
    const bookingModel = new BookingModel(service);
    const programModel = new ProgramModel(service);
    const bookingVM = new BookingViewModel(bookingModel, programModel);

    const programVM = new ProgramViewModel(programModel);

    return {
      bookingVM,
      programVM
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

// Hook específico para programa
export function useProgramViewModel() {
  const { programVM } = useViewModels();
  return programVM;
}
