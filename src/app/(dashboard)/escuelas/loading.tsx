import { Loader2 } from 'lucide-react'

export default function Loading() {
    return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
                <p className="text-text-secondary text-sm font-medium animate-pulse">Cargando...</p>
            </div>
        </div>
    )
}
