import { useState, useMemo, useCallback, ReactNode } from 'react';
import {
  Paper,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  Checkbox,
  TextField,
  Button,
  Typography,
  Skeleton,
  InputAdornment,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { MaterialSymbol } from './MaterialSymbol';

// ── Public types ──────────────────────────────────────────────────────

export interface DataColumn<T> {
  /** Property key on the row object */
  id: keyof T;
  /** Column header label */
  label: string;
  /** Fixed width (px) */
  width?: number;
  /** Cell alignment */
  align?: 'left' | 'center' | 'right';
  /** Custom cell renderer */
  format?: (value: T[keyof T], row: T) => ReactNode;
  /** Whether the column is sortable (default false) */
  sortable?: boolean;
}

export interface DataTableProps<T> {
  columns: DataColumn<T>[];
  data: T[];
  /** Unique key extractor – defaults to (row as any).id */
  getRowId?: (row: T) => string | number;
  loading?: boolean;
  onRowClick?: (row: T) => void;
  /** Show checkboxes for row selection */
  selectable?: boolean;
  /** Show search bar */
  searchable?: boolean;
  /** Show export button */
  exportable?: boolean;
  /** Called when selection changes */
  onSelectionChange?: (selectedIds: Set<string | number>) => void;
  /** Title rendered above the table */
  title?: string;
  /** Empty state message */
  emptyMessage?: string;
  /** Rows per page options */
  rowsPerPageOptions?: number[];
  /** Default rows per page */
  defaultRowsPerPage?: number;
  /** Maximum table height in px (enables sticky header) */
  maxHeight?: number;
}

// ── Comparator helpers ────────────────────────────────────────────────

function descendingComparator<T>(a: T, b: T, orderBy: keyof T): number {
  const va = a[orderBy];
  const vb = b[orderBy];
  if (vb < va) return -1;
  if (vb > va) return 1;
  return 0;
}

function getComparator<T>(
  order: 'asc' | 'desc',
  orderBy: keyof T,
): (a: T, b: T) => number {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

// ── Component ─────────────────────────────────────────────────────────

export function DataTable<T>({
  columns,
  data,
  getRowId,
  loading = false,
  onRowClick,
  selectable = false,
  searchable = false,
  exportable = false,
  onSelectionChange,
  title,
  emptyMessage = 'No data available',
  rowsPerPageOptions = [5, 10, 25],
  defaultRowsPerPage = 10,
  maxHeight = 600,
}: DataTableProps<T>) {
  const theme = useTheme();

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  const [orderBy, setOrderBy] = useState<keyof T | null>(null);
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Row id helper
  const rowId = useCallback(
    (row: T): string | number =>
      getRowId ? getRowId(row) : (row as Record<string, unknown>).id as string | number,
    [getRowId],
  );

  // ── Filtering ───────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const val = row[col.id];
        return val != null && String(val).toLowerCase().includes(q);
      }),
    );
  }, [data, searchQuery, columns]);

  // ── Sorting ─────────────────────────────────────────────────────────
  const sortedData = useMemo(() => {
    if (!orderBy) return filteredData;
    return [...filteredData].sort(getComparator(order, orderBy));
  }, [filteredData, order, orderBy]);

  // ── Pagination ──────────────────────────────────────────────────────
  const paginatedData = useMemo(
    () => sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [sortedData, page, rowsPerPage],
  );

  // ── Handlers ─────────────────────────────────────────────────────────
  const handleSort = (colId: keyof T) => {
    const isAsc = orderBy === colId && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(colId);
  };

  const handleSelectAll = () => {
    if (selected.size === filteredData.length) {
      setSelected(new Set());
      onSelectionChange?.(new Set());
    } else {
      const all = new Set(filteredData.map((r) => rowId(r)));
      setSelected(all);
      onSelectionChange?.(all);
    }
  };

  const handleSelectRow = (id: string | number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
    onSelectionChange?.(next);
  };

  const handleExport = () => {
    const header = columns.map((c) => c.label).join(',');
    const rows = filteredData.map((row) =>
      columns
        .map((col) => {
          const v = row[col.id];
          const s = v == null ? '' : String(v);
          return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(','),
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title ?? 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const colSpan = columns.length + (selectable ? 1 : 0);

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      {/* Header row: title + search + export */}
      {(title || searchable || exportable) && (
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          {title && (
            <Typography variant="h6" sx={{ flexShrink: 0 }}>
              {title}
            </Typography>
          )}
          {searchable && (
            <TextField
              size="small"
              placeholder="Search…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <MaterialSymbol icon="search" size={20} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ flexGrow: 1 }}
            />
          )}
          {exportable && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<MaterialSymbol icon="download" size={18} />}
              onClick={handleExport}
            >
              Export
            </Button>
          )}
        </Box>
      )}

      {/* Table */}
      <TableContainer sx={{ maxHeight }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selected.size > 0 && selected.size < filteredData.length}
                    checked={filteredData.length > 0 && selected.size === filteredData.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
              )}
              {columns.map((col) => (
                <TableCell
                  key={String(col.id)}
                  align={col.align}
                  style={{ width: col.width }}
                >
                  {col.sortable !== false ? (
                    <TableSortLabel
                      active={orderBy === col.id}
                      direction={orderBy === col.id ? order : 'asc'}
                      onClick={() => handleSort(col.id)}
                    >
                      {col.label}
                    </TableSortLabel>
                  ) : (
                    col.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              Array.from({ length: rowsPerPage }).map((_, i) => (
                <TableRow key={`skel-${i}`}>
                  {selectable && (
                    <TableCell padding="checkbox">
                      <Skeleton variant="rectangular" width={20} height={20} />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell key={String(col.id)}>
                      <Skeleton variant="text" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colSpan} align="center" sx={{ py: 6 }}>
                  <MaterialSymbol icon="search_off" size={40} color={theme.palette.text.disabled} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {emptyMessage}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row) => {
                const id = rowId(row);
                const isSelected = selected.has(id);
                return (
                  <TableRow
                    key={String(id)}
                    hover
                    selected={isSelected}
                    onClick={() => onRowClick?.(row)}
                    sx={{
                      cursor: onRowClick ? 'pointer' : 'default',
                      ...(isSelected && {
                        backgroundColor: alpha(theme.palette.primary.main, 0.08),
                      }),
                    }}
                  >
                    {selectable && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectRow(id);
                          }}
                        />
                      </TableCell>
                    )}
                    {columns.map((col) => (
                      <TableCell key={String(col.id)} align={col.align}>
                        {col.format
                          ? col.format(row[col.id], row)
                          : row[col.id] != null
                            ? String(row[col.id])
                            : ''}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        component="div"
        count={filteredData.length}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={rowsPerPageOptions}
      />
    </Paper>
  );
}

export default DataTable;

