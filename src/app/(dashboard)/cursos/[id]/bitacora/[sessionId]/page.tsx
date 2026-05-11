'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Users, MessageSquare, BookOpen, KanbanSquare, FileText, Link as LinkIcon, Plus, Save, Trash2 } from 'lucide-react'
import { useClassSessions, type ClassSessionWithDetails, type ClassMaterial } from '@/hooks/use-class-sessions'
import { useCurriculum } from '@/hooks/use-curriculum'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

// Simple Rich Text Editor fallback if the main one is too complex to wire up here initially
function SimpleTextarea({ value, onChange, placeholder }: { value: string, onChange: (v: string) => void, placeholder: string }) {
    return (
        <textarea 
            className="w-full h-32 p-3 bg-surface border border-border rounded-xl text-text-primary focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-y"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
        />
    )
}

export default function CockpitPage({ params }: { params: Promise<{ id: string, sessionId: string }> }) {
    const router = useRouter()
    const { id: courseId, sessionId } = use(params)
    const { sessions, loading, fetchSessions, updateSession, deleteSession, addMaterial, removeMaterial } = useClassSessions(courseId)
    const { modules, fetchCurriculum } = useCurriculum(courseId)
    
    const [session, setSession] = useState<ClassSessionWithDetails | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [notes, setNotes] = useState('')
    const [instructions, setInstructions] = useState('')
    const [showMaterialForm, setShowMaterialForm] = useState(false)
    const [newMaterial, setNewMaterial] = useState({ type: 'file', title: '', content: '' })

    useEffect(() => {
        fetchSessions()
        fetchCurriculum()
    }, [fetchSessions, fetchCurriculum])

    useEffect(() => {
        if (sessions.length > 0) {
            const found = sessions.find(s => s.id === sessionId)
            if (found) {
                setSession(found)
                setNotes(found.teacher_notes || '')
                setInstructions(found.instructions || '')
            }
        }
    }, [sessions, sessionId])

    const handleSave = async () => {
        const ok = await updateSession(sessionId, {
            teacher_notes: notes,
            instructions: instructions
        })
        if (ok) setIsEditing(false)
    }

    const handleAddMaterial = async () => {
        if (!newMaterial.title) return toast.error('El título es requerido')
        
        let finalContent = newMaterial.content
        // Si es archivo, la subida a Storage iría aquí (simplificado por ahora)
        
        await addMaterial(sessionId, {
            type: newMaterial.type,
            title: newMaterial.title,
            content: finalContent
        })
        setShowMaterialForm(false)
        setNewMaterial({ type: 'file', title: '', content: '' })
    }

    const handleDeleteSession = async () => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este registro de clase? Esta acción no se puede deshacer.')) {
            const ok = await deleteSession(sessionId)
            if (ok) {
                router.push(`/cursos/${courseId}/bitacora`)
            }
        }
    }

    if (loading || !session) {
        return <div className="p-8 text-center text-text-secondary">Cargando cockpit...</div>
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-4">
                    <Link href={`/cursos/${courseId}/bitacora`} className="p-2 hover:bg-surface-hover rounded-full transition-colors text-text-muted hover:text-text-primary">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2 text-sm text-text-secondary mb-1">
                            <time>{new Date(session.date).toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</time>
                        </div>
                        <h2 className="text-2xl font-bold text-text-primary">{session.title}</h2>
                    </div>
                </div>
                <button 
                    onClick={handleDeleteSession}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                    title="Eliminar clase"
                >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Eliminar</span>
                </button>
            </div>

            {/* Split View */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LADO IZQUIERDO: La Planificación */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Temas Tratados */}
                    <div className="bg-surface border border-border rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-text-primary flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-primary-500" />
                                Temas Abordados
                            </h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {session.topics.length === 0 ? (
                                <p className="text-sm text-text-muted italic">No se han vinculado temas del programa anual a esta clase.</p>
                            ) : (
                                session.topics.map(t => (
                                    <span key={t.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary-50 text-primary-700 border border-primary-100">
                                        {t.title}
                                    </span>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Consignas y Notas */}
                    <div className="bg-surface border border-border rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-text-primary flex items-center gap-2">
                                <FileText className="w-5 h-5 text-primary-500" />
                                Consignas y Anotaciones
                            </h3>
                            {!isEditing ? (
                                <button onClick={() => setIsEditing(true)} className="text-sm font-medium text-primary-600 hover:text-primary-700">Editar</button>
                            ) : (
                                <button onClick={handleSave} className="flex items-center gap-1 text-sm font-medium text-green-600 hover:text-green-700">
                                    <Save className="w-4 h-4" /> Guardar
                                </button>
                            )}
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Consignas / Actividades de la clase</label>
                                {isEditing ? (
                                    <SimpleTextarea value={instructions} onChange={setInstructions} placeholder="Escribe aquí las consignas dictadas..." />
                                ) : (
                                    <div className="p-4 bg-background border border-border rounded-xl text-text-primary whitespace-pre-wrap min-h-[4rem]">
                                        {instructions || <span className="text-text-muted italic">Sin consignas.</span>}
                                    </div>
                                )}
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Notas Privadas del Docente</label>
                                {isEditing ? (
                                    <SimpleTextarea value={notes} onChange={setNotes} placeholder="Tus reflexiones sobre cómo salió la clase..." />
                                ) : (
                                    <div className="p-4 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 rounded-xl text-text-primary whitespace-pre-wrap min-h-[4rem]">
                                        {notes || <span className="text-text-muted italic">Sin notas privadas.</span>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Gestor de Materiales */}
                    <div className="bg-surface border border-border rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-text-primary flex items-center gap-2">
                                <LinkIcon className="w-5 h-5 text-primary-500" />
                                Materiales Bibliográficos
                            </h3>
                            <button onClick={() => setShowMaterialForm(!showMaterialForm)} className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors text-text-muted">
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>

                        {showMaterialForm && (
                            <div className="mb-4 p-4 border border-border rounded-xl bg-background space-y-3">
                                <div>
                                    <label className="text-xs font-medium text-text-secondary">Tipo</label>
                                    <select 
                                        className="w-full mt-1 p-2 bg-surface border border-border rounded-lg"
                                        value={newMaterial.type}
                                        onChange={e => setNewMaterial({...newMaterial, type: e.target.value})}
                                    >
                                        <option value="file">Archivo (PDF, Word, etc)</option>
                                        <option value="link">Enlace Web</option>
                                        <option value="rich_text">Apunte en Texto</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-text-secondary">Título</label>
                                    <input 
                                        type="text" 
                                        className="w-full mt-1 p-2 bg-surface border border-border rounded-lg"
                                        value={newMaterial.title}
                                        onChange={e => setNewMaterial({...newMaterial, title: e.target.value})}
                                    />
                                </div>
                                {newMaterial.type !== 'file' && (
                                    <div>
                                        <label className="text-xs font-medium text-text-secondary">
                                            {newMaterial.type === 'link' ? 'URL' : 'Contenido'}
                                        </label>
                                        <textarea 
                                            className="w-full mt-1 p-2 bg-surface border border-border rounded-lg"
                                            value={newMaterial.content}
                                            onChange={e => setNewMaterial({...newMaterial, content: e.target.value})}
                                        />
                                    </div>
                                )}
                                <div className="flex justify-end pt-2">
                                    <button onClick={handleAddMaterial} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium">
                                        Agregar Material
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            {session.materials.length === 0 ? (
                                <p className="text-sm text-text-muted italic">No hay materiales vinculados a esta clase.</p>
                            ) : (
                                session.materials.map(m => (
                                    <div key={m.id} className="flex items-center justify-between p-3 border border-border rounded-xl hover:border-primary-500/30 transition-colors">
                                        <div className="flex items-center gap-3">
                                            {m.type === 'link' ? <LinkIcon className="w-4 h-4 text-blue-500" /> : 
                                             m.type === 'rich_text' ? <FileText className="w-4 h-4 text-amber-500" /> : 
                                             <FileText className="w-4 h-4 text-red-500" />}
                                            <span className="font-medium text-sm text-text-primary">{m.title}</span>
                                        </div>
                                        <button onClick={() => removeMaterial(m.id)} className="text-xs text-red-500 hover:text-red-600 font-medium">Eliminar</button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>

                {/* LADO DERECHO: La Realidad (Widgets) */}
                <div className="space-y-6">
                    
                    {/* Widget Asistencia */}
                    <div className="bg-surface border border-border rounded-2xl p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <Users className="w-5 h-5 text-blue-500" />
                            </div>
                            <h3 className="font-bold text-text-primary">Asistencia</h3>
                        </div>
                        <p className="text-sm text-text-secondary mb-4">Registro de presentes y ausentes de esta fecha.</p>
                        <Link href={`/cursos/${courseId}/clase?date=${session.date}`} className="inline-flex items-center justify-center w-full py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-surface-hover transition-colors">
                            Tomar / Ver Asistencia
                        </Link>
                    </div>

                    {/* Widget Trabajos Prácticos */}
                    <div className="bg-surface border border-border rounded-2xl p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-purple-500/10 rounded-lg">
                                <KanbanSquare className="w-5 h-5 text-purple-500" />
                            </div>
                            <h3 className="font-bold text-text-primary">Trabajos Prácticos</h3>
                        </div>
                        <Link href={`/cursos/${courseId}/trabajos?session_id=${session.id}`} className="inline-flex items-center justify-center w-full py-2 bg-primary-600 hover:bg-primary-700 text-white border border-transparent rounded-lg text-sm font-medium transition-colors">
                            <Plus className="w-4 h-4 mr-1" />
                            Crear Trabajo
                        </Link>
                    </div>

                    {/* Widget Comportamiento */}
                    <div className="bg-surface border border-border rounded-2xl p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-amber-500/10 rounded-lg">
                                <MessageSquare className="w-5 h-5 text-amber-500" />
                            </div>
                            <h3 className="font-bold text-text-primary">Comportamiento</h3>
                        </div>
                        <p className="text-sm text-text-secondary mb-4">Anotaciones de los alumnos durante la clase.</p>
                        <Link href={`/cursos/${courseId}/alumnos`} className="inline-flex items-center justify-center w-full py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-surface-hover transition-colors">
                            Ver Alumnos
                        </Link>
                    </div>

                </div>

            </div>
        </div>
    )
}
