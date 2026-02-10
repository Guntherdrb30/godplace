"use client";

import * as React from "react";
import { VENEZUELA_CITIES_BY_STATE, VENEZUELA_STATES } from "@/lib/venezuela";
import { Label } from "@/components/ui/label";

export function VenezuelaStateCitySelect(props: {
  defaultState?: string;
  defaultCity?: string;
  stateName: string;
  cityName: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const defaultState = (props.defaultState || "").trim();
  const defaultCity = (props.defaultCity || "").trim();

  const defaultStateIsKnown = defaultState
    ? (VENEZUELA_STATES as readonly string[]).includes(defaultState)
    : false;

  const initialState = defaultState ? defaultState : "";
  const [state, setState] = React.useState<string>(initialState);
  const [city, setCity] = React.useState<string>(defaultCity);

  const stateIsKnown = state ? (VENEZUELA_STATES as readonly string[]).includes(state) : false;

  const states =
    defaultState && !defaultStateIsKnown
      ? ([defaultState, ...VENEZUELA_STATES] as readonly string[])
      : VENEZUELA_STATES;

  const baseCities =
    state && (VENEZUELA_CITIES_BY_STATE as Record<string, string[]>)[state]
      ? (VENEZUELA_CITIES_BY_STATE as Record<string, string[]>)[state]
      : [];

  const cities = city && !baseCities.includes(city) ? [city, ...baseCities] : baseCities;

  React.useEffect(() => {
    if (!state) return;
    if (!stateIsKnown) return;
    if (city && !baseCities.includes(city)) setCity("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor="vz-estado">Estado</Label>
        <select
          id="vz-estado"
          name={props.stateName}
          className="h-10 rounded-md border bg-white px-3 text-sm"
          value={state}
          onChange={(e) => setState(e.target.value)}
          required={props.required}
          disabled={props.disabled}
        >
          <option value="">Selecciona...</option>
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="vz-ciudad">Ciudad</Label>
        <select
          id="vz-ciudad"
          name={props.cityName}
          className="h-10 rounded-md border bg-white px-3 text-sm"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          required={props.required}
          disabled={props.disabled || !state}
        >
          <option value="">{state ? "Selecciona..." : "Selecciona estado primero"}</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
