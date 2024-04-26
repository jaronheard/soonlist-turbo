"use client";

import React, { useMemo, useState } from "react";
import { ListSaveButton } from "./ListSaveButton";
import { ListUpdateButton } from "./ListUpdateButton";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";

type AddListCardProps = {
  name: string;
  description: string;
  update?: boolean;
  updateId?: string;
  afterSuccess?: string;
  afterSuccessFunction?: () => void;
};

export function AddListCard({ ...initialProps }: AddListCardProps) {
  const [name, setName] = useState(initialProps.name);
  const [description, setDescription] = useState(initialProps.description);

  const updatedProps = useMemo(
    () => ({
      name,
      description,
    }),
    [name, description]
  );

  return (
    <div className="mt-10 grid max-w-xl grid-cols-1 gap-x-6 gap-y-8 rounded-xl border bg-white p-4 shadow-md sm:grid-cols-6">
      <div className="col-span-full">
        <label
          htmlFor="name"
          className="block text-sm font-medium leading-6 text-gray-900"
        >
          Name your list
        </label>
        <div className="mt-2">
          <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
            <Input
              type="text"
              name="name"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Portland Art Openings, Poetry Readings, etc."
            />
          </div>
        </div>
      </div>
      <div className="col-span-full">
        <label
          htmlFor="description"
          className="block text-sm font-medium leading-6 text-gray-900"
        >
          Description
        </label>
        <div className="mt-2">
          <Textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. A list of art openings in Portland, Oregon, focusing on contemporary art and up and coming artist."
          />
        </div>
      </div>
      <div className="col-span-full">
        {!initialProps.update && (
          <ListSaveButton
            afterSuccess={initialProps.afterSuccess}
            afterSuccessFunction={initialProps.afterSuccessFunction}
            {...updatedProps}
          />
        )}
        {initialProps.update && (
          <ListUpdateButton id={initialProps.updateId!} {...updatedProps} />
        )}
      </div>
    </div>
  );
}
