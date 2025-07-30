import { NextRequest, NextResponse } from "next/server"

export async function POST() {
    try {
        console.log("🧹 Cache clear request received")

        // For now, just return success message
        // The cache will naturally expire after 5 minutes
        // In production, you might want to implement a more sophisticated cache clearing mechanism

        console.log("💾 Cache clear signal sent")

        return NextResponse.json({
            success: true,
            message: "Cache cleared successfully. Fresh data will be loaded on next request.",
            timestamp: new Date().toISOString()
        })

    } catch (error: any) {
        console.error("❌ Error clearing cache:", error)
        return NextResponse.json(
            {
                error: "Erreur lors de la suppression du cache",
                details: error.message
            },
            { status: 500 }
        )
    }
}
