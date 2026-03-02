import * as React from 'react'
import { useState, useMemo, useRef } from 'react'
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  FileText,
  FolderOpen,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  Calendar,
  Shield,
  FileSpreadsheet,
  FileType2,
  File,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

// ── Utilities ──────────────────────────────────────────────
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Byte'
  const k = 1024
  const sizes = ['Byte', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatTanggal = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
}

const getNamaBulan = (month: number): string => {
  return [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ][month - 1]
}

const getBadgeBerkas = (tipe: string) => {
  const ext = tipe.toLowerCase()
  if (ext === 'pdf')
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-semibold">
        <FileText className="h-3 w-3" /> PDF
      </span>
    )
  if (['xlsx', 'xls'].includes(ext))
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-semibold">
        <FileSpreadsheet className="h-3 w-3" /> Excel
      </span>
    )
  if (ext === 'csv')
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 font-semibold">
        <FileSpreadsheet className="h-3 w-3" /> CSV
      </span>
    )
  if (['docx', 'doc'].includes(ext))
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
        <FileType2 className="h-3 w-3" /> Word
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 border border-gray-200 font-semibold">
      <File className="h-3 w-3" /> {ext.toUpperCase()}
    </span>
  )
}

// ── BASARNAS Logo ───────────────────────────────────────────
function BasarnasLogo() {
  return (
    <div className="flex items-center gap-3">
      {/* Emblem */}
      <img
        src="/logo-basarnas.png"
        alt="Logo SAR Nasional"
        className="w-11 h-11 rounded-full object-cover shadow-md ring-2 ring-white/30"
      />
      {/* Text */}
      <div>
        <div className="text-white font-extrabold text-lg leading-none tracking-wide">
          BASARNAS
        </div>
        <div className="text-orange-200 text-[10px] font-medium leading-none mt-0.5 tracking-wider uppercase">
          Sistem Arsip Operasi SAR
        </div>
      </div>
    </div>
  )
}

// ── Main App ────────────────────────────────────────────────
interface AppProps {
  onLogout: () => Promise<void>
  userEmail: string
}

export default function App({ onLogout, userEmail }: AppProps) {
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

  // Sync selectedOperation with latest data
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

  const handleTambahOperasi = async () => {
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
      setOpError(e instanceof Error ? e.message : 'Gagal membuat operasi')
    } finally {
      setAddingOp(false)
    }
  }

  const handleUnggahBerkas = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setOpError(e instanceof Error ? e.message : 'Gagal mengunggah berkas')
    } finally {
      setUploadingFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleHapusBerkas = async (file: OperationFile) => {
    setDeletingFileId(file.id)
    try {
      await deleteFile(file.id, file.storage_path)
    } catch {
      setOpError('Gagal menghapus berkas')
    } finally {
      setDeletingFileId(null)
    }
  }

  const handleHapusOperasi = async (opId: string) => {
    setDeletingOpId(opId)
    try {
      await deleteOperation(opId)
      setSelectedOperation(null)
    } catch {
      setOpError('Gagal menghapus operasi')
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
  const totalOperasi = years.reduce((a, y) => a + y.months.reduce((b, m) => b + m.operations.length, 0), 0)
  const totalBerkas = years.reduce((a, y) => a + y.months.reduce((b, m) => b + m.operations.reduce((c, o) => c + o.files.length, 0), 0), 0)

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* ── Navbar ── */}
      <nav className="basarnas-navbar sticky top-0 z-40 shadow-lg">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <BasarnasLogo />
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden md:block text-blue-200">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <div className="h-4 w-px bg-white/20 hidden md:block" />
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
              <div className="w-6 h-6 rounded-full bg-[#F37021] flex items-center justify-center">
                <Shield className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-white font-medium text-xs hidden sm:block">{userEmail}</span>
            </div>
            <button
              onClick={onLogout}
              title="Keluar"
              className="flex items-center gap-1.5 bg-white/10 hover:bg-red-500/80 px-3 py-1.5 rounded-full transition-colors text-white text-xs font-medium"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ── Title Bar ── */}
      <div className="bg-white border-b border-border">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-1 h-12 rounded-full bg-[#F37021]" />
            <div>
              <h1 className="text-xl font-bold text-[#1B3A6B]">Arsip Operasi SAR</h1>
              <p className="text-sm text-muted-foreground">
                Manajemen dokumentasi dan laporan kegiatan pencarian dan pertolongan
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4">
            <div className="text-center border-r border-border pr-4">
              <div className="text-2xl font-bold text-[#F37021]">{totalOperasi}</div>
              <div className="text-xs text-muted-foreground">Total Operasi</div>
            </div>
            <div className="text-center pr-2">
              <div className="text-2xl font-bold text-[#1B3A6B]">{totalBerkas}</div>
              <div className="text-xs text-muted-foreground">Total Berkas</div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 ml-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAll}
                disabled={loading}
                className="border-[#1B3A6B] text-[#1B3A6B] hover:bg-[#1B3A6B] hover:text-white"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline ml-1">Perbarui</span>
              </Button>

              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[#F37021] hover:bg-[#d4611a] text-white shadow-sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Tambah Operasi
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-lg bg-[#F37021]/10 flex items-center justify-center">
                        <Plus className="h-4 w-4 text-[#F37021]" />
                      </div>
                      <DialogTitle className="text-[#1B3A6B]">Tambah Operasi SAR</DialogTitle>
                    </div>
                    <DialogDescription>
                      Buat entri operasi SAR baru dalam sistem arsip
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="op-name" className="text-[#1B3A6B] font-medium">Nama Operasi</Label>
                      <Input
                        id="op-name"
                        placeholder="Contoh: Operasi SAR Kapal MV Sejahtera"
                        value={newOpName}
                        onChange={(e) => setNewOpName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleTambahOperasi()}
                        className="focus-visible:ring-[#F37021]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="op-year" className="text-[#1B3A6B] font-medium">Tahun</Label>
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
                      <div className="space-y-1.5">
                        <Label htmlFor="op-month" className="text-[#1B3A6B] font-medium">Bulan</Label>
                        <Select value={newOpMonth} onValueChange={setNewOpMonth}>
                          <SelectTrigger id="op-month">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                              <SelectItem key={m} value={m.toString()}>{getNamaBulan(m)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="op-date" className="text-[#1B3A6B] font-medium">Tanggal Operasi</Label>
                      <Input
                        id="op-date"
                        type="date"
                        value={newOpDate}
                        onChange={(e) => setNewOpDate(e.target.value)}
                        className="focus-visible:ring-[#F37021]"
                      />
                    </div>
                    {opError && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {opError}
                      </div>
                    )}
                    <Button
                      onClick={handleTambahOperasi}
                      disabled={addingOp || !newOpName.trim()}
                      className="w-full bg-[#F37021] hover:bg-[#d4611a] text-white"
                    >
                      {addingOp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Simpan Operasi
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* ── Global Error ── */}
      {error && (
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 mt-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <Button variant="ghost" size="sm" onClick={fetchAll} className="text-red-700 hover:bg-red-100">
              Coba Lagi
            </Button>
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto px-4 md:px-8 py-6">
        {/* Search Bar */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama operasi atau berkas dokumen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white border-border focus-visible:ring-[#F37021] shadow-sm"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">

          {/* ── Left Sidebar: Pohon Arsip ── */}
          <div className="flex flex-col">
            <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
              {/* Sidebar Header */}
              <div className="px-4 py-3 border-b border-border bg-[#1B3A6B] flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-orange-300" />
                <span className="font-semibold text-white text-sm">Struktur Arsip</span>
              </div>

              <div className="flex-1 p-3 space-y-1 min-h-0 overflow-y-auto max-h-[calc(100vh-280px)]">
                {loading && (
                  <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Memuat data...</span>
                  </div>
                )}
                {!loading && filteredYears.length === 0 && (
                  <div className="text-center py-10">
                    <FolderOpen className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? 'Operasi tidak ditemukan' : 'Belum ada operasi'}
                    </p>
                  </div>
                )}
                {filteredYears.map((yearData) => (
                  <div key={yearData.year}>
                    <button
                      onClick={() => toggleYear(yearData.year)}
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-[#F37021]/10 transition-colors text-left group"
                    >
                      {expandedYears.has(yearData.year)
                        ? <ChevronDown className="h-4 w-4 text-[#F37021] shrink-0" />
                        : <ChevronRight className="h-4 w-4 text-[#F37021] shrink-0" />}
                      <Calendar className="h-4 w-4 text-[#1B3A6B] shrink-0" />
                      <span className="font-bold text-[#1B3A6B] text-sm">{yearData.year}</span>
                      <span className="ml-auto text-xs bg-[#1B3A6B]/10 text-[#1B3A6B] px-2 py-0.5 rounded-full font-medium">
                        {yearData.months.reduce((a, m) => a + m.operations.length, 0)} ops
                      </span>
                    </button>

                    {expandedYears.has(yearData.year) && (
                      <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-[#F37021]/30 pl-3">
                        {yearData.months.map((monthData) => (
                          <div key={monthData.month}>
                            <button
                              onClick={() => toggleMonth(yearData.year, monthData.month)}
                              className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-muted transition-colors text-left text-sm"
                            >
                              {expandedMonths.has(`${yearData.year}-${monthData.month}`)
                                ? <ChevronDown className="h-3 w-3 text-[#F37021] shrink-0" />
                                : <ChevronRight className="h-3 w-3 text-[#F37021] shrink-0" />}
                              <FolderOpen className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                              <span className="text-[#1B3A6B] font-medium">{getNamaBulan(monthData.month)}</span>
                              <span className="ml-auto text-xs text-muted-foreground">
                                {monthData.operations.length}
                              </span>
                            </button>

                            {expandedMonths.has(`${yearData.year}-${monthData.month}`) && (
                              <div className="ml-4 mt-0.5 space-y-0.5">
                                {monthData.operations.map((op) => (
                                  <button
                                    key={op.id}
                                    onClick={() => setSelectedOperation(op)}
                                    className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md transition-colors text-left text-sm ${selectedOperation?.id === op.id
                                      ? 'bg-[#F37021] text-white shadow-sm'
                                      : 'hover:bg-[#F37021]/10 text-[#1B3A6B]'
                                      }`}
                                  >
                                    <FileText className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate text-xs">{op.name}</span>
                                    <span className={`ml-auto text-xs shrink-0 px-1.5 py-0.5 rounded-full ${selectedOperation?.id === op.id ? 'bg-white/20' : 'bg-[#1B3A6B]/10'
                                      }`}>
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
              </div>
            </div>
          </div>

          {/* ── Right Panel: Detail Operasi ── */}
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
            {/* Panel Header */}
            <div className="px-6 py-3 border-b border-border flex items-center justify-between gap-3 bg-gradient-to-r from-[#1B3A6B]/5 to-transparent">
              <div className="flex items-center gap-2 min-w-0">
                {selectedOperation ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-[#F37021] shrink-0" />
                    <span className="font-bold text-[#1B3A6B] truncate">{selectedOperation.name}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground text-sm font-medium">Detail Operasi</span>
                )}
              </div>

              {selectedOperation && (
                <div className="flex gap-2 shrink-0">
                  {/* Upload Dialog */}
                  <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-[#1B3A6B] text-[#1B3A6B] hover:bg-[#1B3A6B] hover:text-white"
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        Unggah
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-8 h-8 rounded-lg bg-[#1B3A6B]/10 flex items-center justify-center">
                            <Upload className="h-4 w-4 text-[#1B3A6B]" />
                          </div>
                          <DialogTitle className="text-[#1B3A6B]">Unggah Berkas Dokumen</DialogTitle>
                        </div>
                        <DialogDescription>
                          Unggah berkas untuk operasi: <strong>{selectedOperation.name}</strong>
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4 space-y-4">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.xlsx,.xls,.csv,.docx,.doc"
                          multiple
                          onChange={handleUnggahBerkas}
                          className="hidden"
                        />
                        <div
                          className="border-2 border-dashed border-[#1B3A6B]/30 rounded-xl p-8 text-center cursor-pointer hover:border-[#F37021] hover:bg-[#F37021]/5 transition-colors"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="h-10 w-10 mx-auto text-[#1B3A6B]/40 mb-3" />
                          <p className="text-sm font-medium text-[#1B3A6B] mb-1">
                            Klik untuk memilih berkas
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Mendukung PDF, Excel (.xlsx/.xls/.csv), Word (.docx/.doc)
                          </p>
                          {uploadingFile && (
                            <div className="flex items-center justify-center gap-2 mt-4 text-[#F37021]">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm font-medium">Mengunggah berkas...</span>
                            </div>
                          )}
                        </div>
                        {opError && (
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {opError}
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Delete Operation */}
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={deletingOpId === selectedOperation.id}
                    onClick={() => handleHapusOperasi(selectedOperation.id)}
                    title="Hapus operasi"
                  >
                    {deletingOpId === selectedOperation.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              )}
            </div>

            {/* Panel Body */}
            <div className="flex-1 p-6 overflow-auto">
              {selectedOperation ? (
                <div className="space-y-5">
                  {/* Operation Info Strip */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatTanggal(selectedOperation.date)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                      <FileText className="h-3.5 w-3.5" />
                      <span>{selectedOperation.files.length} berkas</span>
                    </div>
                  </div>

                  {/* File List */}
                  {selectedOperation.files.length > 0 ? (
                    <div className="rounded-xl border border-border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-[#1B3A6B]/5 hover:bg-[#1B3A6B]/5">
                            <TableHead className="text-[#1B3A6B] font-semibold">Nama Berkas</TableHead>
                            <TableHead className="text-[#1B3A6B] font-semibold">Tipe</TableHead>
                            <TableHead className="text-[#1B3A6B] font-semibold">Ukuran</TableHead>
                            <TableHead className="text-[#1B3A6B] font-semibold">Tanggal Unggah</TableHead>
                            <TableHead className="text-[#1B3A6B] font-semibold text-right">Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedOperation.files.map((file) => (
                            <TableRow key={file.id} className="hover:bg-[#F37021]/5">
                              <TableCell className="font-medium max-w-[200px]">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-[#1B3A6B]/50 shrink-0" />
                                  <span className="truncate text-[#1B3A6B]">{file.name}</span>
                                </div>
                              </TableCell>
                              <TableCell>{getBadgeBerkas(file.file_type)}</TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {formatBytes(file.size)}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {formatTanggal(file.upload_date)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    title="Pratinjau berkas"
                                    onClick={() => setViewingFile(file)}
                                    className="hover:bg-[#1B3A6B]/10 hover:text-[#1B3A6B]"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    title="Unduh berkas"
                                    onClick={() => downloadFile(file.storage_path, file.name)}
                                    className="hover:bg-[#F37021]/10 hover:text-[#F37021]"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    title="Hapus berkas"
                                    disabled={deletingFileId === file.id}
                                    onClick={() => handleHapusBerkas(file)}
                                    className="hover:bg-red-50 hover:text-red-600"
                                  >
                                    {deletingFileId === file.id
                                      ? <Loader2 className="h-4 w-4 animate-spin" />
                                      : <Trash2 className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-16 border-2 border-dashed border-border rounded-xl bg-muted/30">
                      <div className="w-16 h-16 rounded-full bg-[#F37021]/10 flex items-center justify-center mx-auto mb-4">
                        <FileText className="h-8 w-8 text-[#F37021]/60" />
                      </div>
                      <p className="text-muted-foreground font-medium mb-1">Belum ada berkas</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Unggah dokumen laporan untuk operasi ini
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => setIsUploadDialogOpen(true)}
                        className="border-[#1B3A6B] text-[#1B3A6B] hover:bg-[#1B3A6B] hover:text-white"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Unggah Berkas
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                  <div className="w-20 h-20 rounded-full bg-[#1B3A6B]/5 flex items-center justify-center mb-5">
                    <FolderOpen className="h-10 w-10 text-[#1B3A6B]/30" />
                  </div>
                  <h3 className="text-[#1B3A6B] font-semibold mb-2">Pilih Operasi</h3>
                  <p className="text-muted-foreground text-sm max-w-xs">
                    Pilih operasi SAR dari panel kiri untuk melihat daftar berkas dokumen terkait
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="basarnas-navbar mt-auto py-3">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 flex items-center justify-between text-xs text-blue-200">
          <span>© {new Date().getFullYear()} Badan Nasional Pencarian dan Pertolongan (BASARNAS)</span>
          <span className="hidden md:block">Sistem Informasi Arsip Operasi SAR</span>
        </div>
      </footer>

      {/* ── File Viewer ── */}
      <FileViewer
        file={viewingFile}
        onClose={() => setViewingFile(null)}
        getSignedUrl={getSignedUrl}
        downloadFile={downloadFile}
      />
    </div>
  )
}
