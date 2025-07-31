import { type NextRequest, NextResponse } from "next/server"
import { StudentService } from "@/lib/student-service"

// Force dynamic rendering for this API route
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const matricule = searchParams.get("matricule")
    const year = Number.parseInt(searchParams.get("year") || "2025")
    const examType = (searchParams.get("examType") as "BAC" | "BREVET") || "BAC"

    if (!matricule) {
      return NextResponse.json({ error: "Matricule is required" }, { status: 400 })
    }

    console.log(`🔍 Searching for matricule: ${matricule} in ${examType} ${year}`)

    // Find student in database
    const student = await StudentService.findStudentByMatricule(matricule, year, examType)

    if (!student) {
      console.log(`❌ Student with matricule ${matricule} not found in ${examType} ${year}`)
      return NextResponse.json({ error: "Étudiant non trouvé" }, { status: 404 })
    }

    console.log(`✅ Found student: ${student.nom_complet} (${matricule}) in ${examType} ${year}`)

    return NextResponse.json(student)
  } catch (error) {
    console.error("💥 Search error:", error)
    return NextResponse.json({
      error: "Internal server error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
