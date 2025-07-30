import { type NextRequest, NextResponse } from "next/server"
import { StudentService } from "@/lib/student-service"

// Force dynamic rendering for this API route
export const dynamic = "force-dynamic"

// In-memory cache
let cache: { [key: string]: any } = {}
let cacheTimestamp = 0
const CACHE_DURATION = 10 * 1000 // 10 seconds - shorter cache

// Helper function to clear cache
function clearCache() {
  cache = {}
  cacheTimestamp = 0
  console.log("🧹 Statistics cache cleared")
}

// Export cache clearing function
export function clearStatisticsCache() {
  clearCache()
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const year = Number.parseInt(searchParams.get("year") || "2025")
    const examType = (searchParams.get("examType") as "BAC" | "BREVET") || "BAC"
    const noCache = searchParams.get("nocache") === "true"

    const cacheKey = `${year}-${examType}`
    const now = Date.now()

    console.log(`📈 Loading statistics for ${examType} ${year}${noCache ? " (no cache)" : ""}`)

    // Validate parameters
    if (isNaN(year) || year < 2020 || year > 2030) {
      console.error(`❌ Invalid year: ${year}`)
      return NextResponse.json({ error: "Invalid year parameter" }, { status: 400 })
    }

    if (!["BAC", "BREVET"].includes(examType)) {
      console.error(`❌ Invalid examType: ${examType}`)
      return NextResponse.json({ error: "Invalid examType parameter" }, { status: 400 })
    }

    // Check cache (unless bypassed)
    if (!noCache && cache[cacheKey] && now - cacheTimestamp < CACHE_DURATION) {
      console.log(`📈 Using cached statistics for ${cacheKey}`)
      return NextResponse.json(cache[cacheKey])
    }

    console.log(`� Fetching fresh statistics from database...`)

    // Get statistics from database
    const statistics = await StudentService.getStatistics(year, examType)

    console.log(`📊 Statistics result:`)
    console.log(`   - Total students: ${statistics.totalStudents}`)
    console.log(`   - Admitted: ${statistics.admittedStudents}`)
    console.log(`   - Sections: ${statistics.sectionStats.length}`)
    console.log(`   - Wilayas: ${statistics.wilayaStats.length}`)

    // Cache the result if we have data
    if (!noCache && statistics.totalStudents > 0) {
      cache[cacheKey] = statistics
      cacheTimestamp = now
      console.log(`💾 Cached statistics for ${cacheKey}`)
    } else if (statistics.totalStudents === 0) {
      console.log(`⚠️ No statistics data found for ${examType} ${year} - not caching empty result`)
    }

    return NextResponse.json(statistics)
  } catch (error) {
    console.error("💥 Statistics error:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")

    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
