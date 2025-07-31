import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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

        console.log(`🏆 Calculating rankings for matricule: ${matricule} in ${examType} ${year}`)

        // Find the target student
        const targetStudent = await prisma.student.findUnique({
            where: {
                matricule_year_examType: {
                    matricule,
                    year,
                    examType
                }
            }
        })

        if (!targetStudent) {
            return NextResponse.json({ error: "Étudiant non trouvé" }, { status: 404 })
        }

        const rankings = await calculateRankings(targetStudent, year, examType)

        return NextResponse.json(rankings)
    } catch (error) {
        console.error("💥 Ranking calculation error:", error)
        return NextResponse.json({
            error: "Internal server error",
            timestamp: new Date().toISOString()
        }, { status: 500 })
    }
}

async function calculateRankings(targetStudent: any, year: number, examType: "BAC" | "BREVET") {
    const results: any = {
        matricule: targetStudent.matricule,
        moyenne: targetStudent.moyenne,
        section: targetStudent.section,
        etablissement: targetStudent.etablissement,
    }

    if (examType === "BAC") {
        // For BAC: Calculate both section ranking and school ranking

        // 1. Section ranking - compare with students in the same section
        const sectionRanking = await prisma.student.count({
            where: {
                year,
                examType,
                section: targetStudent.section,
                moyenne: {
                    gt: targetStudent.moyenne
                }
            }
        })
        results.sectionRank = sectionRanking + 1

        // Get total students in section for context
        const totalInSection = await prisma.student.count({
            where: {
                year,
                examType,
                section: targetStudent.section
            }
        })
        results.totalInSection = totalInSection

        // 2. School ranking - compare with students in the same school
        const schoolRanking = await prisma.student.count({
            where: {
                year,
                examType,
                etablissement: targetStudent.etablissement,
                moyenne: {
                    gt: targetStudent.moyenne
                }
            }
        })
        results.schoolRank = schoolRanking + 1

        // Get total students in school for context
        const totalInSchool = await prisma.student.count({
            where: {
                year,
                examType,
                etablissement: targetStudent.etablissement
            }
        })
        results.totalInSchool = totalInSchool

    } else {
        // For BREVET: Calculate general ranking (all students)
        const generalRanking = await prisma.student.count({
            where: {
                year,
                examType,
                moyenne: {
                    gt: targetStudent.moyenne
                }
            }
        })
        results.generalRank = generalRanking + 1

        // Get total students for context
        const totalStudents = await prisma.student.count({
            where: {
                year,
                examType
            }
        })
        results.totalStudents = totalStudents
    }

    return results
}
