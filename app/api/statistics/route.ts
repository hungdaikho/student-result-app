import { type NextRequest, NextResponse } from "next/server"
import { StudentService } from "@/lib/student-service"

// Force dynamic rendering for this API route
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const year = Number.parseInt(searchParams.get("year") || "2025")
    const examType = (searchParams.get("examType") as "BAC" | "BREVET") || "BAC"

    console.log(`📈 Loading statistics for ${examType} ${year}`)

    // Get statistics from database
    const statistics = await StudentService.getStatistics(year, examType)

    return NextResponse.json(statistics)
  } catch (error) {
    console.error("💥 Statistics error:", error)
    return NextResponse.json({
      error: "Internal server error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
