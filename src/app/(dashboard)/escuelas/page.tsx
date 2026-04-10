'use client'

import { useState, useEffect } from 'react'
import { Building2, Plus, Loader2 } from 'lucide-react'
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
        <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-text-primary">Mis Escuelas</h1>
                    <p className="text-text-secondary mt-1">Gestioná tus instituciones, niveles y turnos</p>
                </div>
                <button
                    onClick={handleCreateSchool}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-primary-600/25"
                >
                    <Plus className="w-5 h-5" />
                    Nueva Escuela
                </button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                </div>
            ) : schools.length === 0 ? (
                <div className="bg-surface rounded-xl border border-border p-12 text-center shadow-sm">
                    <div className="w-20 h-20 bg-primary-50 dark:bg-primary-950/50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Building2 className="w-10 h-10 text-primary-400" />
                    </div>
                    <h3 className="text-xl font-bold text-text-primary mb-2">No tenés escuelas registradas</h3>
                    <p className="text-text-secondary max-w-md mx-auto mb-8">
                        Para empezar a organizar tus clases y alumnos, primero necesitas agregar las instituciones académicas donde trabajas.
                    </p>
                    <button
                        onClick={handleCreateSchool}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-surface-secondary text-primary-700 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/50 rounded-xl font-medium transition-all shadow-sm border border-primary-200 dark:border-primary-800 hover:border-primary-300 dark:hover:border-primary-700"
                    >
                        <Plus className="w-5 h-5" />
                        Agregar mi primera escuela
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="space-y-4">
                        {schools.map(school => (
                            <SchoolAccordion
                                key={school.id}
                                school={school}
                                courses={courses.filter(c => c.school_id === school.id)}
                                onEditSchool={handleEditSchool}
                                onDeleteSchool={deleteSchool}
                                onAddCourse={handleAddCourse}
                                onEditCourse={handleEditCourse}
                                onDeleteCourse={deleteCourse}
                            />
                        ))}
                    </div>
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
