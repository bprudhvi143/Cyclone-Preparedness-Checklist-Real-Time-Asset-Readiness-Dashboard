import React, { useState } from "react";
import { ArrowUpDown, ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import Button from "./Button";
import EmptyState from "./EmptyState";

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  searchField?: keyof T | string;
  exportFileName?: string;
  actions?: React.ReactNode;
  defaultSortBy?: keyof T | string;
}

export function Table<T extends Record<string, any>>({
  columns,
  data,
  searchPlaceholder = "Search...",
  searchField,
  exportFileName = "table-export",
  actions,
  defaultSortBy,
}: TableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [sortBy, setSortBy] = useState<string | null>(defaultSortBy ? String(defaultSortBy) : null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // 1. Filter Data
  const filteredData = React.useMemo(() => {
    if (!searchTerm || !searchField) return data;
    return data.filter((row) => {
      const val = row[searchField as string];
      if (val === undefined || val === null) return false;
      return String(val).toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [data, searchTerm, searchField]);

  // 2. Sort Data
  const sortedData = React.useMemo(() => {
    if (!sortBy) return filteredData;
    const sorted = [...filteredData].sort((a, b) => {
      const valA = a[sortBy];
      const valB = b[sortBy];
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredData, sortBy, sortOrder]);

  // 3. Paginate Data
  const paginatedData = React.useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return sortedData.slice(startIdx, startIdx + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
  };

  const handleExportCSV = () => {
    if (data.length === 0) return;
    const csvHeaders = columns.map((col) => col.header).join(",");
    const csvRows = data.map((row) =>
      columns
        .map((col) => {
          const val = row[col.key as string];
          const stringVal = val !== undefined && val !== null ? String(val) : "";
          // Escape quotes and wrap in quotes if commas exist
          return `"${stringVal.replace(/"/g, '""')}"`;
        })
        .join(",")
    );
    const csvContent = "data:text/csv;charset=utf-8," + [csvHeaders, ...csvRows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${exportFileName}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Table Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {searchField ? (
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset page to 1
              }}
              className="pl-9 pr-4 py-2 w-full text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
          {actions}
          <Button variant="outline" size="sm" icon={<Download className="h-4 w-4" />} onClick={handleExportCSV}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* Actual Data Table */}
      <div className="overflow-x-auto border border-slate-100 rounded-xl bg-white shadow-soft">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50/50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key as string}
                  className={`px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider ${
                    col.sortable ? "cursor-pointer select-none hover:text-slate-700" : ""
                  }`}
                  onClick={() => col.sortable && handleSort(col.key as string)}
                >
                  <div className="flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && <ArrowUpDown className="h-3 w-3 text-slate-400" />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {paginatedData.length > 0 ? (
              paginatedData.map((row, rowIdx) => (
                <tr key={row.id || rowIdx} className="hover:bg-slate-50/30 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key as string} className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                      {col.render ? col.render(row) : row[col.key as string]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12">
                  <EmptyState title="No matching records" description="Try adjusting your keywords or filters." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <span className="text-xs text-slate-400">
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} records
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNum = idx + 1;
              const isCurrent = currentPage === pageNum;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`h-8 w-8 text-xs font-semibold rounded-lg border transition-all ${
                    isCurrent
                      ? "bg-primary text-white border-primary"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
export default Table;
