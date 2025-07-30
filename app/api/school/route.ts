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
    console.log("🧹 School cache cleared")
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const name = searchParams.get("name")
        const year = Number.parseInt(searchParams.get("year") || "2025")
        const examType = (searchParams.get("examType") as "BAC" | "BREVET") || "BAC"

        if (!name) {
            return NextResponse.json({ error: "School name is required" }, { status: 400 })
        }

        const cacheKey = `${name}-${year}-${examType}`
        const now = Date.now()

        // Check cache
        if (cache[cacheKey] && now - cacheTimestamp < CACHE_DURATION) {
            console.log(`🏫 Using cached school students for ${cacheKey}`)
            return NextResponse.json(cache[cacheKey])
        }

        console.log(`🏫 Loading students for school ${name} in ${examType} ${year}`)

        // Get students by school from database
        const students = await StudentService.getStudentsBySchool(name, year, examType)

        // Cache the result
        cache[cacheKey] = students
        cacheTimestamp = now

        return NextResponse.json(students)
    } catch (error) {
        console.error("💥 School students error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
