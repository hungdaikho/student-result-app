import { NextRequest, NextResponse } from "next/server"

// Import cache clearing functions
let clearWilayasCache: (() => void) | null = null

// Dynamically import to avoid circular dependencies
const getClearFunction = async () => {
    if (!clearWilayasCache) {
        try {
            const wilayasModule = await import("../../wilayas/route")
            clearWilayasCache = wilayasModule.clearWilayasCache
        } catch (error) {
            console.error("Failed to import wilayas cache clear function:", error)
        }
    }
    return clearWilayasCache
}

export async function POST() {
    try {
        console.log("🧹 Cache clear request received")

        // Clear wilayas cache
        const clearFn = await getClearFunction()
        if (clearFn) {
            clearFn()
            console.log("💾 Wilayas cache cleared successfully")
        }

        return NextResponse.json({
            success: true,
            message: "All caches cleared successfully. Fresh data will be loaded on next request.",
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