"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { AuthForm } from "@/components/auth-form"

export default function LoginPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push("/")
    }
  }, [user, loading, router])

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>

  return (
    <div className="flex items-center justify-center min-h-screen bg-background dark">
      <AuthForm type="login" />
    </div>
  )
}
