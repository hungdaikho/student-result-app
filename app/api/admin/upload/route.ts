import { type NextRequest, NextResponse } from "next/server"
import { Buffer } from "buffer"
import { StudentService } from "@/lib/student-service"
import { isStudentAdmittedFromDecision, normalizeDecisionText } from "@/lib/decision-utils"

interface Student {
  matricule: string
  nom_complet: string
  ecole: string
  etablissement: string
  moyenne: number
  rang: number
  admis: boolean
  decision_text: string
  section: string
  wilaya?: string
  rang_etablissement?: number
  year: number
  examType: "BAC" | "BREVET"
  lieu_nais?: string
  date_naiss?: string
}

// Helper function to determine if student is admitted based on decision text only
// This function implements comprehensive logic to process the Decision column
// and automatically determine the admission status (admis) of students
function isStudentAdmitted(decisionText: string): boolean {
  console.log(`🔍 Processing decision: "${decisionText}" → "${normalizeDecisionText(decisionText)}"`)

  const result = isStudentAdmittedFromDecision(decisionText)

  if (result) {
    console.log(`✅ Student ADMITTED based on decision: "${normalizeDecisionText(decisionText)}"`)
  } else {
    console.log(`❌ Student NOT ADMITTED based on decision: "${normalizeDecisionText(decisionText)}"`)
  }

  return result
}

// Force dynamic rendering for this API route
export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 300 // Maximum allowed: 300 seconds (5 minutes)

// Enhanced error tracking
interface ProcessingStats {
  totalRows: number
  processedRows: number
  validStudents: number
  skippedRows: number
  errorRows: number
  duplicateRows: number
  processingTime: number
}

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 Upload API called - Environment:", process.env.NODE_ENV)
    console.log("🚀 Runtime:", process.env.VERCEL_REGION || "local")

    // Check if database is configured
    if (!process.env.DATABASE_URL) {
      console.error("❌ DATABASE_URL not configured")
      return NextResponse.json(
        { error: "Database not configured. Please configure DATABASE_URL." },
        { status: 500 },
      )
    }

    // Check request headers
    const contentType = request.headers.get("content-type")
    console.log("📋 Content-Type:", contentType)

    // Validate content type for multipart/form-data
    if (!contentType || !contentType?.includes("multipart/form-data")) {
      console.error("❌ Invalid content type. Expected multipart/form-data")
      return NextResponse.json(
        { error: "Content-Type must be multipart/form-data for file uploads" },
        { status: 400 },
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get("excel") as File | null
    const yearStr = formData.get("year") as string
    const examType = formData.get("examType") as "BAC" | "BREVET"
    const columnMappingStr = formData.get("columnMapping") as string

    console.log("📋 Form data received:")
    console.log("📋 File:", file?.name, file?.size, "bytes")
    console.log("📋 Year:", yearStr)
    console.log("📋 Exam type:", examType)
    console.log("📋 Column mapping:", columnMappingStr)

    // Validate parameters
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!yearStr || isNaN(Number(yearStr))) {
      return NextResponse.json({ error: "Invalid year provided" }, { status: 400 })
    }

    const year = Number(yearStr)
    if (year < 2020 || year > 2030) {
      return NextResponse.json({ error: "Year must be between 2020 and 2030" }, { status: 400 })
    }

    if (!examType || !["BAC", "BREVET"]?.includes(examType)) {
      return NextResponse.json({ error: "Invalid exam type. Must be BAC or BREVET" }, { status: 400 })
    }

    // Validate file type
    if (!file.name?.toLowerCase().endsWith(".xlsx") && !file.name?.toLowerCase().endsWith(".xls")) {
      return NextResponse.json({ error: "File must be an Excel file (.xlsx or .xls)" }, { status: 400 })
    }

    // File size validation (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 50MB" }, { status: 400 })
    }

    console.log("✅ Basic validation passed")

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    console.log("📦 File converted to buffer, size:", buffer.length, "bytes")

    // Import XLSX dynamically
    const XLSX = await import("xlsx")

    // Parse Excel file with enhanced error handling
    console.log("📊 Parsing Excel file...")
    let workbook, rawData
    try {
      workbook = XLSX.read(buffer, {
        type: "buffer",
        cellText: false,
        cellDates: true,
        cellNF: false
      })
      const sheetName = workbook.SheetNames[0]

      if (!sheetName) {
        return NextResponse.json({ error: "Excel file has no sheets" }, { status: 400 })
      }

      console.log(`📄 Processing worksheet: "${sheetName}"`)
      const worksheet = workbook.Sheets[sheetName]

      // Convert to JSON with enhanced options
      rawData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        raw: false,
        dateNF: 'YYYY-MM-DD',
        defval: ''
      }) as any[][]

      console.log(`📊 Raw data extracted: ${rawData.length} rows`)

    } catch (parseError: any) {
      console.error("❌ Excel parsing failed:", parseError)
      return NextResponse.json({
        error: "Failed to parse Excel file. Please ensure it's a valid Excel file.",
        details: parseError.message
      }, { status: 400 })
    }

    console.log("📊 Raw data rows:", rawData.length)

    if (rawData.length < 2) {
      return NextResponse.json({ error: "Excel file must have at least a header row and one data row" }, { status: 400 })
    }

    // Parse column mapping if provided
    let columnMapping: { [key: string]: string } = {}
    if (columnMappingStr) {
      try {
        columnMapping = JSON.parse(columnMappingStr)
        console.log("🗺️ Using column mapping:", columnMapping)
      } catch (e) {
        console.error("❌ Invalid column mapping JSON:", e)
        return NextResponse.json({ error: "Invalid column mapping format" }, { status: 400 })
      }
    }

    // Get headers from first row
    const headers = rawData[0] as string[]
    const hasMapping = Object.keys(columnMapping).length > 0

    console.log("📊 Headers:", headers)
    console.log("📊 Has mapping:", hasMapping)

    // Enhanced processing statistics
    const processingStats: ProcessingStats = {
      totalRows: rawData.length - 1, // Exclude header
      processedRows: 0,
      validStudents: 0,
      skippedRows: 0,
      errorRows: 0,
      duplicateRows: 0,
      processingTime: 0
    }

    const processingStartTime = Date.now()

    // Process the data with enhanced tracking
    const students: Student[] = []
    const errors: string[] = []
    const seenMatricules = new Set<string>() // Track duplicates within the file
    const rowDetails: { [key: number]: string } = {} // Track what happened to each row

    // Function to get value by field name using mapping or index
    const getFieldValue = (row: any[], field: string, defaultIndex?: number): any => {
      if (hasMapping && columnMapping[field]) {
        const columnName = columnMapping[field]
        const columnIndex = headers.indexOf(columnName)
        return columnIndex >= 0 ? row[columnIndex] : null
      }
      return defaultIndex !== undefined ? row[defaultIndex] : null
    }

    // Enhanced row processing with detailed tracking
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i]
      processingStats.processedRows++

      try {
        // Skip completely empty rows but track them
        if (!row || row.length === 0 || row.every(cell => !cell || String(cell).trim() === '')) {
          processingStats.skippedRows++
          rowDetails[i] = `SKIPPED: Empty row`
          console.log(`⚠️ Row ${i + 1}: Skipped (completely empty)`)
          continue
        }

        // Get values using mapping or default indices with enhanced validation
        const matriculeRaw = getFieldValue(row, "matricule", 0)
        const nom_completRaw = getFieldValue(row, "nom_complet", 1)

        const matricule = String(matriculeRaw || "").trim()
        const nom_complet = String(nom_completRaw || "").trim()

        // Enhanced validation with detailed error messages
        if (!matricule) {
          processingStats.errorRows++
          const errorMsg = `Row ${i + 1}: Missing matricule (cell value: "${matriculeRaw}")`
          errors.push(errorMsg)
          rowDetails[i] = `ERROR: Missing matricule`
          console.log(`❌ ${errorMsg}`)
          continue
        }

        if (!nom_complet) {
          processingStats.errorRows++
          const errorMsg = `Row ${i + 1}: Missing nom_complet (cell value: "${nom_completRaw}")`
          errors.push(errorMsg)
          rowDetails[i] = `ERROR: Missing nom_complet`
          console.log(`❌ ${errorMsg}`)
          continue
        }

        // Check for duplicate matricule within the same file
        if (seenMatricules.has(matricule)) {
          processingStats.duplicateRows++
          const errorMsg = `Row ${i + 1}: Duplicate matricule '${matricule}' found in file`
          errors.push(errorMsg)
          rowDetails[i] = `ERROR: Duplicate matricule`
          console.log(`❌ ${errorMsg}`)
          continue
        }
        seenMatricules.add(matricule)

        // Calculate admis using helper function based on decision text only
        const decisionText = String(getFieldValue(row, "decision", 7) || "").trim()

        // Enhanced moyenne processing with validation
        let moyenne = 0
        const moyenneRaw = getFieldValue(row, "moyenne", 4)
        if (moyenneRaw !== null && moyenneRaw !== undefined && moyenneRaw !== '') {
          const moyenneStr = String(moyenneRaw).replace(',', '.').trim()
          moyenne = Number.parseFloat(moyenneStr)
          if (isNaN(moyenne)) {
            console.warn(`⚠️ Row ${i + 1}: Invalid moyenne "${moyenneRaw}", setting to 0`)
            moyenne = 0
          }
        }

        // Enhanced wilaya processing with validation
        const wilayaRaw = getFieldValue(row, "wilaya", 9)
        let wilayaValue: string | undefined = undefined
        if (wilayaRaw !== null && wilayaRaw !== undefined && wilayaRaw !== '') {
          wilayaValue = String(wilayaRaw).trim().replace(/^\s+|\s+$/g, '')
          if (wilayaValue === '') {
            wilayaValue = undefined
          }
          // Log wilaya processing for debugging
          if (i <= 5) { // Log first 5 rows for debugging
            console.log(`🎯 Row ${i + 1}: Wilaya value "${wilayaRaw}" → "${wilayaValue}" for student ${matricule}`)
          }
        }

        const student: Student = {
          matricule,
          nom_complet,
          ecole: String(getFieldValue(row, "ecole", 2) || "").trim(),
          etablissement: String(getFieldValue(row, "etablissement", 3) || "").trim(),
          moyenne,
          rang: Number(getFieldValue(row, "rang", 5)) || 0,
          admis: isStudentAdmitted(decisionText),
          decision_text: decisionText,
          section: examType === "BREVET"
            ? "BREVET"
            : String(getFieldValue(row, "section", 8) || "").trim(),
          wilaya: wilayaValue,
          rang_etablissement: getFieldValue(row, "rang_etablissement", 10) ? Number(getFieldValue(row, "rang_etablissement", 10)) : undefined,
          year,
          examType,
          lieu_nais: getFieldValue(row, "lieu_nais", 11) ? String(getFieldValue(row, "lieu_nais", 11)).trim() : undefined,
          date_naiss: getFieldValue(row, "date_naiss", 12) ? String(getFieldValue(row, "date_naiss", 12)).trim() : undefined,
        }

        students.push(student)
        processingStats.validStudents++
        rowDetails[i] = `SUCCESS: Student added (${student.admis ? 'ADMIS' : 'NOT ADMIS'})`

        // Log progress every 1000 rows
        if (processingStats.processedRows % 1000 === 0) {
          console.log(`📊 Progress: ${processingStats.processedRows}/${processingStats.totalRows} rows processed, ${processingStats.validStudents} valid students`)
        }
      } catch (error) {
        processingStats.errorRows++
        const errorMsg = `Row ${i + 1}: Error processing row - ${error}`
        errors.push(errorMsg)
        rowDetails[i] = `ERROR: Processing failed - ${error}`
        console.error(`❌ ${errorMsg}`)
      }
    }

    // Complete processing statistics
    processingStats.processingTime = Date.now() - processingStartTime

    console.log(`📊 Processing completed:`)
    console.log(`📊 Total rows: ${processingStats.totalRows}`)
    console.log(`📊 Processed rows: ${processingStats.processedRows}`)
    console.log(`📊 Valid students: ${processingStats.validStudents}`)
    console.log(`📊 Skipped rows: ${processingStats.skippedRows}`)
    console.log(`📊 Error rows: ${processingStats.errorRows}`)
    console.log(`📊 Duplicate rows: ${processingStats.duplicateRows}`)
    console.log(`📊 Processing time: ${processingStats.processingTime}ms`)

    if (students.length === 0) {
      return NextResponse.json(
        {
          error: "No valid student records found",
          details: errors.slice(0, 10) // Show first 10 errors
        },
        { status: 400 }
      )
    }

    // Store data in database
    console.log(`💾 Storing ${students.length} students in database...`)
    const startTime = Date.now()

    try {
      // Log batch processing info
      const batchSize = 500 // Updated to match service batch size
      const batches = Math.ceil(students.length / batchSize)
      console.log(`📦 Processing ${students.length} students in ${batches} batch(es) of max ${batchSize} each`)

      const result = await StudentService.uploadStudents(students)
      const endTime = Date.now()
      const duration = (endTime - startTime) / 1000
      console.log(`✅ Data stored successfully in database - Uploaded: ${result.uploadedCount}, Errors: ${result.errors.length} (took ${duration.toFixed(2)}s)`)

      // Log any errors but don't fail the request
      if (result.errors.length > 0) {
        console.warn(`⚠️ Upload had ${result.errors.length} errors:`, result.errors.slice(0, 5))
      }

      // Save upload info
      try {
        await StudentService.saveUploadInfo(year, examType, file.name, result.uploadedCount)
      } catch (uploadInfoError) {
        console.warn("Failed to save upload info:", uploadInfoError)
      }

      // Calculate statistics for response
      const totalStudents = students.length
      const admittedStudents = students.filter(s => s.admis).length
      const admissionRate = totalStudents > 0 ? ((admittedStudents / totalStudents) * 100).toFixed(1) : "0.0"
      const averageScore = totalStudents > 0 ? (students.reduce((sum, s) => sum + s.moyenne, 0) / totalStudents).toFixed(2) : "0.00"

      // Get unique values for stats
      const sections = [...new Set(students.map(s => s.section))].filter(Boolean)
      const schools = [...new Set(students.map(s => s.ecole))].filter(Boolean)
      const establishments = [...new Set(students.map(s => s.etablissement))].filter(Boolean)
      const wilayas = [...new Set(students.map(s => s.wilaya))].filter(Boolean)

      // Log wilaya statistics
      console.log(`🗺️ Wilaya Statistics:`)
      console.log(`📊 Total unique wilayas: ${wilayas.length}`)
      console.log(`📋 Wilayas found: ${wilayas.join(', ')}`)

      const studentsWithWilaya = students.filter(s => s.wilaya).length
      const studentsWithoutWilaya = totalStudents - studentsWithWilaya
      console.log(`✅ Students with wilaya: ${studentsWithWilaya}`)
      console.log(`❌ Students without wilaya: ${studentsWithoutWilaya}`)

      // Note: Cache will be automatically cleared on next request
      console.log("🧹 Caches will be cleared on next request")

      return NextResponse.json({
        message: `Successfully processed ${result.uploadedCount} student records for ${examType} ${year}`,
        success: true,
        processingStats,
        uploadStats: {
          uploadedCount: result.uploadedCount,
          uploadErrors: result.errors.length,
          processingErrors: errors.length
        },
        stats: {
          totalStudents: result.uploadedCount,
          admittedStudents,
          admissionRate,
          sections,
          schools,
          establishments,
          wilayas,
          averageScore
        },
        fileInfo: {
          name: file.name,
          size: file.size,
          type: file.type
        },
        dbInfo: {
          stored: true,
          year,
          examType,
          uploadedCount: result.uploadedCount,
          errors: result.errors.length
        }
      })

    } catch (dbError) {
      console.error("❌ Database error:", dbError)
      return NextResponse.json(
        { error: "Failed to store data in database. Please try again." },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error("💥 Upload error:", error)
    return NextResponse.json(
      { error: "Internal server error. Please try again." },
      { status: 500 }
    )
  }
}
