import { useState, useRef } from 'react'
import { Modal } from '@/components/ui/modal'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, ClipboardType, X } from 'lucide-react'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import type { Database } from '@/lib/types/database'

type InsertStudent = Database['public']['Tables']['students']['Insert']

interface ParsedStudent extends Partial<InsertStudent> {
    _isValid: boolean;
    _errors: string[];
}

interface StudentImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    courseId: string;
    onImport: (students: Omit<InsertStudent, 'teacher_id'>[]) => Promise<boolean>;
}

export function StudentImportModal({ isOpen, onClose, courseId, onImport }: StudentImportModalProps) {
    const [mode, setMode] = useState<'upload' | 'paste'>('upload')
    const [pasteText, setPasteText] = useState('')
    const [parsedData, setParsedData] = useState<ParsedStudent[]>([])
    const [isParsing, setIsParsing] = useState(false)
    const [isImporting, setIsImporting] = useState(false)

    const fileInputRef = useRef<HTMLInputElement>(null)

    const resetState = () => {
        setPasteText('')
        setParsedData([])
        setMode('upload')
        setIsParsing(false)
        setIsImporting(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleClose = () => {
        if (isImporting) return
        resetState()
        onClose()
    }

    const validateAndMapRow = (row: any): ParsedStudent => {
        const errors: string[] = [];

        // Try to flexibly match column names
        const getVal = (keys: string[]) => {
            for (const key of keys) {
                const foundKey = Object.keys(row).find(k => k.toLowerCase().replace(/[\s_]/g, '') === key)
                if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
                    return String(row[foundKey]).trim()
                }
            }
            return ''
        }

        const first_name = getVal(['nombre', 'nombres', 'firstname', 'first'])
        const last_name = getVal(['apellido', 'apellidos', 'lastname', 'last'])
        const dni = getVal(['dni', 'documento', 'id'])
        const email = getVal(['email', 'correo', 'mail'])
        const phone = getVal(['telefono', 'celular', 'phone'])
        const notes = getVal(['notas', 'observaciones', 'notes'])

        if (!first_name) errors.push('Falta el nombre')
        if (!last_name) errors.push('Falta el apellido')

        return {
            first_name,
            last_name,
            dni: dni || null,
            email: email || null,
            phone: phone || null,
            notes: notes || null,
            _isValid: errors.length === 0,
            _errors: errors
        }
    }

    const processData = (data: any[]) => {
        setIsParsing(true)
        try {
            // Filter out empty rows
            const nonEmptyData = data.filter(row => Object.values(row).some(val => val !== null && val !== ''))
            const mapped = nonEmptyData.map(validateAndMapRow)
            setParsedData(mapped)
        } catch (error) {
            console.error('Error procesando datos:', error)
        } finally {
            setIsParsing(false)
        }
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsParsing(true)
        const fileType = file.name.split('.').pop()?.toLowerCase()

        if (fileType === 'csv') {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results: Papa.ParseResult<any>) => {
                    processData(results.data)
                },
                error: (error: Error) => {
                    console.error('Error parseando CSV:', error)
                    setIsParsing(false)
                }
            })
        } else if (fileType === 'xlsx' || fileType === 'xls') {
            const reader = new FileReader()
            reader.onload = (evt) => {
                try {
                    const bstr = evt.target?.result
                    const wb = XLSX.read(bstr, { type: 'binary' })
                    const wsname = wb.SheetNames[0]
                    const ws = wb.Sheets[wsname]
                    const data = XLSX.utils.sheet_to_json(ws)
                    processData(data)
                } catch (error) {
                    console.error('Error leyendo Excel:', error)
                    setIsParsing(false)
                }
            }
            reader.readAsBinaryString(file)
        } else {
            setIsParsing(false)
            alert('Formato de archivo no soportado. Usa .csv, .xlsx o .xls')
        }
    }

    const handlePasteProcess = () => {
        if (!pasteText.trim()) return
        setIsParsing(true)

        // Use papaparse to guess the delimiter (tab for excel paste, or comma)
        Papa.parse(pasteText, {
            header: true,
            skipEmptyLines: true,
            complete: (results: Papa.ParseResult<any>) => {
                processData(results.data)
            },
            error: (error: Error) => {
                console.error('Error parseando texto pegado:', error)
                setIsParsing(false)
            }
        })
    }

    const handleImport = async () => {
        const validStudents = parsedData.filter(s => s._isValid)
        if (validStudents.length === 0) return

        setIsImporting(true)

        // Remove internal fields
        const studentsToImport = validStudents.map(({ _isValid, _errors, ...rest }) => ({
            ...rest,
            first_name: rest.first_name!,
            last_name: rest.last_name!
        })) as Omit<InsertStudent, 'teacher_id'>[]

        const success = await onImport(studentsToImport)
        if (success) {
            handleClose()
        } else {
            setIsImporting(false)
        }
    }

    const validCount = parsedData.filter(s => s._isValid).length
    const invalidCount = parsedData.length - validCount

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Importar Alumnos">
            <div className="space-y-6">

                {parsedData.length === 0 ? (
                    <>
                        <div className="flex bg-surface-secondary/50 p-1 rounded-xl border border-border w-fit mx-auto">
                            <button
                                onClick={() => setMode('upload')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${mode === 'upload' ? 'bg-white dark:bg-surface shadow-sm text-primary-700 dark:text-primary-400' : 'text-text-secondary hover:text-text-primary'}`}
                            >
                                <Upload className="w-4 h-4" />
                                Subir Archivo
                            </button>
                            <button
                                onClick={() => setMode('paste')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${mode === 'paste' ? 'bg-white dark:bg-surface shadow-sm text-primary-700 dark:text-primary-400' : 'text-text-secondary hover:text-text-primary'}`}
                            >
                                <ClipboardType className="w-4 h-4" />
                                Pegar Datos
                            </button>
                        </div>

                        {mode === 'upload' ? (
                            <div className="border-2 border-dashed border-border rounded-2xl p-12 text-center hover:bg-surface-hover/50 transition-colors">
                                <FileSpreadsheet className="w-12 h-12 text-primary-400 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-text-primary mb-2">Sube un archivo CSV o Excel</h3>
                                <p className="text-sm text-text-secondary mb-6 max-w-sm mx-auto">
                                    El archivo debe contener columnas como "Nombre" y "Apellido". Opcionalmente: "DNI", "Email", "Teléfono", "Notas".
                                </p>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isParsing}
                                    className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-all shadow-sm"
                                >
                                    {isParsing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Seleccionar archivo'}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm text-text-secondary">
                                    Copia y pega los datos desde Excel o Google Sheets. Asegúrate de incluir los encabezados ("Nombre", "Apellido", etc.) en la primera fila.
                                </p>
                                <textarea
                                    value={pasteText}
                                    onChange={(e) => setPasteText(e.target.value)}
                                    placeholder="Nombre&#9;Apellido&#9;DNI&#10;Juan&#9;Pérez&#9;12345678"
                                    className="w-full h-64 p-4 text-sm font-mono bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                                />
                                <div className="flex justify-end">
                                    <button
                                        onClick={handlePasteProcess}
                                        disabled={!pasteText.trim() || isParsing}
                                        className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isParsing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Procesar Datos'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between bg-surface p-4 rounded-xl border border-border">
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    <span className="font-medium text-text-primary">{validCount} válidos</span>
                                </div>
                                {invalidCount > 0 && (
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="w-5 h-5 text-red-500" />
                                        <span className="font-medium text-red-500">{invalidCount} con errores</span>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => setParsedData([])}
                                className="text-sm text-text-secondary hover:text-text-primary font-medium"
                                disabled={isImporting}
                            >
                                Volver a intentar
                            </button>
                        </div>

                        <div className="bg-surface rounded-xl border border-border overflow-hidden max-h-[400px] overflow-y-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-surface-secondary/80 sticky top-0 z-10 backdrop-blur-sm">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold text-text-secondary">Estado</th>
                                        <th className="px-4 py-3 font-semibold text-text-secondary">Nombre</th>
                                        <th className="px-4 py-3 font-semibold text-text-secondary">Apellido</th>
                                        <th className="px-4 py-3 font-semibold text-text-secondary">DNI</th>
                                        <th className="px-4 py-3 font-semibold text-text-secondary">Email</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {parsedData.map((student, idx) => (
                                        <tr key={idx} className={student._isValid ? '' : 'bg-red-50/50 dark:bg-red-900/10'}>
                                            <td className="px-4 py-3">
                                                {student._isValid ? (
                                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                ) : (
                                                    <div className="flex items-center gap-1 text-red-500 group relative">
                                                        <AlertCircle className="w-4 h-4" />
                                                        <span className="text-xs">{student._errors[0]}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 font-medium text-text-primary">{student.first_name || '-'}</td>
                                            <td className="px-4 py-3 font-medium text-text-primary">{student.last_name || '-'}</td>
                                            <td className="px-4 py-3 text-text-secondary">{student.dni || '-'}</td>
                                            <td className="px-4 py-3 text-text-secondary">{student.email || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={isImporting}
                                className="px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-xl font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={isImporting || validCount === 0}
                                className="flex items-center justify-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-primary-600/25 disabled:opacity-50 disabled:shadow-none"
                            >
                                {isImporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                                {isImporting ? 'Importando...' : `Importar ${validCount} alumnos`}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    )
}
