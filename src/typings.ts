interface ConfigObject {
    sheet: string
    script: string
    domain: string
}

interface WorksheetEntry{
    id:string
    title: string
    data?: WorksheetData
}

interface Worksheet{
    sheets: {
        [key: string]: WorksheetEntry
    }
    sheetId: string
    script: string
    domain: string
}

interface Worksheets{
    [key:string]: Worksheet
}

interface WorksheetData {
    title: string
    lastUpdated: Date
    entries: { [key: string]: WorksheetValue}
}

interface WorksheetValue {
    google_url: string
    id: string
    [key:string]: any
}