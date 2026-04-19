'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { BookingViewModel } from '../view-models/BookingViewModel';
import { BookingModel } from '../models/BookingModel';
import { ProgramViewModel } from '../view-models/ProgramViewModel';
import { ProgramModel } from '../models/ProgramModel';
import { TrainerViewModel } from '../view-models/TrainerViewModel';
import { TrainerModel } from '../models/TrainerModel';
import { ScheduleModel } from '../models/ScheduleModel';
import { useData } from './DataProvider';

interface ViewModelContextType {
  bookingVM: BookingViewModel;
  programVM: ProgramViewModel;
  trainerVM: TrainerViewModel;
}

const ViewModelContext = createContext<ViewModelContextType | null>(null);

interface ViewModelProviderProps {
  children: ReactNode;
}

export function ViewModelProvider({ children }: ViewModelProviderProps) {
  const { service } = useData();

  const viewModels = useMemo(() => {
    const scheduleModel = new ScheduleModel(service);
    const bookingModel = new BookingModel(service, scheduleModel);
    const programModel = new ProgramModel(service);
    const trainerModel = new TrainerModel(service);

    const bookingVM = new BookingViewModel(bookingModel, programModel);
    const programVM = new ProgramViewModel(programModel);
    const trainerVM = new TrainerViewModel(bookingModel, trainerModel, scheduleModel);

    return {
      bookingVM,
      programVM,
      trainerVM
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
