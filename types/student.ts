export interface Student {
    id?: string
    matricule: string
    nom_complet: string
    ecole: string
    etablissement: string
    moyenne: number
    rang: number
    admis: boolean
    decision_text: string
    section: string
    wilaya?: string
    rang_etablissement?: number
    year: number
    examType: "BAC" | "BREVET"
    lieu_nais?: string
    date_naiss?: string
    createdAt?: Date
    updatedAt?: Date
}

export interface DataUpload {
    id?: string
    year: number
    examType: "BAC" | "BREVET"
    fileName: string
    studentCount: number
    uploadedAt?: Date
}

export interface StudentSearchResult extends Student { }

export interface StatisticsData {
    totalStudents: number
    admittedStudents: number
    admissionRate: string
    sessionnaireRate: string
    averageScore: string
    sectionStats: Array<{
        name: string
        total: number
        admitted: number
        rate: string
    }>
    wilayaStats: Array<{
        name: string
        total: number
        admitted: number
        rate: string
    }>
    year: number
    examType: "BAC" | "BREVET"
}

export interface LeaderboardStudent {
    matricule: string
    nom_complet: string
    ecole: string
    etablissement: string
    moyenne: number
    rang: number
    wilaya?: string
    section: string
}
