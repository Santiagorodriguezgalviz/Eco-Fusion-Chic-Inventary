import { ExpenseForm } from "@/components/expenses/expense-form"

export default function NewExpensePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Registrar Nuevo Gasto</h1>
      <div className="border rounded-lg p-6 bg-white">
        <ExpenseForm />
      </div>
    </div>
  )
}