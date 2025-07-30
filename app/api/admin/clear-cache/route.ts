import { NextRequest, NextResponse } from "next/server"

// Import cache clearing functions
let clearWilayasCache: (() => void) | null = null
let clearDatabaseInfoCache: (() => void) | null = null
let clearStatisticsCache: (() => void) | null = null

// Dynamically import to avoid circular dependencies
const getClearFunctions = async () => {
    if (!clearWilayasCache) {
        try {
            const wilayasModule = await import("../../wilayas/route")
            clearWilayasCache = wilayasModule.clearWilayasCache
        } catch (error) {
            console.error("Failed to import wilayas cache clear function:", error)
        }
    }

    if (!clearDatabaseInfoCache) {
        try {
            const dbInfoModule = await import("../database-info/route")
            clearDatabaseInfoCache = dbInfoModule.clearDatabaseInfoCache
        } catch (error) {
            console.error("Failed to import database-info cache clear function:", error)
        }
    }

    if (!clearStatisticsCache) {
        try {
            const statisticsModule = await import("../../statistics/route")
            clearStatisticsCache = statisticsModule.clearStatisticsCache
        } catch (error) {
            console.error("Failed to import statistics cache clear function:", error)
        }
    }

    return { clearWilayasCache, clearDatabaseInfoCache, clearStatisticsCache }
}

export async function POST() {
    try {
        console.log("🧹 Cache clear request received")

        // Clear all caches
        const { clearWilayasCache: clearWilayas, clearDatabaseInfoCache: clearDbInfo, clearStatisticsCache: clearStats } = await getClearFunctions()

        if (clearWilayas) {
            clearWilayas()
            console.log("💾 Wilayas cache cleared successfully")
        }

        if (clearDbInfo) {
            clearDbInfo()
            console.log("💾 Database info cache cleared successfully")
        }

        if (clearStats) {
            clearStats()
            console.log("💾 Statistics cache cleared successfully")
        }

        console.log("✅ All caches cleared successfully")

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