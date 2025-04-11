"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Edit, MoreHorizontal, Plus, Trash, Filter } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency } from "@/lib/utils/date"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import { useNotifications } from "@/components/ui/notifications"
import { generateInventoryReportPDF, downloadPDF } from "@/lib/services/pdf-service"
import { useRealtimeSubscription } from "@/lib/supabase/realtime"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface Product {
  id: string
  name: string
  category: string
  price: number
  cost_price: number
  stock?: number // Add stock to the Product interface
  inventory: {
    size: string
    stock: number
  }[]
}

export function ProductTable({ initialProducts }: { initialProducts: Product[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const { addNotification } = useNotifications()
  const [products, setProducts] = useState<Product[]>(initialProducts || [])
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null)
  const [showFiltersDialog, setShowFiltersDialog] = useState(false)
  const [filters, setFilters] = useState({
    category: "",
    lowStock: false,
    priceRange: {
      min: "",
      max: "",
    },
  })
  const supabase = createClient()

  // Función para obtener los detalles completos de un producto
  const fetchProductDetails = async (productId: string): Promise<Product | null> => {
    try {
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("id, name, category, price, cost_price, stock") // Add stock to the query
        .eq("id", productId)
        .single()

      if (productError) throw productError

      // Get inventory for the product
      const { data: inventoryData, error: inventoryError } = await supabase
        .from("inventory")
        .select("stock, sizes(name)")
        .eq("product_id", productId)

      if (inventoryError) throw inventoryError

      // Corregir el acceso a la propiedad sizes.name
      const inventory = inventoryData.map((item: any) => ({
        size: item.sizes?.name || 'Sin talla',
        stock: item.stock,
      }))

      return {
        ...productData,
        inventory,
      }
    } catch (error) {
      console.error("Error fetching product details:", error)
      return null
    }
  }

  // Suscripción en tiempo real a cambios en productos
  useRealtimeSubscription({
    table: "products",
    event: ["INSERT", "UPDATE", "DELETE"],
    onEvent: (payload) => {
      if (payload.eventType === "INSERT") {
        // Obtener el producto completo con su inventario
        fetchProductDetails(payload.new.id).then((newProduct) => {
          if (newProduct) {
            setProducts((prev) => [newProduct, ...prev])
            addNotification(
              "Nuevo producto añadido",
              `Se ha añadido el producto "${newProduct.name}" al inventario`,
              "success",
            )
          }
        })
      } else if (payload.eventType === "UPDATE") {
        // Actualizar el producto en el estado
        fetchProductDetails(payload.new.id).then((updatedProduct) => {
          if (updatedProduct) {
            setProducts((prev) => prev.map((product) => (product.id === updatedProduct.id ? updatedProduct : product)))
          }
        })
      } else if (payload.eventType === "DELETE") {
        // Eliminar el producto del estado
        setProducts((prev) => prev.filter((product) => product.id !== payload.old.id))
      }
    },
  })

  // Suscripción en tiempo real a cambios en inventario
  // Fix for the realtime subscription payload typing
  useRealtimeSubscription({
    table: "inventory",
    event: ["INSERT", "UPDATE", "DELETE"],
    onEvent: (payload) => {
      // Actualizar el producto relacionado
      if (payload.new && 'product_id' in payload.new || payload.old && 'product_id' in payload.old) {
        const productId = (payload.new && 'product_id' in payload.new) 
          ? payload.new.product_id 
          : (payload.old && 'product_id' in payload.old) 
            ? payload.old.product_id 
            : null;
            
        if (productId) {
          fetchProductDetails(productId).then((updatedProduct) => {
            if (updatedProduct) {
              setProducts((prev) => prev.map((product) => (product.id === updatedProduct.id ? updatedProduct : product)))
  
              // Notificar si el stock es bajo
              if (payload.eventType === "UPDATE" && 'stock' in payload.new && payload.new.stock < 5) {
                const product = products.find((p) => p.id === productId)
                if (product) {
                  addNotification(
                    "Stock bajo",
                    `El producto "${product.name}" tiene stock bajo (${payload.new.stock} unidades)`,
                    "warning",
                  )
                }
              }
            }
          })
        }
      }
    }
  })

  // Aplicar filtros a los productos
  useEffect(() => {
    if (!initialProducts) return

    let filteredProducts = [...initialProducts]

    // Filtrar por categoría
    if (filters.category) {
      filteredProducts = filteredProducts.filter((product) => product.category === filters.category)
    }

    // Filtrar por stock bajo
    if (filters.lowStock) {
      filteredProducts = filteredProducts.filter(
        (product) => product.inventory && product.inventory.some((item) => item.stock < 5),
      )
    }

    // Filtrar por rango de precios
    if (filters.priceRange.min) {
      const minPrice = Number.parseFloat(filters.priceRange.min)
      filteredProducts = filteredProducts.filter((product) => product.price >= minPrice)
    }

    if (filters.priceRange.max) {
      const maxPrice = Number.parseFloat(filters.priceRange.max)
      filteredProducts = filteredProducts.filter((product) => product.price <= maxPrice)
    }

    setProducts(filteredProducts)
  }, [filters, initialProducts])

  const handleDelete = async () => {
    if (!deleteProductId) return

    try {
      const { error } = await supabase.from("products").delete().eq("id", deleteProductId)

      if (error) throw error

      addNotification("Producto eliminado", "El producto ha sido eliminado exitosamente", "success")

      router.refresh()
    } catch (error) {
      console.error("Error deleting product:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al eliminar el producto",
        variant: "destructive",
      })
    } finally {
      setDeleteProductId(null)
    }
  }

  const handleExportInventory = () => {
    const doc = generateInventoryReportPDF(products)
    downloadPDF(doc, `inventario-${new Date().toISOString().split("T")[0]}.pdf`)

    addNotification("Inventario exportado", "El reporte de inventario ha sido descargado correctamente", "success")
  }

  const handleApplyFilters = () => {
    setShowFiltersDialog(false)
  }

  const handleResetFilters = () => {
    setFilters({
      category: "",
      lowStock: false,
      priceRange: {
        min: "",
        max: "",
      },
    })
    setShowFiltersDialog(false)
  }

  // Obtener categorías únicas para el filtro
  const categories = Array.from(new Set(initialProducts ? initialProducts.map((product) => product.category) : []))

  // Fix for the columns type issue
  const columns: {
    header: string;
    accessorKey: keyof Product | ((row: Product) => any);
    cell?: ((row: Product) => React.ReactNode);
  }[] = [
    {
      header: "Nombre",
      accessorKey: "name",
      cell: (row: Product) => <span className="font-medium">{row.name}</span>,
    },
    {
      header: "Categoría",
      accessorKey: "category",
    },
    {
      header: "Precio",
      accessorKey: "price",
      cell: (row: Product) => formatCurrency(row.price),
    },
    {
      header: "Costo",
      accessorKey: "cost_price",
      cell: (row: Product) => formatCurrency(row.cost_price),
    },
    {
      header: "Stock",
      accessorKey: "stock",
      cell: (row: Product) => (
        <div className="flex flex-wrap gap-1">
          <span
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
              (row.stock || 0) < 5 ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
            }`}
          >
            {row.stock || 0}
          </span>
        </div>
      ),
    },
    // Removed the "Tallas / Stock" column
  ];

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h2 className="text-xl font-bold">Inventario</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFiltersDialog(true)}
            className="flex items-center gap-1"
          >
            <Filter className="h-4 w-4" />
            Filtros
            {(filters.category || filters.lowStock || filters.priceRange.min || filters.priceRange.max) && (
              <span className="ml-1 flex h-2 w-2 rounded-full bg-emerald-600"></span>
            )}
          </Button>
          <Button asChild>
            <Link href="/inventory/new">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo producto
            </Link>
          </Button>
        </div>
      </div>

      <DataTable
        data={products}
        columns={columns}
        searchKey="name"
        actions={(row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Acciones</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/inventory/${row.id}`} className="flex items-center">
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600" onClick={() => setDeleteProductId(row.id)}>
                <Trash className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        exportLabel="Exportar inventario"
        onExport={handleExportInventory}
      />

      {/* Diálogo de confirmación para eliminar producto */}
      <AlertDialog open={!!deleteProductId} onOpenChange={() => setDeleteProductId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el producto y todos los datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de filtros */}
      <Dialog open={showFiltersDialog} onOpenChange={setShowFiltersDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filtrar productos</DialogTitle>
            <DialogDescription>Aplica filtros para encontrar productos específicos.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Select value={filters.category} onValueChange={(value) => setFilters({ ...filters, category: value })}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="lowStock"
                checked={filters.lowStock}
                onCheckedChange={(checked) => setFilters({ ...filters, lowStock: checked as boolean })}
              />
              <Label htmlFor="lowStock">Mostrar solo productos con stock bajo</Label>
            </div>

            <div className="space-y-2">
              <Label>Rango de precios</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="minPrice" className="text-xs">
                    Mínimo
                  </Label>
                  <input
                    id="minPrice"
                    type="number"
                    placeholder="Min"
                    value={filters.priceRange.min}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        priceRange: { ...filters.priceRange, min: e.target.value },
                      })
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="maxPrice" className="text-xs">
                    Máximo
                  </Label>
                  <input
                    id="maxPrice"
                    type="number"
                    placeholder="Max"
                    value={filters.priceRange.max}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        priceRange: { ...filters.priceRange, max: e.target.value },
                      })
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleResetFilters}>
              Restablecer
            </Button>
            <Button onClick={handleApplyFilters}>Aplicar filtros</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
