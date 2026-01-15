import React, { useEffect, useMemo, useRef, useState } from "react";
import { placesAutocomplete, AutocompleteSuggestion, placeDetails } from "../lib/olaApi";

type Props = {
  placeholder?: string;
  value?: string;
  onValueChange?: (val: string) => void;
  onSelect: (place: { place_id: string; lat: number; lng: number; description?: string }) => void;
  locationBias?: { lat: number; lng: number };
  className?: string;
  inputClassName?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
};

export default function Autocomplete({ placeholder = "Search location", value, onValueChange, onSelect, locationBias, className, inputClassName, leading, trailing }: Props) {
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<number | null>(null);

  const debouncedFetch = useMemo(() => {
    return (q: string) => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(async () => {
        if (!q.trim()) {
          setSuggestions([]);
          return;
        }
        try {
          setLoading(true);
          const preds = await placesAutocomplete(q, {
            location: locationBias,
            radius: 10000,
            strictbounds: !!locationBias,
          });
          setSuggestions(preds);
        } catch (e) {
          console.error("Autocomplete error", e);
          setSuggestions([]);
        } finally {
          setLoading(false);
        }
      }, 250);
    };
  }, [locationBias]);

  useEffect(() => {
    debouncedFetch(query);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, debouncedFetch]);

  useEffect(() => {
    if (typeof value === "string") setQuery(value);
  }, [value]);

  async function handleSelect(s: AutocompleteSuggestion) {
    try {
      const details = await placeDetails(s.place_id);
      if (details?.geometry?.location) {
        onSelect({
          place_id: s.place_id,
          lat: details.geometry.location.lat,
          lng: details.geometry.location.lng,
          description: s.description,
        });
        const nextVal = s.description || details.formatted_address || "";
        setQuery(nextVal);
        if (onValueChange) onValueChange(nextVal);
        setSuggestions([]);
      }
    } catch (e) {
      console.error("Place details error", e);
    }
  }

  return (
    <div style={{ position: "relative" }} className={className}>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {leading && <div style={{ position: "absolute", left: 10 }}>{leading}</div>}
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (onValueChange) onValueChange(e.target.value);
          }}
          placeholder={placeholder}
          autoComplete="off"
          className={inputClassName}
          style={inputClassName ? {} : { width: "100%", padding: "10px 12px", paddingLeft: leading ? 32 : 12, paddingRight: trailing ? 32 : 12, border: "1px solid #ddd", borderRadius: 10, outline: "none" }}
        />
        {trailing && <div style={{ position: "absolute", right: 10 }}>{trailing}</div>}
      </div>
      {loading && (
        <div style={{ position: "absolute", top: 8, right: 8, fontSize: 12, color: "#666" }}>Loading…</div>
      )}
      {suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: 6,
            marginTop: 6,
            maxHeight: 240,
            overflowY: "auto",
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            zIndex: 10,
          }}
        >
          {suggestions.map((s) => (
            <div
              key={s.place_id}
              onClick={() => handleSelect(s)}
              style={{ padding: "8px 10px", cursor: "pointer" }}
            >
              <div style={{ fontWeight: 600 }}>{s.structured_formatting?.main_text || s.description}</div>
              {s.structured_formatting?.secondary_text && (
                <div style={{ fontSize: 12, color: "#666" }}>{s.structured_formatting.secondary_text}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
