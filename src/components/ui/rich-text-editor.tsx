'use client'

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
    Bold,
    Italic,
    List,
    ListOrdered,
    Heading1,
    Heading2,
} from 'lucide-react'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
}

const MenuBar = ({ editor }: { editor: Editor | null }) => {
    if (!editor) {
        return null
    }

    const activeButtonClass = "bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300"
    const inactiveButtonClass = "text-text-secondary hover:bg-surface-hover hover:text-text-primary"

    return (
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border bg-surface-secondary/50 rounded-t-lg">
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={cn("p-1.5 rounded-md transition-colors", editor.isActive('heading', { level: 1 }) ? activeButtonClass : inactiveButtonClass)}
                title="Título 1"
            >
                <Heading1 className="w-4 h-4" />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={cn("p-1.5 rounded-md transition-colors", editor.isActive('heading', { level: 2 }) ? activeButtonClass : inactiveButtonClass)}
                title="Título 2"
            >
                <Heading2 className="w-4 h-4" />
            </button>
            
            <div className="w-[1px] h-5 bg-border mx-1" />

            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={cn("p-1.5 rounded-md transition-colors", editor.isActive('bold') ? activeButtonClass : inactiveButtonClass)}
                title="Negrita"
            >
                <Bold className="w-4 h-4" />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={cn("p-1.5 rounded-md transition-colors", editor.isActive('italic') ? activeButtonClass : inactiveButtonClass)}
                title="Cursiva"
            >
                <Italic className="w-4 h-4" />
            </button>

            <div className="w-[1px] h-5 bg-border mx-1" />

            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={cn("p-1.5 rounded-md transition-colors", editor.isActive('bulletList') ? activeButtonClass : inactiveButtonClass)}
                title="Lista con viñetas"
            >
                <List className="w-4 h-4" />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={cn("p-1.5 rounded-md transition-colors", editor.isActive('orderedList') ? activeButtonClass : inactiveButtonClass)}
                title="Lista numerada"
            >
                <ListOrdered className="w-4 h-4" />
            </button>
        </div>
    )
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
        ],
        content: value,
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
        editorProps: {
            attributes: {
                class: 'min-h-[150px] px-4 py-3 outline-none bg-surface text-text-primary rounded-b-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all tiptap-editor [&>p]:m-0 [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>h1]:font-bold [&>h1]:text-2xl [&>h1]:mb-2 [&>h2]:font-bold [&>h2]:text-xl [&>h2]:mb-2',
            },
        },
    })

    // Update content when value changes externally (e.g., initialData loads)
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value)
        }
    }, [value, editor])

    return (
        <div className="w-full border border-border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent transition-all shadow-sm">
            <MenuBar editor={editor} />
            <EditorContent editor={editor} />
        </div>
    )
}
