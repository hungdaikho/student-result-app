import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(
    request: NextRequest,
    { params }: { params: { fileId: string } }
) {
    try {
        const fileId = params.fileId
        console.log(`📥 File details request for ID: ${fileId}`)

        // Get upload info
        const upload = await prisma.dataUpload.findUnique({
            where: {
                id: fileId
            }
        })

        if (!upload) {
            return NextResponse.json(
                { error: "Fichier non trouvé" },
                { status: 404 }
            )
        }

        // Get related students count and stats
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

        // Get sections
        const sections = await prisma.student.findMany({
            where: {
                year: upload.year,
                examType: upload.examType
            },
            select: {
                section: true
            },
            distinct: ['section']
        })

        const fileDetails = {
            id: upload.id,
            fileName: upload.fileName,
            year: upload.year,
            examType: upload.examType,
            studentCount: upload.studentCount,
            uploadedAt: upload.uploadedAt,
            actualStudentCount: studentsStats._count._all,
            averageScore: studentsStats._avg.moyenne ? Number(studentsStats._avg.moyenne.toFixed(2)) : 0,
            admittedCount,
            admissionRate: studentsStats._count._all > 0
                ? Number(((admittedCount / studentsStats._count._all) * 100).toFixed(1))
                : 0,
            sections: sections.map(s => s.section).filter(Boolean),
            status: studentsStats._count._all > 0 ? 'active' : 'no_data'
        }

        return NextResponse.json({
            success: true,
            file: fileDetails
        })

    } catch (error: any) {
        console.error("❌ Error fetching file details:", error)
        return NextResponse.json(
            {
                error: "Erreur lors de la récupération des détails du fichier",
                details: error.message
            },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { fileId: string } }
) {
    try {
        const fileId = params.fileId
        console.log(`🗑️ Delete file request for ID: ${fileId}`)

        // Get upload info first
        const upload = await prisma.dataUpload.findUnique({
            where: {
                id: fileId
            }
        })

        if (!upload) {
            return NextResponse.json(
                { error: "Fichier non trouvé" },
                { status: 404 }
            )
        }

        // Delete in transaction
        const result = await prisma.$transaction(async (tx) => {
            // Delete all students for this year and exam type
            const deletedStudents = await tx.student.deleteMany({
                where: {
                    year: upload.year,
                    examType: upload.examType
                }
            })

            // Delete the upload record
            await tx.dataUpload.delete({
                where: {
                    id: fileId
                }
            })

            return {
                deletedStudents: deletedStudents.count,
                deletedUpload: upload
            }
        })

        console.log(`✅ Successfully deleted file and ${result.deletedStudents} students`)

        return NextResponse.json({
            success: true,
            message: `Fichier supprimé avec succès. ${result.deletedStudents} étudiants supprimés.`,
            deletedFile: {
                id: upload.id,
                fileName: upload.fileName,
                year: upload.year,
                examType: upload.examType,
                deletedStudentsCount: result.deletedStudents
            }
        })

    } catch (error: any) {
        console.error("❌ Error deleting file:", error)
        return NextResponse.json(
            {
                error: "Erreur lors de la suppression du fichier",
                details: error.message
            },
            { status: 500 }
        )
    }
}
