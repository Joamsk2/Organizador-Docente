'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GraduationCap, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function RegisterPage() {
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const supabase = createClient()
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName },
            },
        })

        if (error) {
            toast.error('Error al registrarse', { description: error.message })
            setLoading(false)
            return
        }

        toast.success('¡Cuenta creada!', { description: 'Revisá tu email para confirmar tu cuenta.' })
        router.push('/login')
    }

    return (
        <>
            {/* Left Panel */}
            <div className="hidden lg:flex lg:w-[55%] bg-gradient-to-br from-primary-700 via-primary-600 to-blue-600 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
                </div>
                <div className="relative z-10 flex flex-col justify-center px-16 xl:px-24 text-white">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                            <GraduationCap className="w-8 h-8" />
                        </div>
                    </div>
                    <h1 className="text-4xl xl:text-5xl font-bold mb-4 leading-tight">
                        Empezá a<br />organizar tu<br />docencia
                    </h1>
                    <p className="text-lg text-white/80 max-w-md">
                        Creá tu cuenta gratuita y gestioná todas tus escuelas, cursos y alumnos desde un solo lugar.
                    </p>
                </div>
            </div>

            {/* Right Panel */}
            <div className="flex-1 flex items-center justify-center p-6 bg-surface">
                <div className="w-full max-w-[400px] animate-fade-in">
                    <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
                        <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
                            <GraduationCap className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-bold text-text-primary">Organizador Docente</span>
                    </div>

                    <h2 className="text-2xl font-bold text-text-primary mb-1">Crear Cuenta</h2>
                    <p className="text-text-secondary mb-8">Completá tus datos para empezar</p>

                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Tu nombre completo"
                                required
                                className="w-full pl-11 pr-4 py-3 bg-surface-secondary border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                            />
                        </div>

                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="tucorreo@escuela.edu.ar"
                                required
                                className="w-full pl-11 pr-4 py-3 bg-surface-secondary border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                            />
                        </div>

                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Mínimo 6 caracteres"
                                required
                                minLength={6}
                                className="w-full pl-11 pr-4 py-3 bg-surface-secondary border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary-600/25"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Crear Cuenta
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="text-center text-sm text-text-secondary mt-6">
                        ¿Ya tenés cuenta?{' '}
                        <Link href="/login" className="text-primary-600 hover:text-primary-700 font-semibold transition-colors">
                            Iniciá sesión
                        </Link>
                    </p>
                </div>
            </div>
        </>
    )
}
