'use client'

import { useState, useEffect } from 'react'
import { Building2, Plus, Loader2, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { useSchools } from '@/hooks/use-schools'
import { useCourses } from '@/hooks/use-courses'
import { SchoolForm } from '@/components/schools/school-form'
import { CourseForm } from '@/components/schools/course-form'
import { SchoolAccordion } from '@/components/schools/school-accordion'

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

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12 px-4 md:px-0">
            {/* Header / Command Bar */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 text-primary-400 text-[10px] font-black uppercase tracking-wider">
                        <Sparkles className="w-3 h-3" />
                        Infraestructura Educativa
                    </div>
                    <h1 className="text-5xl font-black text-text-primary tracking-tight">
                        Mis Escuelas
                    </h1>
                </div>

                <button
                    onClick={handleCreateSchool}
                    className="group relative flex items-center justify-center gap-3 px-8 py-4 bg-primary-600 text-white rounded-2xl font-black transition-all hover:bg-primary-700 shadow-2xl shadow-primary-600/30 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:animate-shimmer" />
                    <Plus className="w-5 h-5" />
                    Nueva Escuela
                </button>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-64 bg-surface-secondary/50 rounded-[2.5rem] border border-white/5 animate-pulse" />
                    ))}
                </div>
            ) : schools.length === 0 ? (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-32 bg-surface-secondary/20 rounded-[4rem] border border-white/5 border-dashed"
                >
                    <div className="w-24 h-24 bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                        <Building2 className="w-10 h-10 text-primary-500" />
                    </div>
                    <h3 className="text-3xl font-black text-text-primary tracking-tight">Configura tus Instituciones</h3>
                    <p className="text-text-secondary mt-3 max-w-md mx-auto font-medium">
                        Agrega las escuelas donde trabajas para comenzar a organizar tus cursos y alumnos.
                    </p>
                    <button
                        onClick={handleCreateSchool}
                        className="inline-flex items-center gap-3 mt-10 px-10 py-5 rounded-2xl bg-primary-600 text-white font-black hover:bg-primary-700 transition-all shadow-2xl shadow-primary-600/40"
                    >
                        <Plus className="w-5 h-5" />
                        Agregar mi primera escuela
                    </button>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 gap-8">
                    {schools.map((school, idx) => (
                        <motion.div
                            key={school.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
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
