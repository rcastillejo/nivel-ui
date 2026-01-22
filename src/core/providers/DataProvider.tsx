'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { IDataService } from '../repositories';
import { LocalStorageDataService } from '../repositories/localStorage';
import { Trainer, Booking } from '../types';

interface DataContextType {
  service: IDataService;
  trainers: Trainer[];
  bookings: Booking[];
  isLoading: boolean;
  refreshTrainers: () => Promise<void>;
  refreshBookings: () => Promise<void>;
  createBooking: (booking: Omit<Booking, 'id'>) => Promise<void>;
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
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const createBooking = async (bookingData: Omit<Booking, 'id'>) => {
    try {
      const newBooking: Booking = {
        ...bookingData,
        id: `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      await service.bookings.save(newBooking);
      await refreshBookings();
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      try {
        await service.initialize();
        await Promise.all([
          refreshTrainers(),
          refreshBookings()
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
    service,
    trainers,
    bookings,
    isLoading,
    refreshTrainers,
    refreshBookings,
    createBooking
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}
