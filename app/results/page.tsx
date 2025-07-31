"use client";

import { CardDescription } from "@/components/ui/card";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building,
  Trophy,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CircularProgress } from "@/components/circular-progress";
import { CelebrationAnimation } from "@/components/celebration-animation";

interface Student {
  matricule: string;
  nom_complet: string;
  ecole: string;
  etablissement: string;
  moyenne: number;
  rang: number;
  admis: boolean;
  decision_text: string;
  section: string;
  wilaya?: string;
  rang_etablissement?: number;
  year?: number;
  examType?: "BAC" | "BREVET";
}

interface Rankings {
  matricule: string;
  moyenne: number;
  section?: string;
  etablissement: string;
  // For BAC
  sectionRank?: number;
  totalInSection?: number;
  schoolRank?: number;
  totalInSchool?: number;
  // For BREVET
  generalRank?: number;
  totalStudents?: number;
}

// Add request cache to avoid duplicate API calls
const requestCache = new Map<string, Promise<any>>();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

function getCachedRequest(url: string): Promise<any> {
  if (requestCache.has(url)) {
    return requestCache.get(url)!;
  }

  const request = fetch(url).then(async (response) => {
    if (response.ok) {
      return response.json();
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  });

  requestCache.set(url, request);

  // Clear cache after duration
  setTimeout(() => {
    requestCache.delete(url);
  }, CACHE_DURATION);

  return request;
}

export default function ResultsPage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [rankings, setRankings] = useState<Rankings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCelebration, setShowCelebration] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const matricule = searchParams.get("matricule");
  const returnTo = searchParams.get("returnTo");
  const year = searchParams.get("year") || "2024";
  const examType = (searchParams.get("examType") as "BAC" | "BREVET") || "BAC";

  // Handle window size detection safely
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    // Initial check
    checkMobile();

    // Add resize listener
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (matricule) {
      fetchStudentResult(matricule);
    }
  }, [matricule]);

  const fetchStudentResult = async (matricule: string) => {
    try {
      setLoading(true);
      const studentUrl = `/api/search?matricule=${encodeURIComponent(
        matricule
      )}&year=${year}&examType=${examType}`;

      // Fetch student data
      const studentData = await getCachedRequest(studentUrl);
      setStudent(studentData);

      // Fetch rankings
      const rankingUrl = `/api/ranking?matricule=${encodeURIComponent(
        matricule
      )}&year=${year}&examType=${examType}`;
      const rankingData = await getCachedRequest(rankingUrl);
      setRankings(rankingData);

      // Show celebration animation if student is admitted (for both BAC and BREVET)
      if (studentData.admis) {
        setTimeout(() => setShowCelebration(true), 800);
      }
      setError("");
    } catch (error) {
      console.error("Error fetching student:", error);
      setError("Étudiant non trouvé");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (returnTo) {
      router.push(returnTo);
    } else {
      router.push("/");
    }
  };

  const handleEstablishmentClick = (etablissement: string) => {
    router.push(
      `/school?name=${encodeURIComponent(
        etablissement
      )}&year=${year}&examType=${examType}`
    );
  };

  const getDecisionIcon = (decisionText: string) => {
    const decision = decisionText?.toLowerCase();
    if (
      decision?.includes("admis") ||
      decision?.includes("reussi") ||
      decision === "r"
    ) {
      return <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />;
    } else if (
      decision?.includes("sessionnaire") ||
      decision?.includes("sessionn")
    ) {
      return <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />;
    }
    return <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />;
  };

  const getDecisionTextColor = (decisionText: string) => {
    const decision = decisionText?.toLowerCase();
    if (
      decision?.includes("admis") ||
      decision?.includes("reussi") ||
      decision === "r"
    ) {
      return "text-blue-700";
    } else if (
      decision?.includes("sessionnaire") ||
      decision?.includes("sessionn")
    ) {
      return "text-blue-700";
    }
    return "text-red-700";
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return "bg-yellow-500 hover:bg-yellow-600";
    if (rank === 2) return "bg-gray-400 hover:bg-gray-500";
    if (rank === 3) return "bg-amber-600 hover:bg-amber-700";
    return "bg-blue-500 hover:bg-blue-600";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des résultats...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50 flex items-center justify-center">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="mb-4 sm:mb-6">
            <Button
              onClick={handleBack}
              variant="outline"
              className="border-blue-300 text-blue-600 hover:bg-blue-50 bg-transparent text-sm sm:text-base focus:outline-none"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </div>
          <Card className="max-w-md mx-auto shadow-xl border-blue-200">
            <CardContent className="p-6 sm:p-8 text-center">
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Erreur
              </h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button
                onClick={handleBack}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Retour à l'accueil
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50 flex items-center justify-center">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="mb-4 sm:mb-6">
            <Button
              onClick={handleBack}
              variant="outline"
              className="border-blue-300 text-blue-600 hover:bg-blue-50 bg-transparent text-sm sm:text-base focus:outline-none"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </div>
          <Card className="max-w-md mx-auto shadow-xl border-blue-200">
            <CardContent className="p-6 sm:p-8 text-center">
              <XCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Aucun résultat
              </h3>
              <p className="text-gray-600 mb-4">
                Aucun étudiant trouvé avec ce matricule.
              </p>
              <Button
                onClick={handleBack}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Retour à l'accueil
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50 relative overflow-hidden">
      {/* Celebration Animation - Now for both BAC and BREVET */}
      <CelebrationAnimation
        show={showCelebration}
        onComplete={() => setShowCelebration(false)}
      />

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 relative z-10">
        <div className="mb-4 sm:mb-6">
          <Button
            onClick={handleBack}
            variant="outline"
            className="border-blue-300 text-blue-600 hover:bg-blue-50 bg-transparent text-sm sm:text-base focus:outline-none"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>

        {/* Modern Header Card with Blue Background */}
        <Card className="shadow-xl border-blue-200 mb-6">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg p-4 sm:p-6">
            <div className="text-center">
              <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold mb-2">
                {student.nom_complet}
              </CardTitle>
              <CardDescription className="text-blue-100 text-sm sm:text-base">
                {student.matricule} •{" "}
                {examType === "BREVET" ? "BREVET" : student.section}
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        {/* Main Content Grid - Mobile First */}
        <div className="grid gap-4 sm:gap-6">
          {/* Decision Section - Different for BAC and BREVET */}
          <Card className="shadow-lg border-blue-200">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 sm:p-6">
              <CardTitle className="flex items-center text-base sm:text-lg">
                <Trophy className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                {examType === "BREVET" ? "Résultat" : "Décision"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-center">
                <CircularProgress
                  value={student.moyenne}
                  label={examType === "BREVET" ? "" : student.decision_text}
                  className="mb-4"
                  size={isMobile ? 180 : 220}
                  strokeWidth={isMobile ? 14 : 18}
                />
              </div>
              <div className="text-center">
                {examType === "BREVET" ? (
                  // For BREVET - Just show the score
                  <div>
                    <p className="text-lg sm:text-xl font-bold text-blue-600 mb-2">
                      Note:{" "}
                      {student.moyenne ? student.moyenne.toFixed(2) : "0.00"}/20
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      {getDecisionIcon(student.decision_text)}
                      <span
                        className={`text-lg sm:text-xl font-bold ${getDecisionTextColor(
                          student.decision_text
                        )}`}
                      >
                        {student.decision_text}
                      </span>
                    </div>
                  </div>
                ) : (
                  // For BAC - Show decision and score
                  <div>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      {getDecisionIcon(student.decision_text)}
                      <span
                        className={`text-lg sm:text-xl font-bold ${getDecisionTextColor(
                          student.decision_text
                        )}`}
                      >
                        {student.decision_text}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Note:{" "}
                      {student.moyenne ? student.moyenne.toFixed(2) : "0.00"}/20
                    </p>
                  </div>
                )}

                {/* Animated Result Image */}
                <div className="mt-6 flex justify-center">
                  {student.admis ? (
                    // Success Animation - Student Passed
                    <div className="relative">
                      <div className="animate-bounce">
                        <div className="relative w-24 h-24 sm:w-32 sm:h-32">
                          {/* Graduation Cap */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <svg
                              className="w-16 h-16 sm:w-20 sm:h-20 text-green-500 animate-pulse"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M12 2l8.09 2.69L12 7.69 3.91 4.69 12 2M12 9.69l8.09-2.69v4.81c0 3.31-2.69 6-6.09 6s-6.09-2.69-6.09-6V7l6.09 2.69z" />
                            </svg>
                          </div>
                          {/* Success Stars */}
                          <div className="absolute -top-2 -right-2 animate-spin">
                            <svg
                              className="w-6 h-6 text-yellow-400"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          </div>
                          <div
                            className="absolute -bottom-2 -left-2 animate-spin"
                            style={{ animationDelay: "0.5s" }}
                          >
                            <svg
                              className="w-4 h-4 text-yellow-400"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      {/* <div className="text-center mt-2">
                        <p className="text-green-600 font-bold text-sm animate-pulse">
                          Félicitations!
                        </p>
                      </div> */}
                    </div>
                  ) : (
                    // Failure Animation - Student Failed
                    <div className="relative">
                      <div className="animate-pulse">
                        <div className="relative w-24 h-24 sm:w-32 sm:h-32">
                          {/* Sad Book */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <svg
                              className="w-16 h-16 sm:w-20 sm:h-20 text-red-500"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
                            </svg>
                          </div>
                          {/* Tear Drops */}
                          <div
                            className="absolute top-6 left-8 animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          >
                            <div className="w-2 h-3 bg-blue-400 rounded-full transform rotate-45"></div>
                          </div>
                          <div
                            className="absolute top-8 right-8 animate-bounce"
                            style={{ animationDelay: "0.7s" }}
                          >
                            <div className="w-2 h-3 bg-blue-400 rounded-full transform rotate-45"></div>
                          </div>
                        </div>
                      </div>
                      <div className="text-center mt-2">
                        <p className="text-red-600 font-bold text-sm">
                          Courage!
                        </p>
                        <p className="text-gray-500 text-xs">Prochaine fois</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Compact Info Grid */}
          <div className="space-y-4">
            {/* Establishment - MOVED TO FIRST */}
            <div className="max-w-md mx-auto">
              <Card className="shadow-lg border-blue-200">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Building className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="text-xs text-gray-600 mb-1 font-bold">
                    Établissement
                  </p>
                  <button
                    onClick={() =>
                      handleEstablishmentClick(student.etablissement)
                    }
                    className="text-sm sm:text-base font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors text-center break-words focus:outline-none"
                    title={student.etablissement}
                  >
                    {student.etablissement}
                  </button>
                </CardContent>
              </Card>
            </div>

            {/* Ranking Cards - Full width on mobile */}
            {rankings && examType === "BAC" ? (
              // For BAC - Show both section ranking and school ranking
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                {/* Section Ranking */}
                <Card className="shadow-lg border-blue-200">
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Trophy className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-xs text-gray-600 mb-1 font-bold">
                      Classement Section
                    </p>
                    <div
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold text-white ${getRankBadgeColor(
                        rankings.sectionRank || 0
                      )}`}
                    >
                      #{rankings.sectionRank}
                    </div>
                  </CardContent>
                </Card>

                {/* School Ranking */}
                {rankings.schoolRank && (
                  <Card className="shadow-lg border-blue-200">
                    <CardContent className="p-4 text-center">
                      <div className="flex items-center justify-center mb-2">
                        <Building className="h-5 w-5 text-blue-600" />
                      </div>
                      <p className="text-xs text-gray-600 mb-1 font-bold">
                        Classement École
                      </p>
                      <div
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold text-white ${getRankBadgeColor(
                          rankings.schoolRank
                        )}`}
                      >
                        #{rankings.schoolRank}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : rankings && examType === "BREVET" ? (
              // For BREVET - Show only general ranking (all students) - Full width on mobile
              <div className="w-full">
                <Card className="shadow-lg border-blue-200">
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Trophy className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-xs text-gray-600 mb-1 font-bold">
                      Classement Général
                    </p>
                    <div
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold text-white ${getRankBadgeColor(
                        rankings.generalRank || 0
                      )}`}
                    >
                      #{rankings.generalRank}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </div>

          {/* APP DOWNLOAD & SOCIAL MEDIA SECTION */}
        </div>
      </div>
    </div>
  );
}
