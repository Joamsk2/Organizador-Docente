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
        <div className="space-y-8 animate-fade-in max-w-4xl mx-auto pt-4 pb-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-text-primary">Configuración</h1>
                    <p className="text-text-secondary mt-1">Administrá tu perfil y personalizá tu experiencia</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Panel lateral: Navegación de Config - Opcional para expandir en el futuro */}
                <div className="hidden md:block col-span-1 border-r border-border pr-6 space-y-1">
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400 font-medium transition-colors">
                        <User className="w-5 h-5 flex-shrink-0" />
                        <span>Perfil</span>
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-text-secondary hover:bg-surface-hover hover:text-text-primary font-medium transition-colors">
                        <Palette className="w-5 h-5 flex-shrink-0" />
                        <span>Apariencia</span>
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-text-secondary hover:bg-surface-hover hover:text-text-primary font-medium transition-colors">
                        <Settings2 className="w-5 h-5 flex-shrink-0" />
                        <span>Preferencias</span>
                    </button>
                </div>

                {/* Contenido Principal */}
                <div className="col-span-1 md:col-span-2 space-y-8">
                    
                    {/* -- SECCIÓN PERFIL -- */}
                    <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
                        <div className="px-6 py-5 border-b border-border flex items-center gap-3">
                            <User className="w-5 h-5 text-primary-500" />
                            <h2 className="text-lg font-semibold text-text-primary">Perfil de Usuario</h2>
                        </div>
                        <div className="p-6 space-y-6">
                            
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center flex-shrink-0 border-4 border-surface shadow-sm">
                                    <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                                        {getInitials(teacher?.full_name || 'Docente')}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-medium text-text-primary">{teacher?.full_name}</h3>
                                    <p className="text-sm text-text-muted">{teacher?.email}</p>
                                </div>
                            </div>

                            <form onSubmit={handleSaveName} className="space-y-4 pt-4 border-t border-border">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text-primary">Nombre Completo</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-surface-secondary text-text-primary border border-border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                        placeholder="Tu nombre y apellido"
                                        required
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text-primary">Correo Electrónico</label>
                                    <input
                                        type="email"
                                        value={teacher?.email || ''}
                                        disabled
                                        className="w-full px-4 py-2.5 bg-surface-hover text-text-secondary border border-border/50 rounded-xl cursor-not-allowed opacity-70"
                                    />
                                    <p className="text-xs text-text-muted">El correo está vinculado a tu cuenta de acceso y no puede modificarse aquí.</p>
                                </div>

                                <div className="pt-2 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isSavingName || name === teacher?.full_name || !name.trim()}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSavingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        <span>Guardar Cambios</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>


                    {/* -- SECCIÓN APARIENCIA -- */}
                    <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
                        <div className="px-6 py-5 border-b border-border flex items-center gap-3">
                            <Palette className="w-5 h-5 text-indigo-500" />
                            <h2 className="text-lg font-semibold text-text-primary">Apariencia visual</h2>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-text-secondary mb-5">
                                Elegí el tema que prefieras para la interfaz de la aplicación.
                            </p>
                            
                            <div className="grid grid-cols-3 gap-4">
                                {/* Theme Option: Light */}
                                <button
                                    onClick={() => setTheme('light')}
                                    className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                                        theme === 'light' 
                                            ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/10' 
                                            : 'border-border bg-surface hover:border-primary-300'
                                    }`}
                                >
                                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                                        <Sun className="w-5 h-5 text-amber-600" />
                                    </div>
                                    <span className={`text-sm font-medium ${theme === 'light' ? 'text-primary-700 dark:text-primary-400' : 'text-text-primary'}`}>Claro</span>
                                </button>

                                {/* Theme Option: Dark */}
                                <button
                                    onClick={() => setTheme('dark')}
                                    className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                                        theme === 'dark' 
                                            ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/10' 
                                            : 'border-border bg-surface hover:border-primary-300'
                                    }`}
                                >
                                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                                        <Moon className="w-5 h-5 text-slate-300" />
                                    </div>
                                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-primary-700 dark:text-primary-400' : 'text-text-primary'}`}>Oscuro</span>
                                </button>

                                {/* Theme Option: System */}
                                <button
                                    onClick={() => setTheme('system')}
                                    className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                                        theme === 'system' 
                                            ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/10' 
                                            : 'border-border bg-surface hover:border-primary-300'
                                    }`}
                                >
                                    <div className="w-10 h-10 rounded-full bg-surface-hover border border-border flex items-center justify-center">
                                        <Monitor className="w-5 h-5 text-text-secondary" />
                                    </div>
                                    <span className={`text-sm font-medium ${theme === 'system' ? 'text-primary-700 dark:text-primary-400' : 'text-text-primary'}`}>Sistema</span>
                                </button>
                            </div>
                        </div>
                    </div>


                    {/* -- SECCIÓN PREFERENCIAS -- */}
                    <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
                        <div className="px-6 py-5 border-b border-border flex items-center gap-3">
                            <Settings2 className="w-5 h-5 text-emerald-500" />
                            <h2 className="text-lg font-semibold text-text-primary">Preferencias Generales</h2>
                        </div>
                        <div className="p-6 space-y-6">
                            
                            {/* Toggle Item */}
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Bell className="w-4 h-4 text-text-secondary" />
                                        <h3 className="font-medium text-text-primary">Notificaciones del Sistema</h3>
                                    </div>
                                    <p className="text-sm text-text-muted">Recibir alertas sobre entregas cercanas y alumnos en riesgo.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer"
                                        checked={notificationsEnabled}
                                        onChange={handleToggleNotification}
                                        disabled={isSavingPrefs.notifications}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
                                    {isSavingPrefs.notifications && <Loader2 className="absolute -left-6 top-1 w-4 h-4 animate-spin text-text-muted" />}
                                </label>
                            </div>

                            <hr className="border-border" />

                            {/* Toggle Item */}
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Monitor className="w-4 h-4 text-text-secondary" />
                                        <h3 className="font-medium text-text-primary">Modo Vista Compacta</h3>
                                    </div>
                                    <p className="text-sm text-text-muted">Reducir los espacios y fuentes para mostrar más contenido en Tablas y Kanban.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer"
                                        checked={compactMode}
                                        onChange={handleToggleCompact}
                                        disabled={isSavingPrefs.compact}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
                                    {isSavingPrefs.compact && <Loader2 className="absolute -left-6 top-1 w-4 h-4 animate-spin text-text-muted" />}
                                </label>
                            </div>

                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}
