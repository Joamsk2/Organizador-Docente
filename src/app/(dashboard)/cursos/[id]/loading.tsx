export default function CourseLoading() {
    return (
        <div className="flex-1 flex flex-col items-center justify-center py-32 animate-pulse">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                <p className="text-text-secondary font-medium animate-pulse">Cargando módulo...</p>
            </div>
        </div>
    )
}
