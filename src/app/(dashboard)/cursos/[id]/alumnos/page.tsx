'use client'

import { useState, useEffect, use } from 'react'
import { Users, Plus, Loader2, Search, Edit2, Trash2, Mail, Phone } from 'lucide-react'
import Link from 'next/link'
import { useStudents, StudentWithCourses } from '@/hooks/use-students'
import { useCourses } from '@/hooks/use-courses'
import { StudentForm } from '@/components/students/student-form'
import { StudentImportModal } from '@/components/students/student-import-modal'
import { Upload } from 'lucide-react'

export default function AlumnosCoursePage({ params }: { params: Promise<{ id: string }> }) {
    const { id: courseId } = use(params)
    const [searchQuery, setSearchQuery] = useState('')

    const { students, loading: loadingStudents, fetchStudents, createStudent, createStudentsBulk, updateStudent, deleteStudent } = useStudents(courseId)
    // We fetch courses to provide the available courses to the StudentForm
    const { courses, fetchCourses } = useCourses()

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [studentToEdit, setStudentToEdit] = useState<StudentWithCourses | null>(null)

    useEffect(() => {
        fetchCourses()
        fetchStudents()
    }, [fetchCourses, fetchStudents, courseId])

    const handleCreate = () => {
        setStudentToEdit(null)
        setIsModalOpen(true)
    }

    const handleEdit = (student: StudentWithCourses) => {
        setStudentToEdit(student)
        setIsModalOpen(true)
    }

    const filteredStudents = students.filter(s => {
        const fullName = `${s.first_name} ${s.last_name}`.toLowerCase()
        return fullName.includes(searchQuery.toLowerCase()) ||
            (s.dni && s.dni.includes(searchQuery))
    })

    const isLoading = loadingStudents

    return (
        <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pt-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-text-primary">Directorio de Alumnos</h2>
                    <p className="text-text-secondary mt-1">Gesti\u00f3n de alumnos del curso</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white dark:bg-surface border border-border hover:bg-surface-hover text-text-primary rounded-xl font-medium transition-all shadow-sm"
                    >
                        <Upload className="w-5 h-5" />
                        <span className="hidden sm:inline">Importar</span>
                    </button>
                    <button
                        onClick={handleCreate}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-primary-600/25"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="hidden sm:inline">Nuevo Alumno</span>
                    </button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row gap-4 bg-surface p-4 rounded-xl border border-border">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, apellido o DNI..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-surface-secondary border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    />
                </div>
            </div>

            {/* Content */}
            {
                isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="bg-surface rounded-xl border border-border p-12 text-center shadow-sm">
                        <div className="w-20 h-20 bg-primary-50 dark:bg-primary-950/50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Users className="w-10 h-10 text-primary-400" />
                        </div>
                        <h3 className="text-xl font-bold text-text-primary mb-2">No hay alumnos</h3>
                        <p className="text-text-secondary mb-6">
                            {searchQuery
                                ? 'No se encontraron resultados para tu b\u00fasqueda.'
                                : 'A\u00f1ad\u00ed el primer alumno a este curso.'}
                        </p>
                        {(!searchQuery) && (
                            <button
                                onClick={handleCreate}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-surface-secondary text-primary-700 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/50 rounded-xl font-medium transition-all shadow-sm border border-primary-200 dark:border-primary-800 hover:border-primary-300 dark:hover:border-primary-700"
                            >
                                <Plus className="w-5 h-5" />
                                Agregar alumno
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="bg-surface-secondary/50 border-b border-border">
                                        <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Alumno</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Contacto</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider hidden md:table-cell">DNI</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredStudents.map((student) => (
                                        <tr key={student.id} className="hover:bg-surface-hover/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Link href={`/cursos/${courseId}/alumnos/${student.id}`} className="font-semibold text-text-primary hover:text-primary-600 transition-colors block">
                                                    {student.last_name}, {student.first_name}
                                                </Link>
                                                {student.notes && <div className="text-xs text-text-muted mt-0.5 truncate max-w-[200px]" title={student.notes}>{student.notes}</div>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col gap-1 text-sm text-text-secondary">
                                                    {student.email && (
                                                        <div className="flex items-center gap-1.5 hover:text-primary-600 transition-colors">
                                                            <Mail className="w-3.5 h-3.5" />
                                                            <a href={`mailto:${student.email}`}>{student.email}</a>
                                                        </div>
                                                    )}
                                                    {student.phone && (
                                                        <div className="flex items-center gap-1.5 hover:text-primary-600 transition-colors">
                                                            <Phone className="w-3.5 h-3.5" />
                                                            <a href={`tel:${student.phone}`}>{student.phone}</a>
                                                        </div>
                                                    )}
                                                    {!student.email && !student.phone && <span className="text-text-muted italic text-xs">Sin contacto</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary hidden md:table-cell">
                                                {student.dni || <span className="text-text-muted italic">—</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleEdit(student)}
                                                        className="p-2 text-text-muted hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
                                                        title="Editar alumno"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (confirm(`¿Estás seguro de eliminar a ${student.first_name} ${student.last_name}?`)) {
                                                                deleteStudent(student.id)
                                                            }
                                                        }}
                                                        className="p-2 text-text-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                        title="Eliminar alumno"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="px-6 py-4 border-t border-border bg-surface-secondary/30">
                            <p className="text-sm text-text-muted">Mostrando {filteredStudents.length} {filteredStudents.length === 1 ? 'alumno' : 'alumnos'}</p>
                        </div>
                    </div>
                )
            }

            {/* Modals */}
            {
                isModalOpen && (
                    <StudentForm
                        isOpen={isModalOpen}
                        initialData={studentToEdit}
                        availableCourses={courses}
                        defaultCourseId={courseId} /* Need to pass this so it auto-selects */
                        onClose={() => setIsModalOpen(false)}
                        onSubmit={async (data, selectedCourseIds) => {
                            if (studentToEdit) {
                                return await updateStudent(studentToEdit.id, data, selectedCourseIds)
                            } else {
                                return await createStudent(data, selectedCourseIds)
                            }
                        }}
                    />
                )
            }

            <StudentImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                courseId={courseId}
                onImport={async (studentsData) => {
                    return await createStudentsBulk(studentsData, [courseId])
                }}
            />
        </div >
    )
}
