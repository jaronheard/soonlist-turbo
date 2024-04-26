"use client";

import { useContext, useState } from "react";
import { allTimezones, useTimezoneSelect } from "react-timezone-select";
import { Check, ChevronsUpDown } from "lucide-react";
import { TimezoneContext } from "@/context/TimezoneContext";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const labelStyle = "abbrev";
const timezones = {
  ...allTimezones,
};

export function TimezoneSelect({
  timezone: timezoneFromProps,
  setTimezone: setTimezoneFromProps,
  fullWidth,
}: {
  timezone?: string;
  setTimezone?: (timezone: string) => void;
  fullWidth?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { timezone: timezoneFromContext, setTimezone: setTimezoneFromContext } =
    useContext(TimezoneContext);
  const timezone = timezoneFromProps || timezoneFromContext;
  const setTimezone = setTimezoneFromProps || setTimezoneFromContext;
  const { options } = useTimezoneSelect({
    labelStyle,
    timezones,
  });
  const currentTimezone = options.find((tz) => tz.value === timezone)?.label;
  const widthClass = fullWidth ? "w-full" : "w-[240px]";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={`${widthClass} justify-between rounded-md text-sm`}
        >
          <span className="truncate">{currentTimezone}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={`${widthClass} p-0`}>
        <Command>
          <CommandInput placeholder="Search timezone..." />
          <CommandEmpty>No timezone found.</CommandEmpty>
          <CommandGroup className="max-h-48 overflow-y-scroll">
            {options.map((tz) => (
              <CommandItem
                key={tz.label}
                value={tz.label}
                onSelect={(currentValue) => {
                  const tzValue = options.find(
                    (tz) => tz.label.toLocaleLowerCase() === currentValue
                  )?.value;
                  if (!tzValue) return;
                  setTimezone(tzValue);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 size-4",
                    timezone === tz.value ? "opacity-100" : "opacity-0"
                  )}
                />
                {tz.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
