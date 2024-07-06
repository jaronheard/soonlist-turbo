import { CheckIcon } from "lucide-react";

import { cn } from ".";

enum StepStatus {
  Complete = "complete",
  Current = "current",
  Upcoming = "upcoming",
}
interface Step {
  name: string;
  href: string;
  status: StepStatus;
}

interface StepperProps {
  steps: Step[];
}

function Stepper({ steps }: StepperProps) {
  return (
    <nav aria-label="Progress">
      <ol role="list" className="flex items-center pb-8">
        {steps.map((step, stepIdx) => (
          <li
            key={step.name}
            className={cn(
              stepIdx !== steps.length - 1 ? "pr-32" : "",
              "relative",
            )}
          >
            {step.status === "complete" ? (
              <>
                <div
                  aria-hidden="true"
                  className="absolute inset-0 flex items-center"
                >
                  <div className="h-[0.1875rem] w-full bg-interactive-1" />
                </div>
                <a className="relative block bg-white p-0.5" href={step.href}>
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-success hover:bg-indigo-900">
                    <CheckIcon
                      aria-hidden="true"
                      className="mt-[0.05rem] h-3 w-3 text-white"
                    />
                    <span className="absolute -bottom-8 font-medium text-neutral-2">
                      {step.name}
                    </span>
                  </div>
                </a>
              </>
            ) : step.status === "current" ? (
              <>
                <div
                  aria-hidden="true"
                  className="absolute inset-0 flex items-center"
                >
                  <div className="h-[0.0625rem] w-full bg-neutral-3" />
                </div>
                <a
                  href={step.href}
                  aria-current="step"
                  className="relative block bg-white p-0.5"
                >
                  <div className="flex h-4 w-4 items-center justify-center rounded-full border-4 border-interactive-1 bg-neutral-3">
                    <span className="absolute -bottom-8 font-bold text-interactive-1">
                      {step.name}
                    </span>
                  </div>
                </a>
              </>
            ) : (
              <>
                <div
                  aria-hidden="true"
                  className="absolute inset-0 flex items-center"
                >
                  <div className="h-[0.0625rem] w-full bg-neutral-3" />
                </div>
                <a
                  href={step.href}
                  aria-hidden="true"
                  className="relative flex h-2 w-2 items-center justify-center rounded-full bg-neutral-3"
                >
                  <span className="absolute -bottom-[2.375rem] font-medium text-neutral-2">
                    {step.name}
                  </span>
                </a>
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export { Stepper, StepStatus };
