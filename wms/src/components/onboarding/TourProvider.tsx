"use client";

import { createContext, useContext, useCallback, useEffect, useState } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import type { TourDef } from "@/lib/tours/definitions";

const STORAGE_KEY = "nventr_completed_tours";

interface TourContextValue {
  startTour: (tourDef: TourDef) => void;
  isTourCompleted: (tourId: string) => boolean;
  resetTours: () => void;
}

const TourContext = createContext<TourContextValue>({
  startTour: () => {},
  isTourCompleted: () => false,
  resetTours: () => {},
});

export function useTour() {
  return useContext(TourContext);
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [completedTours, setCompletedTours] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCompletedTours(new Set(JSON.parse(stored)));
      }
    } catch {
      // ignore
    }
  }, []);

  const markCompleted = useCallback((tourId: string) => {
    setCompletedTours((prev) => {
      const next = new Set(prev);
      next.add(tourId);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const startTour = useCallback(
    (tourDef: TourDef) => {
      const d = driver({
        showProgress: true,
        showButtons: ["next", "previous", "close"],
        steps: tourDef.steps,
        onDestroyed: () => {
          markCompleted(tourDef.id);
        },
      });
      d.drive();
    },
    [markCompleted],
  );

  const isTourCompleted = useCallback(
    (tourId: string) => completedTours.has(tourId),
    [completedTours],
  );

  const resetTours = useCallback(() => {
    setCompletedTours(new Set());
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return (
    <TourContext.Provider value={{ startTour, isTourCompleted, resetTours }}>
      {children}
    </TourContext.Provider>
  );
}
