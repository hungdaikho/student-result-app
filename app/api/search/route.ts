import { type NextRequest, NextResponse } from "next/server"
import { StudentService } from "@/lib/student-service"

// Force dynamic rendering for this API route
export const dynamic = "force-dynamic"

// In-memory cache
let cache: { [key: string]: any } = {}
let cacheTimestamp = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Helper function to clear cache (internal use only)
function clearCache() {
  cache = {}
  cacheTimestamp = 0
  console.log("🧹 Search cache cleared")
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const matricule = searchParams.get("matricule")
    const year = Number.parseInt(searchParams.get("year") || "2025")
    const examType = (searchParams.get("examType") as "BAC" | "BREVET") || "BAC"

    if (!matricule) {
      return NextResponse.json({ error: "Matricule is required" }, { status: 400 })
    }

    const cacheKey = `${matricule}-${year}-${examType}`
    const now = Date.now()

    // Check cache
    if (cache[cacheKey] && now - cacheTimestamp < CACHE_DURATION) {
      console.log(`🔍 Using cached search result for ${cacheKey}`)
      return NextResponse.json(cache[cacheKey])
    }

    console.log(`🔍 Searching for matricule: ${matricule} in ${examType} ${year}`)

    // Find student in database
    const student = await StudentService.findStudentByMatricule(matricule, year, examType)

    if (!student) {
      console.log(`❌ Student with matricule ${matricule} not found in ${examType} ${year}`)
      return NextResponse.json({ error: "Étudiant non trouvé" }, { status: 404 })
    }

    console.log(`✅ Found student: ${student.nom_complet} (${matricule}) in ${examType} ${year}`)

    // Cache the result
    cache[cacheKey] = student
    cacheTimestamp = now

    return NextResponse.json(student)
  } catch (error) {
    console.error("💥 Search error:", error)
    return NextResponse.json({
      error: "Internal server error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
