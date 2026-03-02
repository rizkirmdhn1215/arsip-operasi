import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Operation, OperationFile, YearData } from '@/lib/types'

function groupIntoYears(operations: Operation[]): YearData[] {
    const map = new Map<number, Map<number, Operation[]>>()
    for (const op of operations) {
        if (!map.has(op.year)) map.set(op.year, new Map())
        const monthMap = map.get(op.year)!
        if (!monthMap.has(op.month)) monthMap.set(op.month, [])
        monthMap.get(op.month)!.push(op)
    }
    return Array.from(map.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([year, monthMap]) => ({
            year,
            months: Array.from(monthMap.entries())
                .sort((a, b) => a[0] - b[0])
                .map(([month, ops]) => ({ month, operations: ops })),
        }))
}

export function useOperations() {
    const [years, setYears] = useState<YearData[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchAll = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const { data: ops, error: opsError } = await supabase
                .from('operations')
                .select('*')
                .order('date', { ascending: false })

            if (opsError) throw opsError

            const { data: files, error: filesError } = await supabase
                .from('operation_files')
                .select('*')

            if (filesError) throw filesError

            const operations: Operation[] = (ops ?? []).map((op) => ({
                ...op,
                files: (files ?? []).filter((f) => f.operation_id === op.id) as OperationFile[],
            }))

            setYears(groupIntoYears(operations))
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchAll()
    }, [fetchAll])

    const addOperation = useCallback(
        async (name: string, date: string, year: number, month: number) => {
            const { data, error } = await supabase
                .from('operations')
                .insert({ name, date, year, month })
                .select()
                .single()
            if (error) throw error
            const newOp: Operation = { ...data, files: [] }
            setYears((prev) => {
                const all = prev.flatMap((y) => y.months.flatMap((m) => m.operations))
                return groupIntoYears([...all, newOp])
            })
            return newOp
        },
        []
    )

    const deleteOperation = useCallback(async (opId: string) => {
        // Get files to delete from storage
        const { data: files } = await supabase
            .from('operation_files')
            .select('storage_path')
            .eq('operation_id', opId)

        if (files && files.length > 0) {
            const paths = files.map((f) => f.storage_path)
            await supabase.storage.from('operation-files').remove(paths)
        }

        const { error } = await supabase.from('operations').delete().eq('id', opId)
        if (error) throw error

        setYears((prev) => {
            const all = prev.flatMap((y) => y.months.flatMap((m) => m.operations))
            return groupIntoYears(all.filter((o) => o.id !== opId))
        })
    }, [])

    const uploadFile = useCallback(async (operationId: string, file: File) => {
        const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
        const storagePath = `${operationId}/${Date.now()}-${file.name}`

        const { error: storageError } = await supabase.storage
            .from('operation-files')
            .upload(storagePath, file)

        if (storageError) throw storageError

        const today = new Date().toISOString().split('T')[0]
        const { data, error: dbError } = await supabase
            .from('operation_files')
            .insert({
                operation_id: operationId,
                name: file.name,
                size: file.size,
                file_type: ext,
                storage_path: storagePath,
                upload_date: today,
            })
            .select()
            .single()

        if (dbError) throw dbError

        const newFile: OperationFile = data

        setYears((prev) =>
            prev.map((y) => ({
                ...y,
                months: y.months.map((m) => ({
                    ...m,
                    operations: m.operations.map((op) =>
                        op.id === operationId ? { ...op, files: [...op.files, newFile] } : op
                    ),
                })),
            }))
        )

        return newFile
    }, [])

    const deleteFile = useCallback(async (fileId: string, storagePath: string) => {
        await supabase.storage.from('operation-files').remove([storagePath])
        const { error } = await supabase.from('operation_files').delete().eq('id', fileId)
        if (error) throw error

        setYears((prev) =>
            prev.map((y) => ({
                ...y,
                months: y.months.map((m) => ({
                    ...m,
                    operations: m.operations.map((op) => ({
                        ...op,
                        files: op.files.filter((f) => f.id !== fileId),
                    })),
                })),
            }))
        )
    }, [])

    const getSignedUrl = useCallback(async (storagePath: string): Promise<string> => {
        const { data, error } = await supabase.storage
            .from('operation-files')
            .createSignedUrl(storagePath, 3600) // 1 hour
        if (error) throw error
        return data.signedUrl
    }, [])

    const downloadFile = useCallback(async (storagePath: string, fileName: string) => {
        // Use a signed URL with download=fileName so Supabase serves the file
        // with correct Content-Type and Content-Disposition headers,
        // preserving the original file format (xlsx, pdf, docx, etc.)
        const { data, error } = await supabase.storage
            .from('operation-files')
            .createSignedUrl(storagePath, 60, { download: fileName })
        if (error) throw error
        const a = document.createElement('a')
        a.href = data.signedUrl
        a.download = fileName
        a.click()
    }, [])

    return {
        years,
        loading,
        error,
        fetchAll,
        addOperation,
        deleteOperation,
        uploadFile,
        deleteFile,
        getSignedUrl,
        downloadFile,
    }
}
