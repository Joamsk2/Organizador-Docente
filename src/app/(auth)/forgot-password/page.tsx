'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GraduationCap, Mail, ArrowRight, Loader2, CheckCircle, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const supabase = createClient()
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        })

        if (error) {
            toast.error('Error al enviar el correo', { description: error.message })
            setLoading(false)
            return
        }

        setSubmitted(true)
        setLoading(false)
        toast.success('Correo enviado con éxito')
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-surface">
            <div className="w-full max-w-[400px] animate-fade-in text-center">
                <div className="flex items-center gap-3 mb-8 justify-center">
                    <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center">
                        <GraduationCap className="w-7 h-7 text-white" />
                    </div>
                </div>

                {!submitted ? (
                    <>
                        <h2 className="text-2xl font-bold text-text-primary mb-1">Recuperar Contraseña</h2>
                        <p className="text-text-secondary mb-8">Te enviaremos un enlace para restablecerla</p>

                        <form onSubmit={handleReset} className="space-y-4">
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="tucorreo@escuela.edu.ar"
                                    required
                                    className="w-full pl-11 pr-4 py-3 bg-surface-secondary border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
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
                                        Enviar Instrucciones
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/30 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle className="w-8 h-8 text-emerald-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-text-primary mb-2">¡Correo Enviado!</h2>
                        <p className="text-text-secondary mb-8">
                            Revisa tu bandeja de entrada (**{email}**) para continuar con el proceso.
                        </p>
                    </div>
                )}

                <Link 
                    href="/login" 
                    className="mt-8 flex items-center justify-center gap-2 text-sm text-text-secondary hover:text-primary-600 transition-colors font-medium"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Volver al inicio de sesión
                </Link>
            </div>
        </div>
    )
}
