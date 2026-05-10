'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { IDataService } from '../repositories';
import { LocalStorageDataService } from '../repositories/localStorage';
import { Trainer, Booking, Client, Program } from '../types';

// Internal context — only for use by ViewModelProvider to access the service layer
const DataServiceContext = createContext<IDataService | null>(null);

export function useDataService(): IDataService {
  const context = useContext(DataServiceContext);
  if (!context) {
    throw new Error('useDataService must be used within a DataProvider');
  }
  return context;
}

interface DataContextType {
  clients: Client[];
  trainers: Trainer[];
  bookings: Booking[];
  programs: Program[];
  isLoading: boolean;
  refreshClients: () => Promise<void>;
  refreshTrainers: () => Promise<void>;
  refreshBookings: () => Promise<void>;
  refreshPrograms: () => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export function useData(): DataContextType {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}

interface DataProviderProps {
  children: ReactNode;
}

export function DataProvider({ children }: DataProviderProps) {
  const [service] = useState<IDataService>(() => new LocalStorageDataService());
  const [clients, setClients] = useState<Client[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshClients = async () => {
    try {
      const data = await service.clients.getAll();
      setClients(data);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const refreshTrainers = async () => {
    try {
      const data = await service.trainers.getAll();
      setTrainers(data);
    } catch (error) {
      console.error('Error loading trainers:', error);
    }
  };

  const refreshBookings = async () => {
    try {
      const data = await service.bookings.getAll();
      setBookings(data);
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
  };

  const refreshPrograms = async () => {
    try {
      const data = await service.programs.getAll();
      setPrograms(data);
    } catch (error) {
      console.error('Error loading programs:', error);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      try {
        await service.initialize();
        await Promise.all([
          refreshClients(),
          refreshTrainers(),
          refreshBookings(),
          refreshPrograms()
        ]);
      } catch (error) {
        console.error('Error initializing data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [service]);

  const value: DataContextType = {
    clients,
    trainers,
    bookings,
    programs,
    isLoading,
    refreshClients,
    refreshTrainers,
    refreshBookings,
    refreshPrograms,
  };

  return (
    <DataServiceContext.Provider value={service}>
      <DataContext.Provider value={value}>
        {children}
      </DataContext.Provider>
    </DataServiceContext.Provider>
  );
}
