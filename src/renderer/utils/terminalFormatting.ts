/**
 * Utility functions for formatting terminal/PowerShell output lines.
 * These colors are intentionally hardcoded for the dark terminal theme
 * and do not follow the app light/dark mode.
 */

export interface TerminalLineStyle {
  color: string;
  fontWeight: string;
}

/**
 * Parse a PowerShell output line and return the appropriate color and font weight.
 */
export function formatTerminalLine(line: string): TerminalLineStyle {
  let color = 'inherit';
  let fontWeight = 'normal';

  if (line.includes('✅') || line.includes('SUCCESS')) {
    color = '#4caf50'; // Green
  } else if (line.includes('❌') || line.includes('ERROR') || line.includes('Failed')) {
    color = '#f44336'; // Red
  } else if (line.includes('⚠️') || line.includes('WARNING') || line.includes('WARN')) {
    color = '#ff9800'; // Orange
  } else if (line.includes('💡') || line.includes('INFO')) {
    color = '#2196f3'; // Blue
  } else if (line.includes('🔍') || line.includes('Checking')) {
    color = '#00bcd4'; // Cyan
  } else if (line.includes('===') || line.includes('---')) {
    color = '#9e9e9e'; // Gray
    fontWeight = 'bold';
  }

  return { color, fontWeight };
}

