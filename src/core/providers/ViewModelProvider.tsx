'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { BookingViewModel } from '../view-models/BookingViewModel';
import { TrainerViewModel } from '../view-models/TrainerViewModel';
import { ProgramViewModel } from '../view-models/ProgramViewModel';
import { BookingModel } from '../models/BookingModel';
import { ProgramModel } from '../models/ProgramModel';
import { ProgramMediator } from '../mediators/ProgramMediator';
import { useData } from './DataProvider';

interface ViewModelContextType {
  bookingVM: BookingViewModel;
  trainerViewModel: TrainerViewModel;
  programVM: ProgramViewModel;
  programMediator: ProgramMediator;
}

const ViewModelContext = createContext<ViewModelContextType | null>(null);

interface ViewModelProviderProps {
  children: ReactNode;
}

export function ViewModelProvider({ children }: ViewModelProviderProps) {
  const { service } = useData();

  const viewModels = useMemo(() => {
    const programModel = new ProgramModel(service);
    const bookingModel = new BookingModel(service); // Sin dependencia directa de ProgramModel
    
    // ViewModels sin dependencias entre sí
    const programVM = new ProgramViewModel(service);
    const bookingVM = new BookingViewModel(bookingModel);
    const trainerViewModel = new TrainerViewModel(bookingModel);
    
    // Mediator que coordina la comunicación entre ViewModels
    const programMediator = new ProgramMediator(programVM, bookingVM, trainerViewModel);

    return {
      bookingVM,
      trainerViewModel,
      programVM,
      programMediator
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

// Hook específico para program
export function useProgramViewModel() {
  const { programVM } = useViewModels();
  return programVM;
}

// Hook específico para el mediator
export function useProgramMediator() {
  const { programMediator } = useViewModels();
  return programMediator;
}
