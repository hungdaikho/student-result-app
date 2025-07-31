import { type NextRequest, NextResponse } from "next/server"
import { StudentService } from "@/lib/student-service"

// Force dynamic rendering for this API route
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const year = Number.parseInt(searchParams.get("year") || "2025")
    const examType = (searchParams.get("examType") as "BAC" | "BREVET") || "BAC"
    const limit = Number.parseInt(searchParams.get("limit") || "100")

    console.log(`📊 Loading leaderboard for ${examType} ${year}`)

    // Get leaderboard from database
    const leaderboard = await StudentService.getLeaderboard(year, examType, limit)

    return NextResponse.json(leaderboard)
  } catch (error) {
    console.error("💥 Leaderboard error:", error)
    return NextResponse.json({
      error: "Internal server error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
