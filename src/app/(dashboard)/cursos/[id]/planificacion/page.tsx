'use client'

import { use, useEffect, useState } from 'react'
import { Plus, ChevronDown, ChevronRight, CheckCircle2, Circle, MoreVertical, Settings, Trash2, Edit2, GripVertical } from 'lucide-react'
import { useCurriculum, type ModuleWithTopics, type CurriculumTopic, type CurriculumModule } from '@/hooks/use-curriculum'
import { CurriculumFormModal } from '@/components/curriculum/curriculum-form-modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'

// --- Sortable Topic Item ---
interface SortableTopicItemProps {
    topic: CurriculumTopic
    index: number
    moduleIndex: number
    onToggleStatus: (topic: CurriculumTopic) => void
    onOpenEdit: (topic: CurriculumTopic) => void
    onOpenDelete: (topic: CurriculumTopic) => void
    activeMenu: { type: 'module' | 'topic'; id: string } | null
    setActiveMenu: (menu: { type: 'module' | 'topic'; id: string } | null) => void
}

function SortableTopicItem({ 
    topic, 
    index, 
    moduleIndex, 
    onToggleStatus, 
    onOpenEdit, 
    onOpenDelete,
    activeMenu,
    setActiveMenu
}: SortableTopicItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: topic.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 1,
        opacity: isDragging ? 0.5 : 1,
    }

    const isTopicMenuOpen = activeMenu?.type === 'topic' && activeMenu.id === topic.id

    return (
        <div 
            ref={setNodeRef} 
            style={style}
            className="group flex items-center justify-between p-3 bg-surface border border-border/50 rounded-lg hover:border-primary-500/30 transition-all shadow-sm hover:shadow-md"
        >
            <div className="flex items-center gap-3">
                <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text-primary p-1">
                    <GripVertical className="w-4 h-4" />
                </div>
                <button 
                    onClick={() => onToggleStatus(topic)}
                    className={`transition-all active:scale-110 ${
                        topic.status === 'completed' ? 'text-green-500' :
                        topic.status === 'in_progress' ? 'text-amber-500' : 'text-text-muted hover:text-primary-500'
                    }`}
                >
                    {topic.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                </button>
                <span className={`text-sm font-medium transition-all ${topic.status === 'completed' ? 'text-text-secondary line-through opacity-70' : 'text-text-primary'}`}>
                    {moduleIndex + 1}.{index + 1} {topic.title}
                </span>
                {topic.status === 'in_progress' && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full animate-pulse">
                        En Curso
                    </span>
                )}
            </div>
            <div className="relative flex items-center gap-1">
                <button 
                    className={cn(
                        "p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-border transition-all",
                        isTopicMenuOpen ? "opacity-100 bg-border" : "opacity-0 group-hover:opacity-100"
                    )}
                    onClick={() => setActiveMenu(isTopicMenuOpen ? null : { type: 'topic', id: topic.id })}
                >
                    <Settings className="w-4 h-4" />
                </button>
                
                <AnimatePresence>
                    {isTopicMenuOpen && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, x: -10 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95, x: -10 }}
                            className="absolute right-full mr-2 top-0 w-40 bg-surface border border-border rounded-xl shadow-xl z-50 py-1 overflow-hidden"
                        >
                            <button onClick={() => onOpenEdit(topic)} className="w-full flex items-center gap-2 px-4 py-2 text-xs text-text-primary hover:bg-surface-hover transition-colors text-left">
                                <Edit2 className="w-3.5 h-3.5 text-primary-500" /> Editar Tema
                            </button>
                            <button onClick={() => onOpenDelete(topic)} className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left">
                                <Trash2 className="w-3.5 h-3.5" /> Eliminar Tema
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}

// --- Sortable Module Item ---
interface SortableModuleItemProps {
    mod: ModuleWithTopics
    index: number
    isExpanded: boolean
    onToggleExpand: (id: string) => void
    onOpenEdit: (mod: CurriculumModule) => void
    onOpenDelete: (mod: CurriculumModule) => void
    onOpenCreateTopic: (moduleId: string) => void
    onToggleTopicStatus: (topic: CurriculumTopic) => void
    onOpenEditTopic: (topic: CurriculumTopic) => void
    onOpenDeleteTopic: (topic: CurriculumTopic) => void
    onReorderTopics: (moduleId: string, activeId: string, overId: string) => void
    activeMenu: { type: 'module' | 'topic'; id: string } | null
    setActiveMenu: (menu: { type: 'module' | 'topic'; id: string } | null) => void
}

function SortableModuleItem({
    mod,
    index,
    isExpanded,
    onToggleExpand,
    onOpenEdit,
    onOpenDelete,
    onOpenCreateTopic,
    onToggleTopicStatus,
    onOpenEditTopic,
    onOpenDeleteTopic,
    onReorderTopics,
    activeMenu,
    setActiveMenu
}: SortableModuleItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: mod.id })
    
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 40 : 1,
        opacity: isDragging ? 0.5 : 1,
    }

    const modCompletedTopics = mod.topics.filter(t => t.status === 'completed').length
    const modProgress = mod.topics.length === 0 ? 0 : Math.round((modCompletedTopics / mod.topics.length) * 100)
    const isMenuOpen = activeMenu?.type === 'module' && activeMenu.id === mod.id

    const handleTopicDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (over && active.id !== over.id) {
            onReorderTopics(mod.id, active.id as string, over.id as string)
        }
    }

    return (
        <div 
            ref={setNodeRef} 
            style={style}
            className="bg-surface border border-border rounded-xl overflow-visible transition-all shadow-sm hover:shadow-md"
        >
            {/* Module Header */}
            <div 
                className="flex items-center justify-between p-4 cursor-pointer bg-surface hover:bg-surface-hover/50 transition-colors"
                onClick={() => onToggleExpand(mod.id)}
            >
                <div className="flex items-center gap-3">
                    <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text-primary p-1" onClick={(e) => e.stopPropagation()}>
                        <GripVertical className="w-5 h-5" />
                    </div>
                    <div className="text-text-muted hover:text-text-primary transition-colors">
                        {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </div>
                    <div className="flex flex-col">
                        <div className="text-xs font-semibold text-primary-500 uppercase tracking-wider mb-0.5">
                            Módulo {index + 1}
                        </div>
                        <h3 className="text-lg font-bold text-text-primary leading-tight">{mod.title}</h3>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-2 text-sm text-text-secondary">
                        <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${modProgress}%` }} />
                        </div>
                        <span className="font-medium">{modProgress}%</span>
                    </div>
                    <div className="relative">
                        <button 
                            className="p-2 hover:bg-border rounded-lg text-text-muted transition-colors active:scale-90" 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                setActiveMenu(isMenuOpen ? null : { type: 'module', id: mod.id });
                            }}
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>
                        
                        <AnimatePresence>
                            {isMenuOpen && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                    className="absolute right-0 top-full mt-2 w-48 bg-surface border border-border rounded-xl shadow-xl z-50 py-1 overflow-hidden"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button onClick={() => onOpenEdit(mod)} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-text-primary hover:bg-surface-hover transition-colors">
                                        <Edit2 className="w-4 h-4 text-primary-500" /> Editar Módulo
                                    </button>
                                    <button onClick={() => onOpenDelete(mod)} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                                        <Trash2 className="w-4 h-4" /> Eliminar Módulo
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Topics List */}
            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="border-t border-border bg-background/50 p-4 pl-12 space-y-2">
                            {mod.topics.length === 0 ? (
                                <div className="text-sm text-text-muted italic py-2">No hay temas en este módulo.</div>
                            ) : (
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleTopicDragEnd}
                                    modifiers={[restrictToVerticalAxis]}
                                >
                                    <SortableContext items={mod.topics.map(t => t.id)} strategy={verticalListSortingStrategy}>
                                        {mod.topics.map((topic, tIndex) => (
                                            <SortableTopicItem
                                                key={topic.id}
                                                topic={topic}
                                                index={tIndex}
                                                moduleIndex={index}
                                                onToggleStatus={onToggleTopicStatus}
                                                onOpenEdit={onOpenEditTopic}
                                                onOpenDelete={onOpenDeleteTopic}
                                                activeMenu={activeMenu}
                                                setActiveMenu={setActiveMenu}
                                            />
                                        ))}
                                    </SortableContext>
                                </DndContext>
                            )}
                            <button 
                                onClick={() => onOpenCreateTopic(mod.id)}
                                className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium py-2.5 mt-2 px-4 hover:bg-primary-500/10 rounded-xl transition-colors w-full border border-dashed border-primary-500/20"
                            >
                                <Plus className="w-4 h-4" /> Agregar Tema
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default function PlanificacionPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: courseId } = use(params)
    const { 
        modules, 
        loading, 
        fetchCurriculum, 
        createModule, 
        updateModule, 
        deleteModule, 
        createTopic, 
        updateTopic, 
        deleteTopic,
        reorderModules,
        reorderTopics
    } = useCurriculum(courseId)
    
    const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({})
    
    // Modal states
    const [moduleModal, setModuleModal] = useState<{ open: boolean; data?: CurriculumModule | null }>({ open: false })
    const [topicModal, setTopicModal] = useState<{ open: boolean; moduleId?: string; data?: CurriculumTopic | null }>({ open: false })
    const [confirmModal, setConfirmModal] = useState<{ open: boolean; type: 'module' | 'topic'; id: string; title: string }>({ open: false, type: 'module', id: '', title: '' })
    
    // Menu states
    const [activeMenu, setActiveMenu] = useState<{ type: 'module' | 'topic'; id: string } | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    useEffect(() => {
        fetchCurriculum()
    }, [fetchCurriculum])

    const toggleModule = (id: string) => {
        setExpandedModules(prev => ({ ...prev, [id]: !prev[id] }))
    }

    // Module Actions
    const handleOpenCreateModule = () => setModuleModal({ open: true, data: null })
    const handleOpenEditModule = (mod: CurriculumModule) => {
        setModuleModal({ open: true, data: mod })
        setActiveMenu(null)
    }
    const handleOpenDeleteModule = (mod: CurriculumModule) => {
        setConfirmModal({ open: true, type: 'module', id: mod.id, title: mod.title || '' })
        setActiveMenu(null)
    }

    const onModuleSubmit = async (title: string, description?: string) => {
        if (moduleModal.data) {
            await updateModule(moduleModal.data.id, { title, description })
        } else {
            const m = await createModule(title, description)
            if (m) setExpandedModules(prev => ({ ...prev, [m.id]: true }))
        }
        setModuleModal({ open: false })
    }

    // Topic Actions
    const handleOpenCreateTopic = (moduleId: string) => setTopicModal({ open: true, moduleId, data: null })
    const handleOpenEditTopic = (topic: CurriculumTopic) => {
        setTopicModal({ open: true, data: topic })
        setActiveMenu(null)
    }
    const handleOpenDeleteTopic = (topic: CurriculumTopic) => {
        setConfirmModal({ open: true, type: 'topic', id: topic.id, title: topic.title || '' })
        setActiveMenu(null)
    }

    const onTopicSubmit = async (title: string, description?: string) => {
        if (topicModal.data) {
            await updateTopic(topicModal.data.id, { title, description })
        } else if (topicModal.moduleId) {
            await createTopic(topicModal.moduleId, title, description)
        }
        setTopicModal({ open: false })
    }

    const handleConfirmDelete = async () => {
        if (confirmModal.type === 'module') {
            await deleteModule(confirmModal.id)
        } else {
            await deleteTopic(confirmModal.id)
        }
        setConfirmModal(prev => ({ ...prev, open: false }))
    }

    const toggleTopicStatus = async (topic: CurriculumTopic) => {
        const nextStatus = 
            topic.status === 'pending' ? 'in_progress' : 
            topic.status === 'in_progress' ? 'completed' : 'pending'
            
        await updateTopic(topic.id, { status: nextStatus })
    }

    // Reorder Handlers
    const handleModuleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (over && active.id !== over.id) {
            const oldIndex = modules.findIndex(m => m.id === active.id)
            const newIndex = modules.findIndex(m => m.id === over.id)
            const reorderedIds = arrayMove(modules, oldIndex, newIndex).map(m => m.id)
            reorderModules(reorderedIds)
        }
    }

    const handleTopicsReorder = (moduleId: string, activeId: string, overId: string) => {
        const module = modules.find(m => m.id === moduleId)
        if (!module) return
        
        const oldIndex = module.topics.findIndex(t => t.id === activeId)
        const newIndex = module.topics.findIndex(t => t.id === overId)
        const reorderedIds = arrayMove(module.topics, oldIndex, newIndex).map(t => t.id)
        reorderTopics(moduleId, reorderedIds)
    }

    if (loading) {
        return <div className="p-8 text-center text-text-secondary animate-pulse">Cargando planificación...</div>
    }

    const totalTopics = modules.reduce((acc, m) => acc + m.topics.length, 0)
    const completedTopics = modules.reduce((acc, m) => acc + m.topics.filter(t => t.status === 'completed').length, 0)
    const coveragePercent = totalTopics === 0 ? 0 : Math.round((completedTopics / totalTopics) * 100)

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20 pt-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-text-primary">Mapa de Planificación Anual</h2>
                    <p className="text-text-secondary mt-1">Define los módulos y temas que dictarás en el año</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-sm text-text-secondary font-medium mb-1">Cobertura del Programa</div>
                        <div className="flex items-center gap-3">
                            <div className="w-32 h-2 bg-surface border border-border rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-primary-500 transition-all duration-700 ease-out" 
                                    style={{ width: `${coveragePercent}%` }}
                                />
                            </div>
                            <span className="text-sm font-bold text-text-primary">{coveragePercent}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modules List with DND */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleModuleDragEnd}
                modifiers={[restrictToVerticalAxis]}
            >
                <div className="space-y-4">
                    <SortableContext items={modules.map(m => m.id)} strategy={verticalListSortingStrategy}>
                        {modules.map((mod, index) => (
                            <SortableModuleItem
                                key={mod.id}
                                mod={mod}
                                index={index}
                                isExpanded={expandedModules[mod.id] ?? true}
                                onToggleExpand={toggleModule}
                                onOpenEdit={handleOpenEditModule}
                                onOpenDelete={handleOpenDeleteModule}
                                onOpenCreateTopic={handleOpenCreateTopic}
                                onToggleTopicStatus={toggleTopicStatus}
                                onOpenEditTopic={handleOpenEditTopic}
                                onOpenDeleteTopic={handleOpenDeleteTopic}
                                onReorderTopics={handleTopicsReorder}
                                activeMenu={activeMenu}
                                setActiveMenu={setActiveMenu}
                            />
                        ))}
                    </SortableContext>

                    <button 
                        onClick={handleOpenCreateModule}
                        className="w-full flex items-center justify-center gap-2 py-5 border-2 border-dashed border-border rounded-2xl text-text-secondary hover:text-primary-600 hover:border-primary-500 hover:bg-primary-500/5 transition-all font-semibold shadow-sm hover:shadow-md"
                    >
                        <Plus className="w-5 h-5" />
                        Nuevo Módulo
                    </button>
                </div>
            </DndContext>

            {/* Modals */}
            <CurriculumFormModal 
                isOpen={moduleModal.open}
                onClose={() => setModuleModal({ open: false })}
                onSubmit={onModuleSubmit}
                title={moduleModal.data ? 'Editar Módulo' : 'Nuevo Módulo'}
                initialData={moduleModal.data || undefined}
                placeholder="Ej: Unidad 1: El mundo en el siglo XX"
            />

            <CurriculumFormModal 
                isOpen={topicModal.open}
                onClose={() => setTopicModal({ open: false })}
                onSubmit={onTopicSubmit}
                title={topicModal.data ? 'Editar Tema' : 'Nuevo Tema'}
                initialData={topicModal.data || undefined}
                placeholder="Ej: Revolución Industrial"
            />

            <ConfirmModal 
                isOpen={confirmModal.open}
                onClose={() => setConfirmModal({ ...confirmModal, open: false })}
                onConfirm={handleConfirmDelete}
                title={confirmModal.type === 'module' ? 'Eliminar Módulo' : 'Eliminar Tema'}
                description={confirmModal.type === 'module' 
                    ? `¿Estás seguro de que deseas eliminar el módulo "${confirmModal.title}"? Todos los temas asociados también se borrarán.` 
                    : `¿Estás seguro de que deseas eliminar el tema "${confirmModal.title}"?`
                }
                confirmText="Eliminar permanentemente"
            />
            
            {/* Click outside to close menus */}
            {activeMenu && (
                <div className="fixed inset-0 z-30" onClick={() => setActiveMenu(null)} />
            )}
        </div>
    )
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ')
}
