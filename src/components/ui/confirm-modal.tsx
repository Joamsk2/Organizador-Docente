'use client'

import { Modal } from '@/components/ui/modal'
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'

interface ConfirmModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => Promise<void>
    title: string
    description: string
    confirmText?: string
    variant?: 'danger' | 'warning' | 'primary'
    loading?: boolean
}

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Confirmar',
    variant = 'danger',
    loading = false
}: ConfirmModalProps) {
    
    const handleConfirm = async () => {
        await onConfirm()
        onClose()
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
        >
            <div className="space-y-6">
                <div className="flex items-start gap-4 p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl">
                    <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${variant === 'danger' ? 'text-red-600' : 'text-amber-600'}`} />
                    <div>
                        <p className="text-sm font-medium text-text-primary">
                            {description}
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className={`px-6 py-2 text-sm font-medium text-white rounded-xl shadow-sm transition-all flex items-center gap-2 ${
                            variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 
                            variant === 'warning' ? 'bg-amber-600 hover:bg-amber-700' : 
                            'bg-primary-600 hover:bg-primary-700'
                        }`}
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : variant === 'danger' ? (
                            <Trash2 className="w-4 h-4" />
                        ) : null}
                        {confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    )
}
