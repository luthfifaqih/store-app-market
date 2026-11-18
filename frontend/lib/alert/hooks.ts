"use client";

import { z } from "zod";
import indonesia from "zod/v4/locales/id.js";
import { useRef } from "react";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { useForm, type FieldValues, type Path, type UseFormProps, type SubmitHandler } from "react-hook-form";
import { alert, validationLines } from "./index";
import type { LoadingOptions } from "./core";

z.config(indonesia());

export function useAlertForm<T extends FieldValues>(options: UseFormProps<T>) {
  const form = useForm<T>({...options, shouldFocusError:false});
  async function invalid(errors: unknown) {
    await alert.validation(errors);
    const first = validationLines(errors)[0]?.[0];
    if (first) form.setFocus(first as Path<T>);
  }
  return {...form,
    handleSubmit: (valid: SubmitHandler<T>) => form.handleSubmit(valid, invalid),
    invalid,
    onInvalid: (fields: Record<string,string[]>) => {
      for (const [field,messages] of Object.entries(fields)) form.setError(field as Path<T>, {type:"server",message:messages.join(" ")});
      return () => { const first = Object.keys(fields)[0]; if (first) form.setFocus(first as Path<T>); };
    },
  };
}

export function useActionMutation<T, V = void>(
  interaction: LoadingOptions | ((variables: V) => LoadingOptions),
  options: Omit<UseMutationOptions<T, Error, V>, "mutationFn"> & {mutationFn: (variables: V) => Promise<T>},
) {
  const locked = useRef(false);
  const mutation = useMutation({...options,
    mutationFn: (variables: V) => alert.withLoading(() => options.mutationFn(variables), typeof interaction === "function" ? interaction(variables) : interaction),
  });
  return {...mutation, mutate: (variables: V) => {
    if (locked.current) return;
    locked.current = true;
    void mutation.mutateAsync(variables).catch(() => undefined).finally(() => {locked.current = false;});
  }};
}
