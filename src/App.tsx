import * as React from 'react'
import { useState, useMemo, useRef } from 'react'
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  FileText,
  FolderOpen,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileViewer } from '@/components/FileViewer'
import { useOperations } from '@/hooks/useOperations'
import type { Operation, OperationFile } from '@/lib/types'

// Utilities
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const getMonthName = (month: number): string => {
  return [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ][month - 1]
}

const getFileTypeBadge = (fileType: string) => {
  const ext = fileType.toLowerCase()
  if (ext === 'pdf') return <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">PDF</span>
  if (['xlsx', 'xls'].includes(ext)) return <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">Excel</span>
  if (ext === 'csv') return <span className="text-xs px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 font-medium">CSV</span>
  if (['docx', 'doc'].includes(ext)) return <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">Word</span>
  return <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">{ext.toUpperCase()}</span>
}

// Main Component
function OperationsArchive() {
  const {
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
  } = useOperations()

  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set())
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOperation, setSelectedOperation] = useState<Operation | null>(null)
  const [viewingFile, setViewingFile] = useState<OperationFile | null>(null)

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [addingOp, setAddingOp] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [deletingOpId, setDeletingOpId] = useState<string | null>(null)
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null)
  const [opError, setOpError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentYear = new Date().getFullYear()
  const [newOpName, setNewOpName] = useState('')
  const [newOpYear, setNewOpYear] = useState(currentYear.toString())
  const [newOpMonth, setNewOpMonth] = useState((new Date().getMonth() + 1).toString())
  const [newOpDate, setNewOpDate] = useState(new Date().toISOString().split('T')[0])

  // Auto-expand first year on load
  React.useEffect(() => {
    if (years.length > 0 && expandedYears.size === 0) {
      setExpandedYears(new Set([years[0].year]))
    }
  }, [years, expandedYears.size])

  // Keep selectedOperation in sync with years data (after uploads/deletes)
  React.useEffect(() => {
    if (!selectedOperation) return
    const found = years
      .flatMap((y) => y.months.flatMap((m) => m.operations))
      .find((o) => o.id === selectedOperation.id)
    if (found) setSelectedOperation(found)
  }, [years, selectedOperation])

  const toggleYear = (year: number) => {
    setExpandedYears((prev) => {
      const next = new Set(prev)
      next.has(year) ? next.delete(year) : next.add(year)
      return next
    })
  }

  const toggleMonth = (year: number, month: number) => {
    const key = `${year}-${month}`
    setExpandedMonths((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const handleAddOperation = async () => {
    if (!newOpName.trim()) return
    setAddingOp(true)
    setOpError(null)
    try {
      const year = parseInt(newOpYear)
      const month = parseInt(newOpMonth)
      await addOperation(newOpName.trim(), newOpDate, year, month)
      setNewOpName('')
      setIsAddDialogOpen(false)
      setExpandedYears((prev) => new Set([...prev, year]))
      setExpandedMonths((prev) => new Set([...prev, `${year}-${month}`]))
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Failed to create operation')
    } finally {
      setAddingOp(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !selectedOperation) return
    const files = Array.from(e.target.files)
    setUploadingFile(true)
    setOpError(null)
    try {
      for (const file of files) {
        await uploadFile(selectedOperation.id, file)
      }
      setIsUploadDialogOpen(false)
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Failed to upload file')
    } finally {
      setUploadingFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteFile = async (file: OperationFile) => {
    setDeletingFileId(file.id)
    try {
      await deleteFile(file.id, file.storage_path)
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Failed to delete file')
    } finally {
      setDeletingFileId(null)
    }
  }

  const handleDeleteOperation = async (opId: string) => {
    setDeletingOpId(opId)
    try {
      await deleteOperation(opId)
      setSelectedOperation(null)
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Failed to delete operation')
    } finally {
      setDeletingOpId(null)
    }
  }

  const filteredYears = useMemo(() => {
    if (!searchQuery.trim()) return years
    const query = searchQuery.toLowerCase()
    return years
      .map((year) => ({
        ...year,
        months: year.months
          .map((month) => ({
            ...month,
            operations: month.operations.filter(
              (op) =>
                op.name.toLowerCase().includes(query) ||
                op.files.some((f) => f.name.toLowerCase().includes(query))
            ),
          }))
          .filter((m) => m.operations.length > 0),
      }))
      .filter((y) => y.months.length > 0)
  }, [years, searchQuery])

  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - i)

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Operations Archive</h1>
            <p className="text-muted-foreground mt-1">
              Manage and access operation documents by year and month
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Operation
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Operation</DialogTitle>
                  <DialogDescription>Create a new operation entry in the archive</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="op-name">Operation Name</Label>
                    <Input
                      id="op-name"
                      placeholder="Enter operation name"
                      value={newOpName}
                      onChange={(e) => setNewOpName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddOperation()}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="op-year">Year</Label>
                      <Select value={newOpYear} onValueChange={setNewOpYear}>
                        <SelectTrigger id="op-year">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {yearOptions.map((y) => (
                            <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="op-month">Month</Label>
                      <Select value={newOpMonth} onValueChange={setNewOpMonth}>
                        <SelectTrigger id="op-month">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                            <SelectItem key={m} value={m.toString()}>{getMonthName(m)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="op-date">Date</Label>
                    <Input
                      id="op-date"
                      type="date"
                      value={newOpDate}
                      onChange={(e) => setNewOpDate(e.target.value)}
                    />
                  </div>
                  {opError && (
                    <div className="flex items-center gap-2 text-destructive text-sm">
                      <AlertCircle className="h-4 w-4" />
                      {opError}
                    </div>
                  )}
                  <Button onClick={handleAddOperation} className="w-full" disabled={addingOp}>
                    {addingOp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Operation
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Global error */}
        {error && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={fetchAll} className="ml-auto">
              Retry
            </Button>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search operations or files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Archive Tree */}
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-lg">Archive Structure</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {loading && (
                  <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Loading...</span>
                  </div>
                )}
                {!loading && filteredYears.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {searchQuery ? 'No operations match your search' : 'No operations yet'}
                  </p>
                )}
                {filteredYears.map((yearData) => (
                  <div key={yearData.year}>
                    <button
                      onClick={() => toggleYear(yearData.year)}
                      className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-muted transition-colors text-left"
                    >
                      {expandedYears.has(yearData.year) ? (
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      )}
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium">{yearData.year}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {yearData.months.reduce((a, m) => a + m.operations.length, 0)} ops
                      </span>
                    </button>

                    {expandedYears.has(yearData.year) && (
                      <div className="ml-6 space-y-1 mt-1">
                        {yearData.months.map((monthData) => (
                          <div key={monthData.month}>
                            <button
                              onClick={() => toggleMonth(yearData.year, monthData.month)}
                              className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-muted transition-colors text-left text-sm"
                            >
                              {expandedMonths.has(`${yearData.year}-${monthData.month}`) ? (
                                <ChevronDown className="h-3 w-3 shrink-0" />
                              ) : (
                                <ChevronRight className="h-3 w-3 shrink-0" />
                              )}
                              <FolderOpen className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span>{getMonthName(monthData.month)}</span>
                              <span className="ml-auto text-xs text-muted-foreground">
                                {monthData.operations.length}
                              </span>
                            </button>

                            {expandedMonths.has(`${yearData.year}-${monthData.month}`) && (
                              <div className="ml-6 space-y-1 mt-1">
                                {monthData.operations.map((op) => (
                                  <button
                                    key={op.id}
                                    onClick={() => setSelectedOperation(op)}
                                    className={`flex items-center gap-2 w-full p-2 rounded-md transition-colors text-left text-sm ${selectedOperation?.id === op.id
                                        ? 'bg-primary text-primary-foreground'
                                        : 'hover:bg-muted'
                                      }`}
                                  >
                                    <FileText className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{op.name}</span>
                                    <span className="ml-auto text-xs shrink-0">
                                      {op.files.length}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right: Detail View */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg truncate">
                    {selectedOperation ? selectedOperation.name : 'Select an operation'}
                  </CardTitle>
                  {selectedOperation && (
                    <div className="flex gap-2 shrink-0">
                      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Upload className="mr-2 h-4 w-4" />
                            Upload
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Upload Files</DialogTitle>
                            <DialogDescription>
                              Upload files (PDF, Excel, Word) to{' '}
                              <strong>{selectedOperation.name}</strong>
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4 space-y-4">
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept=".pdf,.xlsx,.xls,.csv,.docx,.doc"
                              multiple
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                            <div className="border-2 border-dashed rounded-lg p-8 text-center">
                              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                              <p className="text-sm text-muted-foreground mb-1">
                                Supports PDF, Excel (.xlsx/.xls/.csv), Word (.docx/.doc)
                              </p>
                              <Button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingFile}
                                className="mt-3"
                              >
                                {uploadingFile ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Upload className="mr-2 h-4 w-4" />
                                )}
                                {uploadingFile ? 'Uploading...' : 'Select Files'}
                              </Button>
                            </div>
                            {opError && (
                              <div className="flex items-center gap-2 text-destructive text-sm">
                                <AlertCircle className="h-4 w-4" />
                                {opError}
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={deletingOpId === selectedOperation.id}
                        onClick={() => handleDeleteOperation(selectedOperation.id)}
                      >
                        {deletingOpId === selectedOperation.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                {selectedOperation ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Date: {formatDate(selectedOperation.date)}</span>
                      <span>•</span>
                      <span>{selectedOperation.files.length} file(s)</span>
                    </div>

                    {selectedOperation.files.length > 0 ? (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>File Name</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Size</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedOperation.files.map((file) => (
                              <TableRow key={file.id}>
                                <TableCell className="font-medium max-w-[180px]">
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <span className="truncate">{file.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell>{getFileTypeBadge(file.file_type)}</TableCell>
                                <TableCell className="text-muted-foreground">
                                  {formatBytes(file.size)}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {formatDate(file.upload_date)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-1">
                                    {/* View */}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      title="View file"
                                      onClick={() => setViewingFile(file)}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    {/* Download */}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      title="Download file"
                                      onClick={() => downloadFile(file.storage_path, file.name)}
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                    {/* Delete */}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      title="Delete file"
                                      disabled={deletingFileId === file.id}
                                      onClick={() => handleDeleteFile(file)}
                                    >
                                      {deletingFileId === file.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      )}
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-12 border rounded-lg border-dashed">
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">No files uploaded yet</p>
                        <Button
                          variant="outline"
                          onClick={() => setIsUploadDialogOpen(true)}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Files
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Select an operation from the archive to view details
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* File Viewer Dialog */}
      <FileViewer
        file={viewingFile}
        onClose={() => setViewingFile(null)}
        getSignedUrl={getSignedUrl}
        downloadFile={downloadFile}
      />
    </div>
  )
}

export default function App() {
  return <OperationsArchive />
}
