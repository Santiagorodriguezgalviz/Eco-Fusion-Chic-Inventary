"use client"

import { useState } from "react"
import { InventoryHistoryTable } from "./inventory-history-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { History } from "lucide-react"

interface ProductHistoryProps {
  productId: string
  productName: string
}

export function ProductHistory({ productId, productName }: ProductHistoryProps) {
  const [showHistory, setShowHistory] = useState(false)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-xl">Historial de Cambios</CardTitle>
          <CardDescription>Registro de cambios en el inventario para {productName}</CardDescription>
        </div>
        <Button variant={showHistory ? "default" : "outline"} size="sm" onClick={() => setShowHistory(!showHistory)}>
          <History className="mr-2 h-4 w-4" />
          {showHistory ? "Ocultar historial" : "Ver historial"}
        </Button>
      </CardHeader>
      <CardContent>
        {showHistory ? (
          <InventoryHistoryTable productId={productId} />
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <History className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Haz clic en "Ver historial" para mostrar los cambios de inventario de este producto
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
