"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Edit, Trash2, Plus, Calendar } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, formatDateTime, getDateRange } from "@/lib/utils/date"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { useToast } from "@/components/ui/use-toast"
import { useNotifications } from "@/components/ui/notifications"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { useRealtimeSubscription } from "@/lib/supabase/realtime"

interface Expense {
  id: string
  description: string
  amount: number
  created_at: string
  category: string
}

export function ExpensesTable({
  initialExpenses,
  initialFilter = "all",
}: {
  initialExpenses: Expense[]
  initialFilter?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { addNotification } = useNotifications()
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses || [])
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null)
  const [activeFilter, setActiveFilter] = useState<"all" | "today" | "week" | "month">(
    initialFilter === "today" ? "today" : (initialFilter as "all" | "today" | "week" | "month"),
  )
  
  const supabase = createClient()

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return
    
    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", expenseToDelete.id)
        
      if (error) throw error
      
      // Update local state
      setExpenses((prev) => prev.filter((expense) => expense.id !== expenseToDelete.id))
      
      toast({
        title: "Gasto eliminado",
        description: "El gasto ha sido eliminado correctamente",
      })
      
      addNotification(
        "Gasto eliminado",
        `El gasto "${expenseToDelete.description}" ha sido eliminado`,
        "success"
      )
    } catch (error) {
      console.error("Error deleting expense:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el gasto",
        variant: "destructive",
      })
    } finally {
      setShowDeleteDialog(false)
      setExpenseToDelete(null)
    }
  }

  // Cargar gastos directamente desde Supabase al inicio
  useEffect(() => {
    const loadExpenses = async () => {
      try {
        // Aplicar filtro de fecha si es necesario
        let query = supabase.from("expenses").select('*')

        if (activeFilter !== "all") {
          const { start, end } = getDateRange(activeFilter as "day" | "week" | "month")
          console.log("Filtrando por fecha:", { start, end, activeFilter })
          query = query.gte("created_at", start).lte("created_at", end)
        }

        const { data, error } = await query.order("created_at", { ascending: false })

        if (error) {
          throw error
        }

        setExpenses(data)
      } catch (error) {
        console.error("Error loading expenses:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los gastos",
          variant: "destructive",
        })
      }
    }

    // Solo cargar si no hay gastos iniciales o si cambia el filtro
    if (!initialExpenses || initialExpenses.length === 0 || activeFilter !== initialFilter) {
      loadExpenses()
    }
  }, [activeFilter, supabase, toast, initialExpenses, initialFilter])

  // Actualizar la URL cuando cambia el filtro
  useEffect(() => {
    if (activeFilter !== initialFilter) {
      const params = new URLSearchParams(searchParams.toString())
      if (activeFilter === "all") {
        params.delete("filter")
      } else {
        params.set("filter", activeFilter)
      }
      router.push(`/expenses?${params.toString()}`)
    }
  }, [activeFilter, router, searchParams, initialFilter])

  // Suscripción en tiempo real a cambios en gastos
  useRealtimeSubscription({
    table: "expenses",
    event: ["INSERT", "UPDATE", "DELETE"],
    onEvent: (payload) => {
      if (payload.eventType === "INSERT") {
        // Verificar si el nuevo gasto cumple con el filtro actual
        if (activeFilter !== "all") {
          const { start, end } = getDateRange(activeFilter as "day" | "week" | "month")
          const expenseDate = new Date(payload.new.created_at)
          const startDate = new Date(start)
          const endDate = new Date(end)

          if (expenseDate < startDate || expenseDate > endDate) {
            return
          }
        }

        // Añadir el nuevo gasto al estado
        setExpenses((prev) => [payload.new, ...prev])
        addNotification(
          "Nuevo gasto registrado",
          `Se ha registrado el gasto "${payload.new.description}"`,
          "success",
        )
      } else if (payload.eventType === "UPDATE") {
        // Actualizar el gasto en el estado
        setExpenses((prev) => 
          prev.map((expense) => (expense.id === payload.new.id ? payload.new : expense))
        )
      } else if (payload.eventType === "DELETE") {
        // Eliminar el gasto del estado
        setExpenses((prev) => prev.filter((expense) => expense.id !== payload.old.id))
      }
    },
  })

  const columns = [
    {
      header: "Descripción",
      accessorKey: "description" as keyof Expense,
    },
    {
      header: "Categoría",
      accessorKey: "category" as keyof Expense,
    },
    {
      header: "Fecha",
      accessorKey: "created_at" as keyof Expense,
      cell: (row: Expense) => {
        const date = new Date(row.created_at)
        return (
          <div className="whitespace-nowrap">
            <div>{date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
            <div className="text-xs text-gray-500">{date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        )
      },
    },
    {
      header: "Monto",
      accessorKey: "amount" as keyof Expense,
      cell: (row: Expense) => formatCurrency(row.amount),
    },
  ]

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h2 className="text-xl font-bold">Gastos</h2>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-md border border-input overflow-hidden shadow-sm">
            <Button
              variant={activeFilter === "all" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveFilter("all")}
              className="rounded-none border-r"
            >
              Todos
            </Button>
            <Button
              variant={activeFilter === "today" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveFilter("today")}
              className="rounded-none border-r"
            >
              Hoy
            </Button>
            <Button
              variant={activeFilter === "week" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveFilter("week")}
              className="rounded-none border-r"
            >
              Semana
            </Button>
            <Button
              variant={activeFilter === "month" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveFilter("month")}
              className="rounded-none"
            >
              Mes
            </Button>
          </div>
          <Button asChild variant="primary" className="bg-primary text-primary-foreground hover:bg-primary/90">
            <a href="/expenses/new">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo gasto
            </a>
          </Button>
        </div>
      </div>

      <DataTable
        data={expenses}
        columns={columns}
        searchKey="description"
        onRowClick={(row) => router.push(`/expenses/${row.id}`)}
        actions={(row) => (
          <div className="flex justify-end gap-2">
            <Button 
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                router.push(`/expenses/${row.id}/edit`)
              }}
            >
              <Edit className="h-4 w-4" />
              <span className="sr-only">Editar gasto</span>
            </Button>
            <Button 
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                setExpenseToDelete(row)
                setShowDeleteDialog(true)
              }}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Eliminar gasto</span>
            </Button>
          </div>
        )}
        exportLabel="Exportar gastos"
      />

      {/* Diálogo de confirmación para eliminar gasto */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Estás seguro?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente
              el gasto y todos sus datos asociados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteExpense}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}