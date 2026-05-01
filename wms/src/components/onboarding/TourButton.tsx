"use client";

import { HelpCircle } from "lucide-react";
import { useTour } from "./TourProvider";
import type { TourDef } from "@/lib/tours/definitions";

interface TourButtonProps {
  tour: TourDef;
  className?: string;
}

export function TourButton({ tour, className }: TourButtonProps) {
  const { startTour, isTourCompleted } = useTour();
  const completed = isTourCompleted(tour.id);

  return (
    <button
      type="button"
      onClick={() => startTour(tour)}
      title={`${completed ? "Replay" : "Start"}: ${tour.title}`}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
        completed
          ? "text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-white/5"
          : "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
      } ${className ?? ""}`}
    >
      <HelpCircle className="h-3.5 w-3.5" />
      {completed ? "Replay tour" : "Take tour"}
    </button>
  );
}
