'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GraduationCap, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            toast.error('Las contraseñas no coinciden')
            return
        }

        if (password.length < 6) {
            toast.error('La contraseña debe tener al menos 6 caracteres')
            return
        }

        setLoading(true)
        const supabase = createClient()
        const { error } = await supabase.auth.updateUser({ password })

        if (error) {
            toast.error('Error al actualizar la contraseña', { description: error.message })
            setLoading(false)
            return
        }

        toast.success('Contraseña actualizada correctamente')
        router.push('/login')
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-surface">
            <div className="w-full max-w-[400px] animate-fade-in text-center">
                <div className="flex items-center gap-3 mb-8 justify-center">
                    <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center">
                        <GraduationCap className="w-7 h-7 text-white" />
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-text-primary mb-1">Nueva Contraseña</h2>
                <p className="text-text-secondary mb-8">Ingresa tu nueva clave de acceso</p>

                <form onSubmit={handleReset} className="space-y-4">
                    {/* Password */}
                    <div className="relative text-left">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Nueva contraseña"
                            required
                            className="w-full pl-11 pr-12 py-3 bg-surface-secondary border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>

                    {/* Confirm Password */}
                    <div className="relative text-left">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirmar contraseña"
                            required
                            className="w-full pl-11 pr-12 py-3 bg-surface-secondary border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary-600/25 hover:shadow-primary-600/40"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                Actualizar Contraseña
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}
