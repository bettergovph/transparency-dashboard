import React, { useState, useEffect, useRef } from 'react'
import { Check, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export interface AutocompleteOption {
  value: string
  label: string
}

interface AutocompleteProps {
  options: AutocompleteOption[]
  selectedValues: string[]
  onChange: (values: string[]) => void
  onSearchChange: (query: string) => void
  placeholder?: string
  loading?: boolean
  disabled?: boolean
  className?: string
}

export const Autocomplete: React.FC<AutocompleteProps> = ({
  options,
  selectedValues,
  onChange,
  onSearchChange,
  placeholder = 'Search...',
  loading = false,
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      onSearchChange(searchQuery)
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery, onSearchChange])

  const handleSelect = (selectedValue: string) => {
    if (selectedValues.includes(selectedValue)) {
      // Remove if already selected
      onChange(selectedValues.filter(v => v !== selectedValue))
    } else {
      // Add to selected values
      onChange([...selectedValues, selectedValue])
    }
    // Don't clear search query or close dropdown - keep it open for multi-select
    inputRef.current?.focus()
  }

  const handleRemove = (valueToRemove: string) => {
    onChange(selectedValues.filter(v => v !== valueToRemove))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    setIsOpen(true)
  }

  const handleInputFocus = () => {
    setIsOpen(true)
    // Don't trigger initial search - only search when user types
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input Field */}
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={searchQuery}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        disabled={disabled}
        className="w-full text-[10px] py-1 px-2 h-4"
      />

      {/* Selected Tags - Below Input */}
      {/* {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {selectedValues.map((value) => (
            <div
              key={value}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px]"
            >
              <span className="truncate max-w-[150px]">{value}</span>
              <button
                type="button"
                onClick={() => handleRemove(value)}
                className="hover:bg-blue-200 rounded-full p-0.5"
              >
                <X className="h-2 w-2" />
              </button>
            </div>
          ))}
        </div>
      )} */}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg">
          <div className="max-h-48 overflow-y-auto p-1">
            {loading ? (
              <div className="py-4 text-center text-[10px] text-gray-500">
                Loading...
              </div>
            ) : options.length === 0 ? (
              <div className="py-4 text-center text-[10px] text-gray-500">
                No results found
              </div>
            ) : (
              <div className="space-y-0.5">
                {options.map((option) => {
                  const isSelected = selectedValues.includes(option.value)
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleSelect(option.value)}
                      className={`
                        w-full flex items-center justify-between px-2 py-1 text-[11px] rounded
                        hover:bg-gray-100 transition-colors
                        ${isSelected ? 'bg-blue-50' : ''}
                      `}
                    >
                      <span className="truncate">{option.label}</span>
                      {isSelected && (
                        <Check className="h-3 w-3 text-blue-600 flex-shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
