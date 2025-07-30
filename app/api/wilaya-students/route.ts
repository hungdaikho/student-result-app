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
    console.log("🧹 Wilaya students cache cleared")
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const name = searchParams.get("name")
        const year = Number.parseInt(searchParams.get("year") || "2025")
        const examType = (searchParams.get("examType") as "BAC" | "BREVET") || "BAC"
        const page = Number.parseInt(searchParams.get("page") || "1")
        const limit = Number.parseInt(searchParams.get("limit") || "50")
        const section = searchParams.get("section") || "all"

        if (!name) {
            return NextResponse.json({ error: "Wilaya name is required" }, { status: 400 })
        }

        const cacheKey = `${name}-${year}-${examType}-${page}-${limit}-${section}`
        const now = Date.now()

        // Check cache
        if (cache[cacheKey] && now - cacheTimestamp < CACHE_DURATION) {
            console.log(`🗺️ Using cached wilaya students for ${cacheKey}`)
            return NextResponse.json(cache[cacheKey])
        }

        console.log(`🗺️ Loading students for wilaya ${name} in ${examType} ${year} (page ${page}, limit ${limit}, section ${section})`)

        // Get paginated students by wilaya from database
        const result = await StudentService.getStudentsByWilayaPaginated(name, year, examType, page, limit, section)

        // Cache the result
        cache[cacheKey] = result
        cacheTimestamp = now

        return NextResponse.json(result)
    } catch (error) {
        console.error("💥 Wilaya students error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
