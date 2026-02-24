/**
 * Utility functions for exporting data to various formats
 */

interface TimeseriesData {
  time: string;
  [key: string]: number | string;
}

/**
 * Export timeseries data to CSV format and trigger download
 * @param data - Array of timeseries data points
 * @param filename - Name of the file to download (without extension)
 * @param variableLabel - Label for the variable being exported
 */
export function exportToCSV(
  data: TimeseriesData[],
  filename: string,
  variableLabel: string
): void {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Extract all unique column names (excluding 'time')
  const columns = new Set<string>();
  data.forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (key !== 'time') {
        columns.add(key);
      }
    });
  });

  const columnArray = ['Date/Heure', ...Array.from(columns)];

  // Create CSV header
  const csvRows: string[] = [];
  csvRows.push(columnArray.join(','));

  // Create CSV rows
  data.forEach((row) => {
    const values = [
      row.time,
      ...Array.from(columns).map((col) => {
        const value = row[col];
        return value !== undefined && value !== null ? String(value) : '';
      }),
    ];
    csvRows.push(values.join(','));
  });

  // Create CSV content
  const csvContent = csvRows.join('\n');

  // Create blob and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
