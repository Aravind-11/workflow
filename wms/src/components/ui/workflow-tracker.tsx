"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

interface WorkflowTrackerProps {
  steps: string[];
  currentStep: string;
  completedSteps?: string[];
  timestamps?: Record<string, string>;
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.5 8.5L6.5 11.5L12.5 4.5" />
    </svg>
  );
}

type StepStatus = "completed" | "current" | "future";

function getStepStatus(
  step: string,
  currentStep: string,
  completedSteps: string[],
): StepStatus {
  if (completedSteps.includes(step)) return "completed";
  if (step === currentStep) return "current";
  return "future";
}

export default function WorkflowTracker({
  steps,
  currentStep,
  completedSteps: completedStepsProp,
  timestamps,
}: WorkflowTrackerProps) {
  const prefersReduced = useReducedMotion();

  const currentIndex = steps.indexOf(currentStep);
  const completedSteps =
    completedStepsProp ?? steps.slice(0, Math.max(currentIndex, 0));

  const fast = prefersReduced ? 0 : 0.3;
  const stagger = prefersReduced ? 0 : 0.12;

  return (
    <div
      className={cn(
        "flex flex-col gap-0 md:flex-row md:items-start md:gap-0",
        "w-full",
      )}
      role="list"
      aria-label="Workflow progress"
    >
      {steps.map((step, i) => {
        const status = getStepStatus(step, currentStep, completedSteps);
        const isLast = i === steps.length - 1;

        return (
          <div
            key={step}
            role="listitem"
            aria-current={status === "current" ? "step" : undefined}
            className={cn(
              "flex items-start gap-3",
              "md:flex-col md:items-center md:gap-2",
              !isLast && "flex-1",
            )}
          >
            {/* Circle + connector row */}
            <div
              className={cn(
                "flex flex-col items-center",
                "md:flex-row md:w-full md:items-center",
              )}
            >
              {/* Step circle */}
              <motion.div
                initial={{ scale: prefersReduced ? 1 : 0.5, opacity: prefersReduced ? 1 : 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: fast, delay: i * stagger }}
                className="relative z-10 flex shrink-0"
              >
                <StepCircle status={status} index={i} prefersReduced={prefersReduced} />
              </motion.div>

              {/* Connector line (horizontal on desktop) */}
              {!isLast && (
                <div className="relative hidden h-0.5 w-full md:block">
                  <div className="absolute inset-0 bg-neutral-200 rounded-full" />
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full bg-success-500"
                    initial={{ width: "0%" }}
                    animate={{
                      width:
                        status === "completed"
                          ? "100%"
                          : status === "current"
                            ? "50%"
                            : "0%",
                    }}
                    transition={{
                      duration: prefersReduced ? 0 : 0.5,
                      delay: i * stagger + fast,
                      ease: [0.25, 1, 0.5, 1],
                    }}
                  />
                </div>
              )}

              {/* Connector line (vertical on mobile) */}
              {!isLast && (
                <div className="relative ml-0 h-8 w-0.5 md:hidden">
                  <div className="absolute inset-0 bg-neutral-200 rounded-full" />
                  <motion.div
                    className="absolute inset-x-0 top-0 rounded-full bg-success-500"
                    initial={{ height: "0%" }}
                    animate={{
                      height:
                        status === "completed"
                          ? "100%"
                          : status === "current"
                            ? "50%"
                            : "0%",
                    }}
                    transition={{
                      duration: prefersReduced ? 0 : 0.5,
                      delay: i * stagger + fast,
                      ease: [0.25, 1, 0.5, 1],
                    }}
                  />
                </div>
              )}
            </div>

            {/* Label + timestamp */}
            <motion.div
              initial={{ opacity: prefersReduced ? 1 : 0, y: prefersReduced ? 0 : 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: fast, delay: i * stagger + 0.1 }}
              className="flex flex-col pb-2 md:items-center md:pb-0"
            >
              <span
                className={cn(
                  "text-xs font-semibold tracking-wide",
                  status === "completed" && "text-success-700",
                  status === "current" && "text-primary-700",
                  status === "future" && "text-neutral-400",
                )}
              >
                {step}
              </span>
              {timestamps?.[step] && (
                <span className="text-[11px] text-neutral-500">
                  {timestamps[step]}
                </span>
              )}
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}

function StepCircle({
  status,
  index,
  prefersReduced,
}: {
  status: StepStatus;
  index: number;
  prefersReduced: boolean | null;
}) {
  const size = "h-7 w-7";

  if (status === "completed") {
    return (
      <span
        className={cn(
          size,
          "flex items-center justify-center rounded-full bg-success-500 text-white",
        )}
      >
        <CheckIcon className="h-3.5 w-3.5" />
      </span>
    );
  }

  if (status === "current") {
    return (
      <span className="relative flex items-center justify-center">
        {!prefersReduced && (
          <motion.span
            className={cn(
              "absolute rounded-full bg-primary-300",
              size,
            )}
            animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        <span
          className={cn(
            size,
            "relative flex items-center justify-center rounded-full bg-primary-500 text-[11px] font-bold text-white",
          )}
        >
          {index + 1}
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        size,
        "flex items-center justify-center rounded-full border-2 border-neutral-300 text-[11px] font-semibold text-neutral-400",
      )}
    >
      {index + 1}
    </span>
  );
}
