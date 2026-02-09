"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function PasswordInput(props: {
  id: string;
  name: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
}) {
  const [show, setShow] = React.useState(false);

  return (
    <div className="relative">
      <Input
        id={props.id}
        name={props.name}
        type={show ? "text" : "password"}
        autoComplete={props.autoComplete}
        required={props.required}
        minLength={props.minLength}
        placeholder={props.placeholder}
        className="pr-12"
      />
      <Button
        type="button"
        variant="ghost"
        className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 p-0"
        aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
        onClick={() => setShow((v) => !v)}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  );
}

