/**
 * Shared date formatting utility to ensure consistent date display across components
 */

/**
 * Format date function for consistent use across components
 * Returns dates in format: "Sept 22, 2025"
 */
export const formatDate = (dateString: string | null | undefined): string => {
  try {
    // Handle null, undefined, or empty strings
    if (!dateString || dateString === 'undefined' || dateString === 'null') {
      return 'No Date';
    }

    // Clean the date string - remove any extra spaces or invalid characters
    const cleanDateString = dateString.toString().trim();
    
    // Try to create a date object
    let date = new Date(cleanDateString);
    
    // If the date is invalid, try parsing common formats
    if (isNaN(date.getTime())) {
      // Try parsing "Sept 16, 2025" format (already formatted dates from API)
      const monthDayYear = cleanDateString.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)\s+(\d{1,2}),\s+(\d{4})$/);
      if (monthDayYear) {
        const [, monthName, day, year] = monthDayYear;
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
        const monthIndex = monthNames.indexOf(monthName === 'Sep' ? 'Sept' : monthName);
        if (monthIndex !== -1) {
          date = new Date(parseInt(year), monthIndex, parseInt(day));
        }
      }
      
      // Try parsing MM/DD/YYYY format
      if (isNaN(date.getTime())) {
        const mmddyyyy = cleanDateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (mmddyyyy) {
          const [, month, day, year] = mmddyyyy;
          date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
      }
      
      // Try parsing YYYY-MM-DD format
      if (isNaN(date.getTime())) {
        const yyyymmdd = cleanDateString.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (yyyymmdd) {
          const [, year, month, day] = yyyymmdd;
          date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
      }
      
      // Try parsing DD/MM/YYYY format
      if (isNaN(date.getTime())) {
        const ddmmyyyy = cleanDateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (ddmmyyyy) {
          const [, day, month, year] = ddmmyyyy;
          date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
      }
    }
    
    // Final check if date is still invalid
    if (isNaN(date.getTime())) {
      console.warn('Unable to parse date:', dateString);
      return 'Invalid Date';
    }
    
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'
    ];
    
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    
    // Validate the extracted values
    if (!month || isNaN(day) || isNaN(year)) {
      console.warn('Invalid date components:', { month, day, year, original: dateString });
      return 'Invalid Date';
    }
    
    return `${month} ${day}, ${year}`;
  } catch (error) {
    console.error('Error formatting date:', error, 'Original:', dateString);
    return 'Error parsing date';
  }
};

/**
 * Get the best available date from a record object
 * Prioritizes API/database fields over frontend calculations
 * Based on MongoDB structure: local_date (main) -> structured_summary.date (fallback)
 */
export const getRecordDate = (record: any): string => {
  if (!record) return 'No Date Available';
  
  // Priority 1: local_date from main document (most reliable API field)
  if (record.local_date) {
    return formatDate(record.local_date);
  }
  
  // Priority 2: date from structured_summary (AI processed date)
  if (record.structuredSummary?.date) {
    return formatDate(record.structuredSummary.date);
  }
  
  // Priority 3: date field from main document
  if (record.date) {
    return formatDate(record.date);
  }
  
  // Priority 4: created_at timestamp (fallback)
  if (record.created_at) {
    return formatDate(record.created_at);
  }
  
  // Priority 5: Other timestamp fields
  const fallbackFields = ['timestamp', 'recorded_at', 'date_created', 'updated_at'];
  for (const field of fallbackFields) {
    if (record[field]) {
      return formatDate(record[field]);
    }
  }
  
  return 'No Date Available';
};

/**
 * Get raw date value for API calls or internal processing
 * Returns the first available date field without formatting
 * Prioritizes API/database fields over frontend calculations
 */
export const getRawRecordDate = (record: any): string | null => {
  if (!record) return null;
  
  // Priority 1: local_date from main document (most reliable API field)
  if (record.local_date) {
    return record.local_date;
  }
  
  // Priority 2: date from structured_summary (AI processed date)
  if (record.structuredSummary?.date) {
    return record.structuredSummary.date;
  }
  
  // Priority 3: date field from main document
  if (record.date) {
    return record.date;
  }
  
  // Priority 4: created_at timestamp (fallback)
  if (record.created_at) {
    return record.created_at;
  }
  
  // Priority 5: Other timestamp fields
  const fallbackFields = ['timestamp', 'recorded_at', 'date_created', 'updated_at'];
  for (const field of fallbackFields) {
    if (record[field]) {
      return record[field];
    }
  }
  
  return null;
};
