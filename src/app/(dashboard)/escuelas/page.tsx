'use client'
 
import { useState, useEffect } from 'react'
import { 
    Building2, Plus, Loader2, Sparkles, BookOpen, Clock, Users,
    Search, LayoutGrid, List
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSchools } from '@/hooks/use-schools'
import { useCourses } from '@/hooks/use-courses'
import { SchoolForm } from '@/components/schools/school-form'
import { CourseForm } from '@/components/schools/course-form'
import { SchoolAccordion } from '@/components/schools/school-accordion'
import { cn } from '@/lib/utils'

export default function EscuelasPage() {
    const { schools, loading: loadingSchools, fetchSchools, createSchool, updateSchool, deleteSchool } = useSchools()
    const { courses, loading: loadingCourses, fetchCourses, createCourse, updateCourse, deleteCourse } = useCourses()

    // Modals state
    const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false)
    const [isCourseModalOpen, setIsCourseModalOpen] = useState(false)

    // Edit/Context state
    const [schoolToEdit, setSchoolToEdit] = useState<any>(null)
    const [courseToEdit, setCourseToEdit] = useState<any>(null)
    const [selectedSchoolId, setSelectedSchoolId] = useState<string>('')

    useEffect(() => {
        fetchSchools()
        fetchCourses()
    }, [fetchSchools, fetchCourses])

    const handleCreateSchool = () => {
        setSchoolToEdit(null)
        setIsSchoolModalOpen(true)
    }

    const handleEditSchool = (school: any) => {
        setSchoolToEdit(school)
        setIsSchoolModalOpen(true)
    }

    const handleAddCourse = (schoolId: string) => {
        setCourseToEdit(null)
        setSelectedSchoolId(schoolId)
        setIsCourseModalOpen(true)
    }

    const handleEditCourse = (course: any) => {
        setCourseToEdit(course)
        setSelectedSchoolId(course.school_id)
        setIsCourseModalOpen(true)
    }

    const isLoading = loadingSchools || loadingCourses

    // Metrics Calculation
    const totalWeeklyHours = courses.reduce((acc, course) => {
        const schedules = course.course_schedules || []
        return acc + schedules.length // Assuming each block is ~1 hour for now, can be improved
    }, 0)

    const activeShifts = new Set(schools.map(s => s.shift)).size

    const metrics = [
        { label: 'Escuelas', value: schools.length, icon: Building2, color: 'from-blue-500/20 to-blue-600/5' },
        { label: 'Cursos', value: courses.length, icon: BookOpen, color: 'from-purple-500/20 to-purple-600/5' },
        { label: 'Horas semanales', value: totalWeeklyHours, icon: Clock, color: 'from-cyan-500/20 to-cyan-600/5' },
        { label: 'Turnos activos', value: activeShifts, icon: Users, color: 'from-pink-500/20 to-pink-600/5' },
    ]

    return (
        <div className="relative min-h-screen max-w-[1400px] mx-auto pb-32 px-4 md:px-6 overflow-hidden">
            {/* Background Depth Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary-500/5 rounded-full blur-[120px] opacity-50" />
                <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-[140px] opacity-30" />
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay" />
            </div>

            {/* Header / Command Bar - REFINED */}
            <div className="flex items-center justify-between gap-4 pt-6 md:pt-10 mb-8">
                <div className="space-y-1">
                    <motion.h1 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-3xl md:text-4xl font-bold text-text-primary tracking-tight"
                    >
                        Mis Escuelas
                    </motion.h1>
                    {/* Inline Metrics - REFINED CONTRAST */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="flex items-center gap-3 text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] opacity-80"
                    >
                        <span className="flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-primary-500" />
                            {schools.length} Escuelas
                        </span>
                        <span className="opacity-20">|</span>
                        <span>{courses.length} Cursos</span>
                        <span className="opacity-20">|</span>
                        <span>{totalWeeklyHours} hs</span>
                    </motion.div>
                </div>

                {/* Desktop Utility Button */}
                <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCreateSchool}
                    className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-surface-secondary text-white rounded-xl font-bold transition-all hover:bg-white/5 border border-white/10 text-xs shadow-lg"
                >
                    <Plus className="w-4 h-4 text-primary-400" />
                    Nueva Escuela
                </motion.button>
            </div>

            {/* Tu Jornada - FEATURED SECTION */}
            {!isLoading && schools.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-10 p-6 rounded-[2rem] bg-gradient-to-br from-surface-secondary/40 to-surface-secondary/10 border border-white/5 backdrop-blur-md relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-[80px] -mr-32 -mt-32 animate-pulse" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <span className="text-[10px] font-black text-primary-400 uppercase tracking-[0.3em]">Tu Jornada Hoy</span>
                            <h2 className="text-2xl font-bold text-text-primary tracking-tight">
                                Tienes <span className="text-primary-400">{courses.filter(c => {
                                    const todayNum = new Date().getDay();
                                    return c.course_schedules?.some((s: any) => s.day_of_week === todayNum);
                                }).length} clases</span> en <span className="text-primary-400">{new Set(courses.filter(c => {
                                    const todayNum = new Date().getDay();
                                    return c.course_schedules?.some((s: any) => s.day_of_week === todayNum);
                                }).map(c => c.school_id)).size} escuelas</span>
                            </h2>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
                                <Clock className="w-4 h-4 text-primary-400" />
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-bold text-text-muted uppercase opacity-40">Próxima</span>
                                    <span className="text-sm font-bold text-white">13:30 hs</span>
                                </div>
                            </div>
                            <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
                                <Building2 className="w-4 h-4 text-primary-400" />
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-bold text-text-muted uppercase opacity-40">Lugar</span>
                                    <span className="text-sm font-bold text-white truncate max-w-[100px]">CPEM 12</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Mobile FAB - REFINED */}
            <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleCreateSchool}
                className="md:hidden fixed bottom-6 right-6 z-[100] w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center shadow-2xl border border-white/20"
            >
                <Plus className="w-6 h-6" />
            </motion.button>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-32 bg-surface-secondary/30 rounded-2xl border border-white/5 animate-pulse" />
                    ))}
                </div>
            ) : schools.length === 0 ? (
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-24 bg-surface-secondary/20 rounded-3xl border border-white/5 border-dashed"
                >
                    <div className="w-20 h-20 bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Building2 className="w-10 h-10 text-primary-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-text-primary tracking-tight">Sin escuelas todavía</h3>
                    <p className="text-text-secondary mt-2 max-w-xs mx-auto text-sm font-medium opacity-50">
                        Comienza agregando las instituciones donde das clase.
                    </p>
                    <button
                        onClick={handleCreateSchool}
                        className="inline-flex items-center gap-2 mt-8 px-8 py-4 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-700 transition-all shadow-xl shadow-primary-600/30"
                    >
                        <Plus className="w-5 h-5" />
                        Agregar escuela
                    </button>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-7">
                    <AnimatePresence mode="popLayout">
                        {schools.map((school, idx) => (
                            <motion.div
                                key={school.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.03 }}
                            >
                                <SchoolAccordion
                                    school={school}
                                    courses={courses.filter(c => c.school_id === school.id)}
                                    onEditSchool={handleEditSchool}
                                    onDeleteSchool={deleteSchool}
                                    onAddCourse={handleAddCourse}
                                    onEditCourse={handleEditCourse}
                                    onDeleteCourse={deleteCourse}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
 
            {isSchoolModalOpen && (
                <SchoolForm
                    isOpen={isSchoolModalOpen}
                    initialData={schoolToEdit}
                    onClose={() => setIsSchoolModalOpen(false)}
                    onSubmit={async (data) => {
                        if (schoolToEdit) {
                            return await updateSchool(schoolToEdit.id, data)
                        } else {
                            return await createSchool(data)
                        }
                    }}
                />
            )}
 
            {isCourseModalOpen && selectedSchoolId && (
                <CourseForm
                    isOpen={isCourseModalOpen}
                    schoolId={selectedSchoolId}
                    initialData={courseToEdit}
                    onClose={() => setIsCourseModalOpen(false)}
                    onSubmit={async (courseData, schedulesData) => {
                        if (courseToEdit) {
                            return await updateCourse(courseToEdit.id, courseData, schedulesData)
                        } else {
                            return await createCourse(courseData, schedulesData)
                        }
                    }}
                />
            )}
        </div>
    )
}
