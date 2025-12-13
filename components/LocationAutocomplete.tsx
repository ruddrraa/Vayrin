import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin } from 'lucide-react';
import { placesAutocomplete, placeDetails, AutocompleteSuggestion } from '../lib/olaApi';

interface Props {
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  onSelect: (place: { lat: number; lng: number; description: string; place_id: string }) => void;
  locationBias?: { lat: number; lng: number };
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
}

export default function LocationAutocomplete({
  placeholder = 'Search location',
  value,
  onChange,
  onSelect,
  locationBias,
  icon,
  trailing,
}: Props) {
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  const searchPlaces = useCallback(
    (query: string) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      
      if (!query || query.trim().length < 2) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }

      debounceTimer.current = setTimeout(async () => {
        try {
          setLoading(true);
          const results = await placesAutocomplete(query, {
            location: locationBias,
            radius: 50000,
          });
          setSuggestions(results);
          setIsOpen(results.length > 0);
          setHighlightIndex(-1);
        } catch (err) {
          console.error('Autocomplete error:', err);
          setSuggestions([]);
        } finally {
          setLoading(false);
        }
      }, 300);
    },
    [locationBias]
  );

  useEffect(() => {
    searchPlaces(value);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [value, searchPlaces]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSuggestion = async (suggestion: AutocompleteSuggestion) => {
    try {
      setLoading(true);
      const details = await placeDetails(suggestion.place_id);
      if (details?.geometry?.location) {
        onChange(suggestion.description);
        onSelect({
          lat: details.geometry.location.lat,
          lng: details.geometry.location.lng,
          description: suggestion.description,
          place_id: suggestion.place_id,
        });
      }
    } catch (err) {
      console.error('Place details error:', err);
    } finally {
      setLoading(false);
      setIsOpen(false);
      setSuggestions([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[highlightIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1">
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full bg-transparent outline-none text-base font-medium text-slate-900 placeholder:text-slate-400 pr-8"
        />
        {loading && (
          <div className="absolute right-8 w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        )}
        {trailing}
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-[-16px] right-[-16px] top-[calc(100%+8px)] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-[200] max-h-[300px] overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.place_id || `suggestion-${index}`}
              onClick={() => handleSelectSuggestion(suggestion)}
              onMouseEnter={() => setHighlightIndex(index)}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-150 ${
                index === highlightIndex ? 'bg-blue-50' : 'hover:bg-slate-50'
              } ${index !== suggestions.length - 1 ? 'border-b border-slate-100' : ''}`}
            >
              <div className="shrink-0 w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <MapPin size={14} className="text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-slate-900 truncate">
                  {suggestion.structured_formatting?.main_text || suggestion.description.split(',')[0]}
                </p>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {suggestion.structured_formatting?.secondary_text || suggestion.description.split(',').slice(1).join(',').trim()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
