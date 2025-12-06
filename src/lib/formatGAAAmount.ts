/**
 * Format GAA budget amounts for display.
 * 
 * NOTE: GAA aggregates store amounts in THOUSANDS of pesos.
 * For example: 6,326,324,300 (in thousands) = ₱6.33 trillion actual
 * 
 * @param value - Amount in thousands of pesos
 * @returns Formatted currency string (e.g., "₱6.33T", "₱125.44B")
 */
export function formatGAAAmount(value: number): string {
  // Value is in thousands, so multiply by 1,000 to get actual pesos
  const actualPesos = value * 1_000

  if (actualPesos >= 1_000_000_000_000) {
    return `₱${(actualPesos / 1_000_000_000_000).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}T`
  } else if (actualPesos >= 1_000_000_000) {
    return `₱${(actualPesos / 1_000_000_000).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}B`
  } else if (actualPesos >= 1_000_000) {
    return `₱${(actualPesos / 1_000_000).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}M`
  } else if (actualPesos >= 1_000) {
    return `₱${(actualPesos / 1_000).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}K`
  } else {
    return `₱${actualPesos.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`
  }
}
