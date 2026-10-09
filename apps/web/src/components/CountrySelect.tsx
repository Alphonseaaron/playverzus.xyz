'use client';

import { useState, useRef, useEffect } from 'react';
import { COUNTRIES, GLOBAL_REGIONS, searchCountries, type Country, type GlobalRegion } from '@playverzus/core';
import { ChevronDown, Search, X, Check } from 'lucide-react';
import { Badge } from './ui/badge';
import { Input } from './ui/input';

interface CountrySelectProps {
  value?: string; // Country code (e.g. 'FR', 'DE')
  onChange: (country: Country) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  filterRegion?: GlobalRegion | 'All';
  className?: string;
}

export function CountrySelect({
  value = '',
  onChange,
  label = 'Select Country / Nationality',
  placeholder = 'Search country by name or code...',
  required = false,
  filterRegion = 'All',
  className = '',
}: CountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeRegion, setActiveRegion] = useState<GlobalRegion | 'All'>(filterRegion);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCountry = COUNTRIES.find(
    (c) => c.code === value.toUpperCase() || c.code3 === value.toUpperCase()
  );

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered countries based on search query and region tab
  const filteredCountries = searchCountries(query).filter(
    (c) => activeRegion === 'All' || c.region === activeRegion
  );

  const handleSelect = (c: Country) => {
    onChange(c);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div className={`relative flex flex-col gap-1.5 text-foreground ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-bold text-foreground">
          {label} {required && <span className="text-primary">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-10 px-3.5 bg-secondary/60 border border-border rounded-xl text-xs text-left flex items-center justify-between hover:border-primary/50 focus:outline-none focus:border-primary transition"
      >
        <span className="flex items-center gap-2.5 truncate">
          {selectedCountry ? (
            <>
              <span className="text-base">{selectedCountry.flag}</span>
              <span className="font-bold text-foreground">{selectedCountry.name}</span>
              <span className="text-[10px] text-muted-foreground font-mono">({selectedCountry.code})</span>
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180 text-primary' : ''}`}
        />
      </button>

      {/* Expandable Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-card border border-border rounded-2xl shadow-2xl p-3 flex flex-col gap-2.5 max-h-96">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
            <Input
              type="text"
              autoFocus
              placeholder="Filter 249+ countries..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 text-xs h-9"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Region Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px]">
            <button
              type="button"
              onClick={() => setActiveRegion('All')}
              className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition text-xs ${
                activeRegion === 'All'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              All (249)
            </button>
            {GLOBAL_REGIONS.map((region) => (
              <button
                key={region}
                type="button"
                onClick={() => setActiveRegion(region)}
                className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition text-xs ${
                  activeRegion === region
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {region}
              </button>
            ))}
          </div>

          {/* Country List */}
          <div className="overflow-y-auto max-h-60 flex flex-col gap-1 pr-1 divide-y divide-border/40 scrollbar-thin">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((c) => {
                const isSelected = selectedCountry?.code === c.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleSelect(c)}
                    className={`w-full px-2.5 py-2 text-left rounded-xl flex items-center justify-between text-xs transition ${
                      isSelected
                        ? 'bg-primary/15 text-primary font-bold border border-primary/30'
                        : 'hover:bg-secondary text-foreground'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">{c.flag}</span>
                      <span>{c.name}</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {c.code} · {c.region}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No countries found for "{query}".
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
