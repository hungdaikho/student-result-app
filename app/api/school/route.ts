import { type NextRequest, NextResponse } from "next/server"
import { StudentService } from "@/lib/student-service"

// Force dynamic rendering for this API route
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const name = searchParams.get("name")
        const year = Number.parseInt(searchParams.get("year") || "2025")
        const examType = (searchParams.get("examType") as "BAC" | "BREVET") || "BAC"

        if (!name) {
            return NextResponse.json({ error: "School name is required" }, { status: 400 })
        }

        // Decode URL and log for debugging
        const decodedName = decodeURIComponent(name)
        console.log(`🏫 Original name: "${name}"`)
        console.log(`🏫 Decoded name: "${decodedName}"`)
        console.log(`🏫 Parameters: year=${year}, examType=${examType}`)

        console.log(`🏫 Loading students for school "${decodedName}" in ${examType} ${year}`)

        // Get students by school from database
        const students = await StudentService.getStudentsBySchool(decodedName, year, examType)

        return NextResponse.json(students)
    } catch (error) {
        console.error("💥 School students error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
