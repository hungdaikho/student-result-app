import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Force dynamic rendering for this API route
export const dynamic = "force-dynamic"

interface ScoreThresholdRequest {
    year: number
    examType: "BAC" | "BREVET"
    threshold: number
    description?: string
}

// GET: Lấy tất cả điểm chuẩn hoặc theo filter
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const year = searchParams.get('year')
        const examType = searchParams.get('examType') as "BAC" | "BREVET" | null

        // Build filter object
        const where: any = {}
        if (year) where.year = parseInt(year)
        if (examType) where.examType = examType

        const thresholds = await prisma.scoreThreshold.findMany({
            where,
            orderBy: [
                { year: 'desc' },
                { examType: 'asc' }
            ]
        })

        return NextResponse.json({
            success: true,
            data: thresholds,
            count: thresholds.length
        })

    } catch (error) {
        console.error("❌ Error fetching score thresholds:", error)
        return NextResponse.json(
            {
                success: false,
                error: "Failed to fetch score thresholds",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        )
    }
}

// POST: Tạo hoặc cập nhật điểm chuẩn
export async function POST(request: NextRequest) {
    try {
        const body: ScoreThresholdRequest = await request.json()

        // Validate required fields
        if (!body.year || !body.examType || body.threshold === undefined) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Missing required fields: year, examType, threshold"
                },
                { status: 400 }
            )
        }

        // Validate examType
        if (!["BAC", "BREVET"].includes(body.examType)) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid examType. Must be BAC or BREVET"
                },
                { status: 400 }
            )
        }

        // Validate threshold
        if (typeof body.threshold !== 'number' || body.threshold < 0 || body.threshold > 20) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid threshold. Must be a number between 0 and 20"
                },
                { status: 400 }
            )
        }

        // Use upsert to create or update
        const threshold = await prisma.scoreThreshold.upsert({
            where: {
                year_examType: {
                    year: body.year,
                    examType: body.examType
                }
            },
            update: {
                threshold: body.threshold,
                description: body.description || null,
                updatedAt: new Date()
            },
            create: {
                year: body.year,
                examType: body.examType,
                threshold: body.threshold,
                description: body.description || null
            }
        })

        return NextResponse.json({
            success: true,
            data: threshold,
            message: "Score threshold saved successfully"
        })

    } catch (error) {
        console.error("❌ Error saving score threshold:", error)
        return NextResponse.json(
            {
                success: false,
                error: "Failed to save score threshold",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        )
    }
}

// PUT: Cập nhật điểm chuẩn theo ID
export async function PUT(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json(
                { success: false, error: "Missing threshold ID" },
                { status: 400 }
            )
        }

        const body: Partial<ScoreThresholdRequest> = await request.json()

        // Validate threshold if provided
        if (body.threshold !== undefined && (typeof body.threshold !== 'number' || body.threshold < 0 || body.threshold > 20)) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid threshold. Must be a number between 0 and 20"
                },
                { status: 400 }
            )
        }

        const threshold = await prisma.scoreThreshold.update({
            where: { id },
            data: {
                ...body,
                updatedAt: new Date()
            }
        })

        return NextResponse.json({
            success: true,
            data: threshold,
            message: "Score threshold updated successfully"
        })

    } catch (error) {
        console.error("❌ Error updating score threshold:", error)
        return NextResponse.json(
            {
                success: false,
                error: "Failed to update score threshold",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        )
    }
}

// DELETE: Xóa điểm chuẩn
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json(
                { success: false, error: "Missing threshold ID" },
                { status: 400 }
            )
        }

        await prisma.scoreThreshold.delete({
            where: { id }
        })

        return NextResponse.json({
            success: true,
            message: "Score threshold deleted successfully"
        })

    } catch (error) {
        console.error("❌ Error deleting score threshold:", error)
        return NextResponse.json(
            {
                success: false,
                error: "Failed to delete score threshold",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        )
    }
}
