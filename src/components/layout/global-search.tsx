'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Loader2, Building2, BookOpen, Users, X, Command } from 'lucide-react'
import { useGlobalSearch, SearchResult } from '@/hooks/use-global-search'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

export function GlobalSearch() {
    const [query, setQuery] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const { results, loading } = useGlobalSearch(query)
    const router = useRouter()
    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                inputRef.current?.focus()
                setIsOpen(true)
            }
            if (e.key === 'Escape') {
                setIsOpen(false)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSelect = (result: SearchResult) => {
        router.push(result.href)
        setIsOpen(false)
        setQuery('')
    }

    const getIcon = (type: SearchResult['type']) => {
        switch (type) {
            case 'school': return Building2
            case 'course': return BookOpen
            case 'student': return Users
            default: return Search
        }
    }

    return (
        <div ref={containerRef} className="relative flex-1 max-w-md hidden sm:block">
            <div className="relative group">
                <Search className={cn(
                    "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors",
                    isOpen ? "text-primary-500" : "text-text-muted group-focus-within:text-primary-500"
                )} />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value)
                        setIsOpen(true)
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder="Buscar (Ctrl + K)..."
                    className="w-full pl-10 pr-12 py-2 bg-surface-secondary border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-surface text-[10px] text-text-muted font-medium pointer-events-none">
                    <Command className="w-2.5 h-2.5" />
                    <span>K</span>
                </div>
            </div>

            <AnimatePresence>
                {isOpen && (query.length >= 2 || loading) && (
                    <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.98 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                        {loading ? (
                            <div className="p-8 text-center">
                                <Loader2 className="w-6 h-6 text-primary-500 animate-spin mx-auto mb-2" />
                                <p className="text-xs text-text-muted">Buscando...</p>
                            </div>
                        ) : results.length > 0 ? (
                            <div className="p-2">
                                <p className="px-3 py-2 text-[10px] font-bold text-text-muted uppercase tracking-wider">Resultados</p>
                                <div className="space-y-1">
                                    {results.map((result) => {
                                        const Icon = getIcon(result.type)
                                        return (
                                            <button
                                                key={`${result.type}-${result.id}`}
                                                onClick={() => handleSelect(result)}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-secondary transition-colors text-left group"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-surface-secondary group-hover:bg-primary-500/10 flex items-center justify-center transition-colors">
                                                    <Icon className="w-4 h-4 text-text-secondary group-hover:text-primary-500" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-text-primary truncate">{result.title}</p>
                                                    <p className="text-[10px] text-text-muted truncate">{result.subtitle}</p>
                                                </div>
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <X className="w-3 h-3 text-text-muted" />
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 text-center">
                                <Search className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-20" />
                                <p className="text-sm font-medium text-text-primary">No se encontraron resultados</p>
                                <p className="text-xs text-text-muted mt-1">Intentá con otros términos.</p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
