import { createClient } from "@/lib/supabase/client"

// Store login attempts in memory
let loginAttempts = 0
let lastLoginAttempt = 0
const COOLDOWN_DURATION = 30000 // 30 seconds in milliseconds
const MAX_ATTEMPTS = 5

export async function signIn(email: string, password: string) {
  const supabase = createClient()
  
  // Check if we're in a cooldown period
  const now = Date.now()
  if (loginAttempts >= MAX_ATTEMPTS && now - lastLoginAttempt < COOLDOWN_DURATION) {
    const remainingTime = Math.ceil((COOLDOWN_DURATION - (now - lastLoginAttempt)) / 1000)
    throw new Error(`Demasiados intentos. Por favor espera ${remainingTime} segundos.`)
  }
  
  // Clear any existing sessions to avoid token conflicts
  await supabase.auth.signOut()
  
  try {
    // Attempt to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      // Track failed attempts
      loginAttempts++
      lastLoginAttempt = now
      
      // Handle rate limit errors
      if (error.message.includes("rate limit") || error.status === 429) {
        loginAttempts = MAX_ATTEMPTS
        throw new Error("Has excedido el límite de intentos. Por favor espera antes de intentar nuevamente.")
      }
      
      throw error
    }
    
    // Reset attempts on successful login
    loginAttempts = 0
    return data
  } catch (error) {
    throw error
  }
}

export async function signOut() {
  const supabase = createClient()
  return await supabase.auth.signOut()
}

export async function getSession() {
  const supabase = createClient()
  return await supabase.auth.getSession()
}