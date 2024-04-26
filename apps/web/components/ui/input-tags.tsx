import { XIcon } from "lucide-react";
import {
  type Dispatch,
  type SetStateAction,
  forwardRef,
  useState,
} from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, type InputProps } from "@/components/ui/input";

type OverrideInputProps = Omit<InputProps, "onChange">;
// initial source: https://github.com/JaleelB/shadcn-tag-input
type InputTagsProps = OverrideInputProps & {
  value: string[];
  onChange: Dispatch<SetStateAction<string[]>>;
};

export const InputTags = forwardRef<HTMLInputElement, InputTagsProps>(
  ({ value, onChange, ...props }, ref) => {
    const [pendingDataPoint, setPendingDataPoint] = useState("");

    const addPendingDataPoint = () => {
      if (pendingDataPoint) {
        const newDataPoints = new Set([...value, pendingDataPoint]);
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
        <div className="flex min-h-[2.5rem] flex-wrap items-center gap-2 overflow-y-auto rounded-md border p-2">
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
      </>
    );
  }
);

InputTags.displayName = "InputTags";
