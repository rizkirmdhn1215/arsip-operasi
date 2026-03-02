export interface OperationFile {
    id: string
    operation_id: string
    name: string
    size: number
    file_type: string
    storage_path: string
    upload_date: string
}

export interface Operation {
    id: string
    name: string
    date: string
    year: number
    month: number
    files: OperationFile[]
}

export interface MonthData {
    month: number
    operations: Operation[]
}

export interface YearData {
    year: number
    months: MonthData[]
}
