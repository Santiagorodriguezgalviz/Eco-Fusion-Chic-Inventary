import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const data = await request.json()

    // Validar datos mínimos requeridos
    if (!data.title || !data.message || !data.type) {
      return NextResponse.json({ error: "Se requieren title, message y type" }, { status: 400 })
    }

    // Insertar notificación usando el cliente del servidor
    const { data: notification, error } = await supabase
      .from("notifications")
      .insert({
        title: data.title,
        message: data.message,
        type: data.type,
        related_entity_type: data.related_entity_type || null,
        related_entity_id: data.related_entity_id || null,
        priority: data.priority || "medium",
        action_url: data.action_url || null,
        user_id: data.user_id || null,
      })
      .select("*")
      .single()

    if (error) {
      console.error("Error al crear notificación desde API:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(notification)
  } catch (error) {
    console.error("Error en API de notificaciones:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = createClient()

    const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("Error al obtener notificaciones desde API:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error("Error en API de notificaciones:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
