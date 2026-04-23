'use client'

import { useState, useEffect } from 'react'
import { User, Sun, Moon, Monitor, Palette, Bell, Save, Loader2, Settings2 } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useTeacher } from '@/hooks/use-teacher'
import { getInitials } from '@/lib/utils'

export default function ConfiguracionPage() {
    const { theme, setTheme, systemTheme } = useTheme()
    const { teacher, loading, fetchTeacher, updateTeacher, updatePreferences } = useTeacher()

    // Form states
    const [name, setName] = useState('')
    const [isSavingName, setIsSavingName] = useState(false)

    // Preference states
    const [notificationsEnabled, setNotificationsEnabled] = useState(true)
    const [compactMode, setCompactMode] = useState(false)
    const [isSavingPrefs, setIsSavingPrefs] = useState({
        notifications: false,
        compact: false
    })

    useEffect(() => {
        fetchTeacher()
    }, [fetchTeacher])

    useEffect(() => {
        if (teacher) {
            setName(teacher.full_name || '')
            if (teacher.preferences && typeof teacher.preferences === 'object') {
                const prefs = teacher.preferences as any
                if (prefs.notificationsEnabled !== undefined) setNotificationsEnabled(prefs.notificationsEnabled)
                if (prefs.compactMode !== undefined) setCompactMode(prefs.compactMode)
            }
        }
    }, [teacher])

    const handleSaveName = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim() || name === teacher?.full_name) return
        
        setIsSavingName(true)
        await updateTeacher({ full_name: name.trim() })
        setIsSavingName(false)
    }

    const handleToggleNotification = async () => {
        const newValue = !notificationsEnabled
        setNotificationsEnabled(newValue)
        setIsSavingPrefs(prev => ({ ...prev, notifications: true }))
        await updatePreferences({ notificationsEnabled: newValue })
        setIsSavingPrefs(prev => ({ ...prev, notifications: false }))
    }

    const handleToggleCompact = async () => {
        const newValue = !compactMode
        setCompactMode(newValue)
        setIsSavingPrefs(prev => ({ ...prev, compact: true }))
        await updatePreferences({ compactMode: newValue })
        setIsSavingPrefs(prev => ({ ...prev, compact: false }))
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-100px)]">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        )
    }

    const currentTheme = theme === 'system' ? systemTheme : theme

    return (
        <div className="space-y-12 animate-fade-in max-w-6xl mx-auto pt-8 pb-20 px-4">
            <div className="flex flex-col gap-2 mb-8">
                <h1 className="text-4xl font-black text-text-primary tracking-tighter">Centro de Control</h1>
                <p className="text-text-muted font-bold tracking-tight uppercase text-xs opacity-60">Personalización & Perfil Profesional</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                
                {/* Panel lateral: Navegación de Config */}
                <div className="hidden lg:block lg:col-span-3 space-y-4">
                    <div className="sticky top-8 space-y-2">
                        <button className="w-full flex items-center justify-between px-6 py-4 rounded-[1.5rem] bg-primary-600/10 text-primary-400 font-black text-sm transition-all border border-primary-500/20 group">
                            <div className="flex items-center gap-3">
                                <User className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />
                                <span>Perfil</span>
                            </div>
                            <div className="w-1.5 h-1.5 rounded-full bg-primary-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                        </button>
                        <button className="w-full flex items-center gap-3 px-6 py-4 rounded-[1.5rem] text-text-muted hover:text-text-primary hover:bg-white/5 font-black text-sm transition-all group">
                            <Palette className="w-5 h-5 opacity-40 group-hover:opacity-100 transition-opacity" />
                            <span>Apariencia</span>
                        </button>
                        <button className="w-full flex items-center gap-3 px-6 py-4 rounded-[1.5rem] text-text-muted hover:text-text-primary hover:bg-white/5 font-black text-sm transition-all group">
                            <Settings2 className="w-5 h-5 opacity-40 group-hover:opacity-100 transition-opacity" />
                            <span>Preferencias</span>
                        </button>
                    </div>
                </div>

                {/* Contenido Principal */}
                <div className="lg:col-span-9 space-y-12">
                    
                    {/* -- SECCIÓN PERFIL -- */}
                    <div className="bg-surface-secondary/30 rounded-[3rem] border border-white/5 shadow-2xl backdrop-blur-xl overflow-hidden">
                        <div className="h-32 bg-gradient-to-r from-primary-900/40 via-surface-secondary to-primary-900/40 opacity-50" />
                        
                        <div className="px-10 pb-10 -mt-12 relative">
                            <div className="flex flex-col md:flex-row items-end gap-8 mb-12">
                                <div className="w-32 h-32 bg-surface-secondary rounded-[2.5rem] flex items-center justify-center border-4 border-surface shadow-2xl overflow-hidden group">
                                    <span className="text-4xl font-black text-primary-500 group-hover:scale-110 transition-transform duration-500">
                                        {getInitials(teacher?.full_name || 'Docente')}
                                    </span>
                                </div>
                                <div className="space-y-1 pb-2">
                                    <h3 className="text-3xl font-black text-text-primary tracking-tight">{teacher?.full_name}</h3>
                                    <p className="text-text-muted font-bold opacity-60 flex items-center gap-2">
                                        <Monitor className="w-4 h-4" />
                                        Membresía Profesional
                                    </p>
                                </div>
                            </div>

                            <form onSubmit={handleSaveName} className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-white/5">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1">Nombre Completo</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-6 py-4 bg-white/5 text-text-primary border border-white/5 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:bg-white/10 transition-all font-bold outline-none"
                                        placeholder="Tu nombre y apellido"
                                        required
                                    />
                                </div>
                                
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1">Email Profesional</label>
                                    <input
                                        type="email"
                                        value={teacher?.email || ''}
                                        disabled
                                        className="w-full px-6 py-4 bg-white/5 text-text-muted border border-white/5 rounded-2xl cursor-not-allowed opacity-50 font-bold"
                                    />
                                </div>

                                <div className="md:col-span-2 flex justify-end mt-4">
                                    <button
                                        type="submit"
                                        disabled={isSavingName || name === teacher?.full_name || !name.trim()}
                                        className="flex items-center gap-3 px-8 py-4 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-primary-600/20 disabled:opacity-50 active:scale-95"
                                    >
                                        {isSavingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        <span>Actualizar Perfil</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>


                    {/* -- SECCIÓN APARIENCIA -- */}
                    <div className="bg-surface-secondary/20 rounded-[3rem] p-10 border border-white/5 space-y-8">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                                <Palette className="w-5 h-5 text-indigo-400" />
                            </div>
                            <h2 className="text-2xl font-black text-text-primary tracking-tight">Estética Visual</h2>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <button
                                onClick={() => setTheme('light')}
                                className={`flex flex-col items-center gap-4 p-8 rounded-[2rem] border-2 transition-all duration-500 group ${
                                    theme === 'light' 
                                        ? 'border-primary-500 bg-primary-600/10' 
                                        : 'border-white/5 bg-white/5 hover:border-white/20'
                                }`}
                            >
                                <div className="w-16 h-16 rounded-full bg-amber-400/10 flex items-center justify-center group-hover:rotate-12 transition-transform">
                                    <Sun className="w-8 h-8 text-amber-500" />
                                </div>
                                <span className="font-black text-sm uppercase tracking-widest text-text-primary">Claro</span>
                            </button>

                            <button
                                onClick={() => setTheme('dark')}
                                className={`flex flex-col items-center gap-4 p-8 rounded-[2rem] border-2 transition-all duration-500 group ${
                                    theme === 'dark' 
                                        ? 'border-primary-500 bg-primary-600/10' 
                                        : 'border-white/5 bg-white/5 hover:border-white/20'
                                }`}
                            >
                                <div className="w-16 h-16 rounded-full bg-indigo-400/10 flex items-center justify-center group-hover:-rotate-12 transition-transform">
                                    <Moon className="w-8 h-8 text-indigo-400" />
                                </div>
                                <span className="font-black text-sm uppercase tracking-widest text-text-primary">Oscuro</span>
                            </button>

                            <button
                                onClick={() => setTheme('system')}
                                className={`flex flex-col items-center gap-4 p-8 rounded-[2rem] border-2 transition-all duration-500 group ${
                                    theme === 'system' 
                                        ? 'border-primary-500 bg-primary-600/10' 
                                        : 'border-white/5 bg-white/5 hover:border-white/20'
                                }`}
                            >
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Monitor className="w-8 h-8 text-text-muted" />
                                </div>
                                <span className="font-black text-sm uppercase tracking-widest text-text-primary">Sistema</span>
                            </button>
                        </div>
                    </div>


                    {/* -- SECCIÓN PREFERENCIAS -- */}
                    <div className="bg-surface-secondary/20 rounded-[3rem] p-10 border border-white/5 space-y-10">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                <Settings2 className="w-5 h-5 text-emerald-400" />
                            </div>
                            <h2 className="text-2xl font-black text-text-primary tracking-tight">Preferencias</h2>
                        </div>
                        
                        <div className="space-y-2">
                            <div className="flex items-center justify-between p-6 bg-white/5 rounded-[2rem] border border-white/5 hover:bg-white/[0.08] transition-colors group">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <Bell className="w-4 h-4 text-emerald-400" />
                                        <h3 className="font-black text-text-primary uppercase tracking-tight text-sm">Notificaciones Inteligentes</h3>
                                    </div>
                                    <p className="text-xs font-bold text-text-muted opacity-60 ml-7">Alertas críticas sobre entregas y alumnos en riesgo.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer"
                                        checked={notificationsEnabled}
                                        onChange={handleToggleNotification}
                                        disabled={isSavingPrefs.notifications}
                                    />
                                    <div className="w-14 h-8 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-text-muted after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-white"></div>
                                    {isSavingPrefs.notifications && <Loader2 className="absolute -left-8 top-2 w-4 h-4 animate-spin text-primary-500" />}
                                </label>
                            </div>

                            <div className="flex items-center justify-between p-6 bg-white/5 rounded-[2rem] border border-white/5 hover:bg-white/[0.08] transition-colors group">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <Monitor className="w-4 h-4 text-indigo-400" />
                                        <h3 className="font-black text-text-primary uppercase tracking-tight text-sm">Interfaz de Alta Densidad</h3>
                                    </div>
                                    <p className="text-xs font-bold text-text-muted opacity-60 ml-7">Optimizar espacios para visualización masiva de datos.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer"
                                        checked={compactMode}
                                        onChange={handleToggleCompact}
                                        disabled={isSavingPrefs.compact}
                                    />
                                    <div className="w-14 h-8 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-text-muted after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary-600 peer-checked:after:bg-white"></div>
                                    {isSavingPrefs.compact && <Loader2 className="absolute -left-8 top-2 w-4 h-4 animate-spin text-primary-500" />}
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
