import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET() {
    try {
        console.log("📥 Files list request received")

        // Get all uploads ordered by upload date (newest first)
        const uploads = await prisma.dataUpload.findMany({
            orderBy: {
                uploadedAt: 'desc'
            }
        })

        console.log(`📁 Found ${uploads.length} files`)

        // Get detailed stats for each upload
        const files = await Promise.all(uploads.map(async (upload) => {
            // Get actual student count and stats
            const studentsStats = await prisma.student.aggregate({
                where: {
                    year: upload.year,
                    examType: upload.examType
                },
                _count: {
                    _all: true
                },
                _avg: {
                    moyenne: true
                }
            })

            const admittedCount = await prisma.student.count({
                where: {
                    year: upload.year,
                    examType: upload.examType,
                    admis: true
                }
            })

            // Calculate unique students (assuming matricule duplicates within same year/examType)
            const uniqueStudents = await prisma.student.groupBy({
                by: ['matricule'],
                where: {
                    year: upload.year,
                    examType: upload.examType
                },
                _count: {
                    matricule: true
                }
            })

            const actualStudentCount = studentsStats._count._all
            const uniqueStudentCount = uniqueStudents.length
            const duplicateCount = actualStudentCount - uniqueStudentCount
            const admissionRate = actualStudentCount > 0
                ? Number(((admittedCount / actualStudentCount) * 100).toFixed(1))
                : 0

            // Format file size (estimate based on student count)
            const estimatedSizeKB = actualStudentCount * 0.5 // Rough estimate: 0.5KB per student
            const sizeFormatted = estimatedSizeKB < 1024
                ? `${estimatedSizeKB.toFixed(0)} KB`
                : `${(estimatedSizeKB / 1024).toFixed(1)} MB`

            return {
                id: upload.id,
                fileName: upload.fileName,
                year: upload.year,
                examType: upload.examType,
                studentCount: actualStudentCount,
                uniqueStudents: uniqueStudentCount,
                duplicateCount: duplicateCount,
                admittedCount: admittedCount,
                admissionRate: admissionRate,
                uploadedAt: upload.uploadedAt,
                sizeFormatted: sizeFormatted,
                status: actualStudentCount > 0 ? 'active' : 'no_data'
            }
        }))

        return NextResponse.json({
            success: true,
            files,
            totalFiles: files.length,
            message: `${files.length} fichier(s) trouvé(s)`
        })

    } catch (error: any) {
        console.error("❌ Error fetching files:", error)
        return NextResponse.json(
            {
                error: "Erreur lors de la récupération des fichiers",
                details: error.message
            },
            { status: 500 }
        )
    }
}
