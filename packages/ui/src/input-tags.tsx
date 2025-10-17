import type { Dispatch, SetStateAction } from "react";
import { forwardRef, useState } from "react";
import { XIcon } from "lucide-react";

import type { InputProps } from "./input";
import { Badge } from "./badge";
import { Button } from "./button";
import { Input } from "./input";

type OverrideInputProps = Omit<InputProps, "onChange">;
// initial source: https://github.com/JaleelB/shadcn-tag-input
type InputTagsProps = OverrideInputProps & {
  value: string[];
  onChange: Dispatch<SetStateAction<string[]>>;
  normalizeItem?: (value: string) => string;
};

export const InputTags = forwardRef<HTMLInputElement, InputTagsProps>(
  ({ value, onChange, normalizeItem, ...props }, ref) => {
    const [pendingDataPoint, setPendingDataPoint] = useState("");

    const addPendingDataPoint = () => {
      if (pendingDataPoint) {
        const candidate = normalizeItem
          ? normalizeItem(pendingDataPoint)
          : pendingDataPoint;
        const newDataPoints = new Set([...value, candidate]);
        onChange(Array.from(newDataPoints));
        setPendingDataPoint("");
      }
    };

    return (
      <>
        <div className="flex">
          <Input
            value={pendingDataPoint}
            onChange={(e) => setPendingDataPoint(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addPendingDataPoint();
              }
              // comma or return
              else if (e.key === "," || e.key === "Enter") {
                e.preventDefault();
                addPendingDataPoint();
              }
            }}
            {...props}
            ref={ref}
          />
          <Button
            type="button"
            variant="secondary"
            size={"sm"}
            className="ml-2 h-12"
            onClick={addPendingDataPoint}
          >
            Add
          </Button>
        </div>
        {value.length > 0 && (
          <div className="my-2 flex min-h-[2.5rem] flex-wrap items-center gap-2 overflow-y-auto rounded-md p-2">
            {value.map((item, idx) => (
              <Badge key={idx} variant="secondary">
                {item}
                <button
                  type="button"
                  className="ml-2 w-3"
                  onClick={() => {
                    onChange(value.filter((i) => i !== item));
                  }}
                >
                  <XIcon className="w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </>
    );
  },
);

InputTags.displayName = "InputTags";
