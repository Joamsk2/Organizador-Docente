'use client'

import { useState, useEffect, use } from 'react'
import { Plus, Info, Loader2 } from 'lucide-react'
import { useLessonPlans } from '@/hooks/use-lesson-plans'
import { LessonPlanCard } from '@/components/lesson-plans/lesson-plan-card'
import { LessonPlanForm } from '@/components/lesson-plans/lesson-plan-form'
import type { LessonPlanWithStats, LessonPlanType } from '@/hooks/use-lesson-plans'

export default function PlanificacionesCoursePage({ params }: { params: Promise<{ id: string }> }) {
    const { id: courseId } = use(params)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingPlan, setEditingPlan] = useState<LessonPlanWithStats | null>(null)

    // Optional local filtering by type
    const [typeFilter, setTypeFilter] = useState<LessonPlanType | 'all'>('all')

    const {
        plans,
        loading: loadingPlans,
        fetchPlans,
        createPlan,
        updatePlan,
        deletePlan
    } = useLessonPlans(courseId)

    useEffect(() => {
        if (courseId) {
            fetchPlans()
        }
    }, [courseId, fetchPlans])

    const handleOpenCreate = () => {
        setEditingPlan(null)
        setIsFormOpen(true)
    }

    const handleOpenEdit = (plan: LessonPlanWithStats) => {
        setEditingPlan(plan)
        setIsFormOpen(true)
    }

    const handleSubmit = async (data: any, assignmentIds?: string[]) => {
        if (editingPlan) {
            return await updatePlan(editingPlan.id, data, assignmentIds)
        } else {
            return await createPlan(data, assignmentIds)
        }
    }

    const filteredPlans = typeFilter === 'all'
        ? plans
        : plans.filter(p => p.type === typeFilter)

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto flex flex-col min-h-[calc(100vh-160px)] pt-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
                <div>
                    <h2 className="text-xl font-bold text-text-primary">B\u00f3veda de Planificaciones</h2>
                    <p className="text-text-secondary mt-1">Recursos, proyectos y secuencias did\u00e1cticas</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <button
                        onClick={handleOpenCreate}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium rounded-xl transition-all shadow-sm shadow-primary-600/20 hover:shadow-primary-600/40"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Nueva Planificaci\u00f3n</span>
                    </button>
                </div>
            </div>

            {/* Type Filters */}
            <div className="flex overflow-x-auto custom-scrollbar gap-2 pb-2 flex-shrink-0">
                <button
                    onClick={() => setTypeFilter('all')}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${typeFilter === 'all' ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-400' : 'bg-surface border border-border text-text-secondary hover:text-text-primary'
                        }`}
                >
                    Todas
                </button>
                <button
                    onClick={() => setTypeFilter('anual')}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${typeFilter === 'anual' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-surface border border-border text-text-secondary hover:text-text-primary'
                        }`}
                >
                    Anuales
                </button>
                <button
                    onClick={() => setTypeFilter('unidad')}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${typeFilter === 'unidad' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-surface border border-border text-text-secondary hover:text-text-primary'
                        }`}
                >
                    Unidades Did\u00e1cticas
                </button>
                <button
                    onClick={() => setTypeFilter('clase')}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${typeFilter === 'clase' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-surface border border-border text-text-secondary hover:text-text-primary'
                        }`}
                >
                    De Clase
                </button>
                <button
                    onClick={() => setTypeFilter('armani')}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${typeFilter === 'armani' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400' : 'bg-surface border border-border text-text-secondary hover:text-text-primary'
                        }`}
                >
                    Proyectos Armani
                </button>
            </div>

            {/* Main Content Grid */}
            <div className="flex-1 min-h-0">
                {loadingPlans ? (
                    <div className="flex flex-col items-center justify-center py-24 bg-surface/50 rounded-2xl border border-border/50">
                        <Loader2 className="w-10 h-10 text-primary-500 animate-spin mb-4" />
                        <p className="text-text-secondary font-medium">Cargando recursos did\u00e1cticos...</p>
                    </div>
                ) : filteredPlans.length === 0 ? (
                    <div className="text-center py-20 bg-surface border border-dashed border-border rounded-2xl">
                        <Info className="w-10 h-10 text-text-muted mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-text-primary">B\u00f3veda Vac\u00eda</h3>
                        <p className="text-text-secondary">A\u00fan no hay planificaciones {typeFilter !== 'all' && 'de este tipo '}para este curso.</p>
                        <button
                            onClick={handleOpenCreate}
                            className="mt-4 px-4 py-2 border border-primary-500 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 font-medium rounded-lg transition-colors"
                        >
                            Agregar Planificaci\u00f3n
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-slide-up">
                        {filteredPlans.map(plan => (
                            <LessonPlanCard
                                key={plan.id}
                                plan={plan}
                                onEdit={handleOpenEdit}
                                onDelete={deletePlan}
                            />
                        ))}
                    </div>
                )}
            </div>

            <LessonPlanForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleSubmit}
                initialData={editingPlan}
                courseId={courseId}
            />
        </div>
    )
}
