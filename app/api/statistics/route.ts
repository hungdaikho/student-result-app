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
  console.log("🧹 Statistics cache cleared")
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const year = Number.parseInt(searchParams.get("year") || "2025")
    const examType = (searchParams.get("examType") as "BAC" | "BREVET") || "BAC"

    const cacheKey = `${year}-${examType}`
    const now = Date.now()

    // Check cache
    if (cache[cacheKey] && now - cacheTimestamp < CACHE_DURATION) {
      console.log(`📈 Using cached statistics for ${cacheKey}`)
      return NextResponse.json(cache[cacheKey])
    }

    console.log(`📈 Loading statistics for ${examType} ${year}`)

    // Get statistics from database
    const statistics = await StudentService.getStatistics(year, examType)

    // Cache the result
    cache[cacheKey] = statistics
    cacheTimestamp = now

    return NextResponse.json(statistics)
  } catch (error) {
    console.error("💥 Statistics error:", error)
    return NextResponse.json({
      error: "Internal server error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
