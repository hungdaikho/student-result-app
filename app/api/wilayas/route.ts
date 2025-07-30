import { type NextRequest, NextResponse } from "next/server"
import { StudentService } from "@/lib/student-service"

// Force dynamic rendering for this API route
export const dynamic = "force-dynamic"

// Simple in-memory cache with expiration
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 10 * 1000 // 10 seconds - very short cache for fresh data

// Export cache for clearing from other modules
export { cache as wilayasCache }

// Clear cache function
export function clearWilayasCache() {
  cache.clear()
  console.log("🧹 Wilayas cache cleared")
}

function getCacheKey(year: number, examType: string): string {
  return `wilayas_${year}_${examType}`
}

function getFromCache(key: string) {
  const cached = cache.get(key)
  if (!cached) return null

  const now = Date.now()
  if (now - cached.timestamp > CACHE_DURATION) {
    cache.delete(key)
    return null
  }

  return cached.data
}

function setCache(key: string, data: any) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  })
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const year = Number.parseInt(searchParams.get("year") || "2025")
    const examType = (searchParams.get("examType") as "BAC" | "BREVET") || "BAC"
    const noCache = searchParams.get("nocache") === "true" // Allow bypassing cache

    console.log(`🗺️ Loading wilayas for ${examType} ${year}${noCache ? " (no cache)" : ""}`)

    // Validate parameters
    if (isNaN(year) || year < 2020 || year > 2030) {
      console.error(`❌ Invalid year: ${year}`)
      return NextResponse.json({ error: "Invalid year parameter" }, { status: 400 })
    }

    if (!["BAC", "BREVET"].includes(examType)) {
      console.error(`❌ Invalid examType: ${examType}`)
      return NextResponse.json({ error: "Invalid examType parameter" }, { status: 400 })
    }

    // Check cache first (unless bypassed)
    if (!noCache) {
      const cacheKey = getCacheKey(year, examType)
      const cachedResult = getFromCache(cacheKey)

      if (cachedResult) {
        console.log(`💾 Returning cached wilayas data for ${examType} ${year}`)
        return NextResponse.json(cachedResult)
      }
    }

    // Get wilayas from database
    console.log(`🔄 Fetching fresh wilayas data from database...`)
    const wilayas = await StudentService.getWilayas(year, examType)

    // Only cache if we got results
    if (Object.keys(wilayas).length > 0 && !noCache) {
      const cacheKey = getCacheKey(year, examType)
      setCache(cacheKey, wilayas)
      console.log(`💾 Cached wilayas data for ${examType} ${year} (${Object.keys(wilayas).length} wilayas)`)
    } else if (Object.keys(wilayas).length === 0) {
      console.log(`⚠️ No wilayas data found for ${examType} ${year} - not caching empty result`)
    }

    return NextResponse.json(wilayas)
  } catch (error) {
    console.error("💥 Wilayas API error:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")

    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
