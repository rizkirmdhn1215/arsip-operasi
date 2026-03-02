import { useState, useEffect, useCallback } from 'react'
import { Download, Loader2, AlertCircle, FileText, Table as TableIcon, FileType } from 'lucide-react'
import * as XLSX from 'xlsx'
import mammoth from 'mammoth'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import type { OperationFile } from '@/lib/types'

interface FileViewerProps {
    file: OperationFile | null
    onClose: () => void
    getSignedUrl: (path: string) => Promise<string>
    downloadFile: (path: string, name: string) => Promise<void>
}

type ViewerState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'pdf'; url: string }
    | { status: 'excel'; html: string }
    | { status: 'docx'; html: string }
    | { status: 'unsupported' }

const PDF_TYPES = ['pdf']
const EXCEL_TYPES = ['xlsx', 'xls', 'csv']
const DOCX_TYPES = ['docx', 'doc']

export function FileViewer({ file, onClose, getSignedUrl, downloadFile }: FileViewerProps) {
    const [viewerState, setViewerState] = useState<ViewerState>({ status: 'idle' })
    const [downloading, setDownloading] = useState(false)

    const loadFile = useCallback(async (f: OperationFile) => {
        setViewerState({ status: 'loading' })
        const ext = f.file_type.toLowerCase()

        try {
            if (PDF_TYPES.includes(ext)) {
                const url = await getSignedUrl(f.storage_path)
                setViewerState({ status: 'pdf', url })

            } else if (EXCEL_TYPES.includes(ext)) {
                const { data, error } = await import('@/lib/supabase').then(m =>
                    m.supabase.storage.from('operation-files').download(f.storage_path)
                )
                if (error) throw error
                const arrayBuffer = await data.arrayBuffer()
                const workbook = XLSX.read(arrayBuffer, { type: 'array' })
                const sheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[sheetName]
                const html = XLSX.utils.sheet_to_html(worksheet, {
                    id: 'excel-table',
                    editable: false,
                })
                setViewerState({ status: 'excel', html })

            } else if (DOCX_TYPES.includes(ext)) {
                const { data, error } = await import('@/lib/supabase').then(m =>
                    m.supabase.storage.from('operation-files').download(f.storage_path)
                )
                if (error) throw error
                const arrayBuffer = await data.arrayBuffer()
                const result = await mammoth.convertToHtml({ arrayBuffer })
                setViewerState({ status: 'docx', html: result.value })

            } else {
                setViewerState({ status: 'unsupported' })
            }
        } catch (e) {
            setViewerState({
                status: 'error',
                message: e instanceof Error ? e.message : 'Failed to load file',
            })
        }
    }, [getSignedUrl])

    useEffect(() => {
        if (file) {
            loadFile(file)
        } else {
            setViewerState({ status: 'idle' })
        }
    }, [file, loadFile])

    const handleDownload = async () => {
        if (!file) return
        setDownloading(true)
        try {
            await downloadFile(file.storage_path, file.name)
        } finally {
            setDownloading(false)
        }
    }

    const getFileIcon = () => {
        if (!file) return <FileText className="h-5 w-5" />
        const ext = file.file_type.toLowerCase()
        if (PDF_TYPES.includes(ext)) return <FileText className="h-5 w-5 text-red-500" />
        if (EXCEL_TYPES.includes(ext)) return <TableIcon className="h-5 w-5 text-green-600" />
        if (DOCX_TYPES.includes(ext)) return <FileType className="h-5 w-5 text-blue-600" />
        return <FileText className="h-5 w-5" />
    }

    return (
        <Dialog open={!!file} onOpenChange={(open) => { if (!open) onClose() }}>
            <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[95vw] h-[95vh] max-h-[95vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b flex-shrink-0 bg-gradient-to-r from-[#1B3A6B]/5 to-transparent">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="flex items-center gap-2 text-base text-[#1B3A6B]">
                            {getFileIcon()}
                            <span className="truncate max-w-md">{file?.name}</span>
                        </DialogTitle>
                        <Button
                            onClick={handleDownload}
                            disabled={downloading}
                            size="sm"
                            className="mr-8 flex-shrink-0 bg-[#F37021] hover:bg-[#d4611a] text-white"
                        >
                            {downloading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Download className="h-4 w-4 mr-2" />
                            )}
                            Unduh
                        </Button>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-auto min-h-0 h-full">
                    {viewerState.status === 'loading' && (
                        <div className="flex flex-col items-center justify-center h-full gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-[#F37021]" />
                            <p className="text-sm text-muted-foreground">Memuat berkas...</p>
                        </div>
                    )}

                    {viewerState.status === 'error' && (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-destructive">
                            <AlertCircle className="h-8 w-8" />
                            <p className="text-sm">{viewerState.message}</p>
                            <Button variant="outline" size="sm" onClick={() => file && loadFile(file)}>
                                Coba Lagi
                            </Button>
                        </div>
                    )}

                    {viewerState.status === 'pdf' && (
                        <iframe
                            src={viewerState.url}
                            className="w-full h-full border-0"
                            style={{ minHeight: 'calc(95vh - 70px)' }}
                            title={file?.name}
                        />
                    )}

                    {viewerState.status === 'excel' && (
                        <div className="p-4 overflow-auto">
                            <style>{`
                #excel-table { border-collapse: collapse; width: 100%; font-size: 13px; }
                #excel-table td, #excel-table th { border: 1px solid hsl(var(--border, 220 13% 85%)); padding: 6px 10px; white-space: nowrap; }
                #excel-table tr:nth-child(even) { background-color: hsl(var(--muted, 220 14% 96%)); }
                #excel-table tr:first-child { background-color: hsl(var(--primary, 220 9% 13%)); color: hsl(var(--primary-foreground, 0 0% 98%)); font-weight: 600; }
              `}</style>
                            <div dangerouslySetInnerHTML={{ __html: viewerState.html }} />
                        </div>
                    )}

                    {viewerState.status === 'docx' && (
                        <div className="p-6 prose prose-sm max-w-none overflow-auto">
                            <div
                                className="docx-content"
                                dangerouslySetInnerHTML={{ __html: viewerState.html }}
                            />
                        </div>
                    )}

                    {viewerState.status === 'unsupported' && (
                        <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
                            <FileText className="h-12 w-12" />
                            <p className="text-sm">Preview not available for this file type.</p>
                            <p className="text-xs">Use the Download button to view the file.</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
