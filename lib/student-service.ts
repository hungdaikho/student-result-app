import { prisma } from './prisma'
import { Student, DataUpload, StatisticsData, LeaderboardStudent } from '../types/student'
import { Student as PrismaStudent } from '@prisma/client'

// Helper để convert từ Prisma type sang interface type
function convertPrismaStudent(prismaStudent: PrismaStudent): Student {
    return {
        ...prismaStudent,
        wilaya: prismaStudent.wilaya || undefined,
        rang_etablissement: prismaStudent.rang_etablissement || undefined,
        lieu_nais: prismaStudent.lieu_nais || undefined,
        date_naiss: prismaStudent.date_naiss || undefined,
    }
}

export class StudentService {
    // Tìm học sinh theo matricule
    static async findStudentByMatricule(matricule: string, year: number, examType: "BAC" | "BREVET"): Promise<Student | null> {
        const student = await prisma.student.findUnique({
            where: {
                matricule_year_examType: {
                    matricule,
                    year,
                    examType
                }
            }
        })

        if (!student) return null
        return convertPrismaStudent(student)
    }

    // Lấy tất cả học sinh theo năm và loại thi
    static async getStudents(year?: number, examType?: "BAC" | "BREVET"): Promise<Student[]> {
        const where: any = {}

        if (year) where.year = year
        if (examType) where.examType = examType

        const students = await prisma.student.findMany({
            where,
            orderBy: {
                rang: 'asc'
            }
        })

        return students.map(convertPrismaStudent)
    }

    // Xóa dữ liệu theo năm và loại thi
    static async clearData(year: number, examType: "BAC" | "BREVET"): Promise<number> {
        const result = await prisma.$transaction(async (tx) => {
            const deleteResult = await tx.student.deleteMany({
                where: {
                    year,
                    examType
                }
            })

            await tx.dataUpload.deleteMany({
                where: {
                    year,
                    examType
                }
            })

            return deleteResult.count
        })

        return result
    }

    // Lấy thống kê
    static async getStatistics(year: number, examType: "BAC" | "BREVET"): Promise<StatisticsData> {
        const students = await prisma.student.findMany({
            where: {
                year,
                examType
            }
        })

        const totalStudents = students.length
        const admittedStudents = students?.filter(s => s.admis).length
        const admissionRate = totalStudents > 0 ? ((admittedStudents / totalStudents) * 100).toFixed(1) : "0.0"

        // Calculate sessionnaireRate (example: students with moyenne >= 10 but < passing grade)
        const sessionnaireStudents = students?.filter(s => !s.admis && s.moyenne >= 8).length
        const sessionnaireRate = totalStudents > 0 ? ((sessionnaireStudents / totalStudents) * 100).toFixed(1) : "0.0"

        const averageScore = totalStudents > 0 ?
            (students.reduce((sum, s) => sum + s.moyenne, 0) / totalStudents).toFixed(2) : "0.00"

        // Section statistics
        const sectionStats = students.reduce((acc, student) => {
            const section = student.section || 'Non spécifié'
            if (!acc[section]) {
                acc[section] = { total: 0, admitted: 0 }
            }
            acc[section].total++
            if (student.admis) acc[section].admitted++
            return acc
        }, {} as Record<string, { total: number, admitted: number }>)

        const sectionStatsArray = Object.entries(sectionStats)
            .map(([name, stats]) => ({
                name,
                total: stats.total,
                admitted: stats.admitted,
                rate: stats.total > 0 ? ((stats.admitted / stats.total) * 100).toFixed(1) : "0.0"
            }))
            ?.sort((a, b) => b.total - a.total)

        // Wilaya statistics
        const wilayaStats = students.reduce((acc, student) => {
            const wilaya = student.wilaya || 'Non spécifié'
            if (!acc[wilaya]) {
                acc[wilaya] = { total: 0, admitted: 0 }
            }
            acc[wilaya].total++
            if (student.admis) acc[wilaya].admitted++
            return acc
        }, {} as Record<string, { total: number, admitted: number }>)

        const wilayaStatsArray = Object.entries(wilayaStats)
            .map(([name, stats]) => ({
                name,
                total: stats.total,
                admitted: stats.admitted,
                rate: stats.total > 0 ? ((stats.admitted / stats.total) * 100).toFixed(1) : "0.0"
            }))
            ?.sort((a, b) => b.total - a.total)

        return {
            totalStudents,
            admittedStudents,
            admissionRate,
            sessionnaireRate,
            averageScore,
            sectionStats: sectionStatsArray,
            wilayaStats: wilayaStatsArray,
            year,
            examType
        }
    }

    // Lấy leaderboard  
    // For BAC: returns object grouped by sections with top 10 each
    // For BREVET: returns array of top 10 students (Top 10 Mauritanie)
    static async getLeaderboard(year: number, examType: "BAC" | "BREVET", limit: number = 100) {
        if (examType === "BAC") {
            // For BAC: return object grouped by sections with top 10 ADMITTED students each
            const students = await prisma.student.findMany({
                where: {
                    year,
                    examType,
                    admis: true  // ⭐ CHỈ LẤY HỌC SINH ĐÃ ĐƯỢC ADMIS
                },
                orderBy: {
                    moyenne: 'desc'  // ⭐ SẮP XẾP THEO ĐIỂM GIẢM DẦN
                },
                select: {
                    matricule: true,
                    nom_complet: true,
                    ecole: true,
                    etablissement: true,
                    moyenne: true,
                    rang: true,
                    wilaya: true,
                    section: true,
                    admis: true,
                    decision_text: true
                }
            })

            // Group by section and calculate stats
            const grouped: { [key: string]: any } = {}
            const sectionStats: { [key: string]: { total: number, admitted: number, totalScore: number } } = {}

            // First pass: collect all students by section
            for (const student of students) {
                const section = student.section || 'Other'

                // Initialize section array
                if (!grouped[section]) {
                    grouped[section] = []
                }

                // Add student to section (already sorted by moyenne desc)
                grouped[section].push({
                    matricule: student.matricule,
                    nom_complet: student.nom_complet,
                    ecole: student.ecole,
                    etablissement: student.etablissement,
                    moyenne: student.moyenne,
                    rang: student.rang,
                    wilaya: student.wilaya,
                    section: student.section,
                    admis: student.admis,
                    decision_text: student.decision_text
                })
            }

            // Second pass: limit to top 10 per section and calculate stats
            for (const [section, sectionStudents] of Object.entries(grouped)) {
                // Limit to top 10 students (highest scores first)
                grouped[section] = sectionStudents.slice(0, 10)

                // Calculate section stats based on ALL students in that section
                const whereCondition: any = {
                    year,
                    examType
                }

                if (section === 'Other') {
                    whereCondition.section = null
                } else {
                    whereCondition.section = section
                }

                const allSectionStudents = await prisma.student.findMany({
                    where: whereCondition
                })

                const totalInSection = allSectionStudents.length
                const admittedInSection = allSectionStudents.filter(s => s.admis).length
                const totalScoreInSection = allSectionStudents.reduce((sum, s) => sum + s.moyenne, 0)

                sectionStats[section] = {
                    total: totalInSection,
                    admitted: admittedInSection,
                    totalScore: totalScoreInSection
                }
            }

            // Add section statistics to each section
            const result: { [key: string]: any } = {}
            for (const [section, students] of Object.entries(grouped)) {
                const stats = sectionStats[section]
                result[section] = {
                    students: students,
                    stats: {
                        total: stats.total,
                        admitted: stats.admitted,
                        admissionRate: stats.total > 0 ? Number(((stats.admitted / stats.total) * 100).toFixed(1)) : 0,
                        averageScore: stats.total > 0 ? Number((stats.totalScore / stats.total).toFixed(2)) : 0
                    }
                }
            }

            return result
        } else {
            // For BREVET: return array of top 10 ADMITTED students only
            const students = await prisma.student.findMany({
                where: {
                    year,
                    examType,
                    admis: true  // ⭐ CHỈ LẤY HỌC SINH ĐÃ ĐƯỢC ADMIS
                },
                orderBy: {
                    moyenne: 'desc'  // ⭐ SẮP XẾP THEO ĐIỂM GIẢM DẦN
                },
                take: 10, // Always limit to top 10 for BREVET
                select: {
                    matricule: true,
                    nom_complet: true,
                    ecole: true,
                    etablissement: true,
                    moyenne: true,
                    rang: true,
                    wilaya: true,
                    section: true,
                    admis: true,
                    decision_text: true
                }
            })

            return students.map(student => ({
                matricule: student.matricule,
                nom_complet: student.nom_complet,
                ecole: student.ecole,
                etablissement: student.etablissement,
                moyenne: student.moyenne,
                rang: student.rang,
                wilaya: student.wilaya || undefined,
                section: student.section,
                admis: student.admis,
                decision_text: student.decision_text
            }))
        }
    }

    // Lấy học sinh theo wilaya
    static async getStudentsByWilaya(wilaya: string, year: number, examType: "BAC" | "BREVET"): Promise<Student[]> {
        const students = await prisma.student.findMany({
            where: {
                wilaya,
                year,
                examType
            },
            orderBy: {
                moyenne: 'desc'  // ⭐ SẮP XẾP THEO ĐIỂM GIẢM DẦN
            }
        })

        return students.map(convertPrismaStudent)
    }

    // Lấy học sinh theo wilaya với pagination
    static async getStudentsByWilayaPaginated(wilaya: string, year: number, examType: "BAC" | "BREVET", page: number, limit: number, section: string) {
        const offset = (page - 1) * limit

        // Build where condition
        const whereCondition: any = {
            wilaya,
            year,
            examType
        }

        if (section !== "all") {
            whereCondition.section = section
        }

        // Get total count
        const totalCount = await prisma.student.count({
            where: whereCondition
        })

        // Get students with pagination
        const students = await prisma.student.findMany({
            where: whereCondition,
            orderBy: {
                moyenne: 'desc'  // ⭐ SẮP XẾP THEO ĐIỂM GIẢM DẦN
            },
            skip: offset,
            take: limit,
            select: {
                matricule: true,
                nom_complet: true,
                moyenne: true,
                rang: true,
                admis: true,
                section: true,
                ecole: true,
                etablissement: true
            }
        })

        // Get statistics
        const allStudents = await prisma.student.findMany({
            where: {
                wilaya,
                year,
                examType
            },
            select: {
                admis: true,
                moyenne: true,
                section: true
            }
        })

        const admittedCount = allStudents.filter(s => s.admis).length
        const averageScore = allStudents.length > 0
            ? (allStudents.reduce((sum, s) => sum + s.moyenne, 0) / allStudents.length)
            : 0

        // Get unique sections
        const sections = [...new Set(allStudents.map(s => s.section))].sort()

        const totalPages = Math.ceil(totalCount / limit)

        return {
            students: students.map(student => ({
                matricule: student.matricule,
                nom_complet: student.nom_complet,
                moyenne: student.moyenne,
                rang: student.rang,
                admis: student.admis,
                section: student.section,
                ecole: student.ecole,
                etablissement: student.etablissement
            })),
            totalCount,
            totalPages,
            currentPage: page,
            admittedCount,
            averageScore: Number(averageScore.toFixed(2)),
            sections
        }
    }

    // Lấy học sinh theo école
    static async getStudentsBySchool(ecole: string, year: number, examType: "BAC" | "BREVET") {
        const students = await prisma.student.findMany({
            where: {
                etablissement: ecole,
                year,
                examType
            },
            orderBy: {
                moyenne: 'desc'  // ⭐ SẮP XẾP THEO ĐIỂM GIẢM DẦN
            },
            select: {
                matricule: true,
                nom_complet: true,
                moyenne: true,
                rang: true,
                rang_etablissement: true,
                admis: true,
                decision_text: true,
                section: true,
                wilaya: true
            }
        })

        return students.map(student => ({
            matricule: student.matricule,
            nom_complet: student.nom_complet,
            moyenne: student.moyenne,
            rang: student.rang,
            rang_etablissement: student.rang_etablissement || undefined,
            admis: student.admis,
            decision_text: student.decision_text,
            section: student.section,
            wilaya: student.wilaya || undefined
        }))
    }

    // Lấy danh sách các upload
    static async getUploadHistory(): Promise<DataUpload[]> {
        const uploads = await prisma.dataUpload.findMany({
            orderBy: {
                uploadedAt: 'desc'
            }
        })

        return uploads
    }

    // Lấy danh sách wilayas
    static async getWilayas(year: number, examType: "BAC" | "BREVET"): Promise<{ [key: string]: string[] }> {
        const students = await prisma.student.findMany({
            where: {
                year,
                examType,
                wilaya: {
                    not: null
                }
            },
            select: {
                wilaya: true,
                etablissement: true
            },
            distinct: ['wilaya', 'etablissement']
        })

        // Group establishments by wilaya
        const wilayaEstablishments: { [key: string]: Set<string> } = {}
        for (const student of students) {
            const wilaya = student.wilaya!
            const etablissement = student.etablissement

            if (!wilayaEstablishments[wilaya]) {
                wilayaEstablishments[wilaya] = new Set()
            }
            wilayaEstablishments[wilaya].add(etablissement)
        }

        // Convert Sets to sorted arrays
        const result: { [key: string]: string[] } = {}
        for (const [wilaya, establishments] of Object.entries(wilayaEstablishments)) {
            result[wilaya] = Array.from(establishments).sort()
        }

        return result
    }

    // Upload students data
    static async uploadStudents(students: Student[]): Promise<{ uploadedCount: number, errors: string[] }> {
        const errors: string[] = []
        let uploadedCount = 0

        try {
            // Create a transaction with timeout
            const result = await prisma.$transaction(async (tx) => {
                const BATCH_SIZE = 500 // Process in smaller batches for better performance

                for (let i = 0; i < students.length; i += BATCH_SIZE) {
                    const batch = students.slice(i, i + BATCH_SIZE)
                    console.log(`[StudentService] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(students.length / BATCH_SIZE)}`)

                    try {
                        // Try createMany first (fastest for new records)
                        await tx.student.createMany({
                            data: batch,
                            skipDuplicates: true
                        })
                        uploadedCount += batch.length
                        console.log(`[StudentService] Batch createMany successful for ${batch.length} students`)
                    } catch (error) {
                        console.log(`[StudentService] CreateMany failed, falling back to individual upserts for batch`)

                        // Fallback to individual upserts for duplicates
                        for (const student of batch) {
                            try {
                                await tx.student.upsert({
                                    where: {
                                        matricule_year_examType: {
                                            matricule: student.matricule,
                                            year: student.year,
                                            examType: student.examType
                                        }
                                    },
                                    update: student,
                                    create: student
                                })
                                uploadedCount++
                            } catch (upsertError: any) {
                                const errorMsg = `Failed to upsert student ${student.matricule}: ${upsertError.message}`
                                console.error(errorMsg)
                                errors.push(errorMsg)
                            }
                        }
                    }
                }

                return { uploadedCount, errors }
            }, {
                timeout: 300000, // 5 minutes timeout
                maxWait: 10000   // Wait up to 10 seconds to start
            })

            console.log(`[StudentService] Upload completed. Success: ${result.uploadedCount}, Errors: ${result.errors.length}`)
            return result

        } catch (error: any) {
            console.error(`[StudentService] Transaction failed:`, error)
            throw new Error(`Database transaction failed: ${error.message}`)
        }
    }

    // Save upload info
    static async saveUploadInfo(year: number, examType: "BAC" | "BREVET", fileName: string, studentCount: number): Promise<void> {
        try {
            await prisma.dataUpload.upsert({
                where: {
                    year_examType: {
                        year,
                        examType
                    }
                },
                update: {
                    fileName,
                    studentCount,
                    uploadedAt: new Date()
                },
                create: {
                    year,
                    examType,
                    fileName,
                    studentCount
                }
            })
        } catch (error: any) {
            console.error(`[StudentService] Failed to save upload info:`, error)
            throw new Error(`Failed to save upload info: ${error.message}`)
        }
    }
}
