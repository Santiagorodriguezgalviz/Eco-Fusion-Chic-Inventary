"use client"

import type React from "react"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, FileDown } from "lucide-react"
import { Pagination } from "@/components/ui/pagination"

interface DataTableProps<T> {
  data: T[]
  columns: {
    header: string
    accessorKey: keyof T | ((row: T) => any)
    cell?: (row: T) => React.ReactNode
  }[]
  searchKey?: keyof T | ((row: T) => string)
  onRowClick?: (row: T) => void
  actions?: (row: T) => React.ReactNode
  onExport?: () => void
  exportLabel?: string
  noDataMessage?: string
}

export function DataTable<T>({
  data,
  columns,
  searchKey,
  onRowClick,
  actions,
  onExport,
  exportLabel = "Exportar",
  noDataMessage = "No se encontraron registros",
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchTerm, setSearchTerm] = useState("")

  // Filter data based on search term
  const filteredData = searchKey
    ? data.filter((item) => {
        if (typeof searchKey === "function") {
          return searchKey(item).toLowerCase().includes(searchTerm.toLowerCase())
        }

        const value = item[searchKey]
        if (typeof value === "string") {
          return value.toLowerCase().includes(searchTerm.toLowerCase())
        }
        if (typeof value === "number") {
          return value.toString().includes(searchTerm)
        }
        return false
      })
    : data

  // Calculate pagination
  const totalItems = filteredData.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  // Ensure current page is valid after filtering or changing page size
  if (currentPage > totalPages) {
    setCurrentPage(totalPages)
  }

  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalItems)
  const paginatedData = filteredData.slice(startIndex, endIndex)

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Handle page size change
  const handlePageSizeChange = (size: number) => {
    setPageSize(size)
    setCurrentPage(1) // Reset to first page when changing page size
  }

  // Get value from row using accessorKey
  const getValue = (row: T, accessorKey: keyof T | ((row: T) => any)) => {
    if (typeof accessorKey === "function") {
      return accessorKey(row)
    }
    return row[accessorKey]
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {searchKey && (
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1) // Reset to first page on search
              }}
              className="pl-8 border-emerald-200 focus-visible:ring-emerald-500"
            />
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {onExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="flex items-center gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              <FileDown className="h-4 w-4" />
              {exportLabel}
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-lg overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-emerald-50">
              <TableRow>
                {columns.map((column, index) => (
                  <TableHead key={index} className="text-emerald-800 font-semibold">
                    {column.header}
                  </TableHead>
                ))}
                {actions && <TableHead className="w-[100px] text-emerald-800 font-semibold">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + (actions ? 1 : 0)} className="h-24 text-center">
                    {noDataMessage}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, rowIndex) => (
                  <TableRow
                    key={rowIndex}
                    className={onRowClick ? "cursor-pointer hover:bg-emerald-50/50 transition-colors" : ""}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {columns.map((column, colIndex) => (
                      <TableCell key={colIndex}>
                        {column.cell ? column.cell(row) : getValue(row, column.accessorKey)}
                      </TableCell>
                    ))}
                    {actions && <TableCell className="text-right">{actions(row)}</TableCell>}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {totalItems > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
    </div>
  )
}
