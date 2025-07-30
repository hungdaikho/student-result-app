import { StudentService } from "@/lib/student-service"
import { type NextRequest, NextResponse } from "next/server"

// Force dynamic rendering for this API route
export const dynamic = "force-dynamic"

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const year = Number.parseInt(searchParams.get("year") || "2023")
    const examType = (searchParams.get("examType") as "BAC" | "BREVET") || "BAC"

    if (!year || year < 2020 || year > 2030) {
      return NextResponse.json({ error: "Invalid year provided" }, { status: 400 })
    }

    if (!["BAC", "BREVET"]?.includes(examType)) {
      return NextResponse.json({ error: "Invalid exam type provided" }, { status: 400 })
    }

    // Check if database is configured
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    console.log(`🗑️ Clearing data for ${examType} ${year}`)

    try {
      // Delete data from database
      const deletedCount = await StudentService.clearData(year, examType)

      if (deletedCount === 0) {
        console.log(`📦 No data found for ${examType} ${year}`)
        return NextResponse.json({
          message: `No data found for ${examType} ${year}`,
        })
      }

      console.log(`🗑️ Deleted ${deletedCount} students for ${examType} ${year}`)

      // Auto-clear wilayas cache after successful data clearing
      try {
        console.log("🧹 Auto-clearing wilayas cache after data clearing...")
        const { clearWilayasCache } = await import("../../wilayas/route")
        clearWilayasCache()
        console.log("✅ Wilayas cache cleared successfully")
      } catch (cacheError) {
        console.error("⚠️ Failed to clear wilayas cache:", cacheError)
        // Don't fail the operation if cache clearing fails
      }

      return NextResponse.json({
        message: `All student data for ${examType} ${year} has been cleared successfully`,
        deletedRecords: deletedCount
      })
    } catch (error) {
      console.error("❌ Failed to clear data:", error)
      return NextResponse.json({ error: "Failed to clear data" }, { status: 500 })
    }
  } catch (error) {
    console.error("💥 Clear error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
