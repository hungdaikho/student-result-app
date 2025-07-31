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
  const [threshold, setThreshold] = useState<number | null>(null);
  const fetchThresHold = async () => {
    try {
      setLoading(true);
      const url = `/api/admin/score-threshold?year=${year}&examType=${examType}`;
      const data = await getCachedRequest(url);
      if (data.data[0] && data.data[0].threshold) {
        setThreshold(data.data[0].threshold);
      } else {
        setThreshold(null);
      }
    } catch (error) {
      console.error("Error fetching threshold:", error);
      setError("Erreur lors de la récupération du seuil de score");
      setThreshold(null);
    } finally {
      setLoading(false);
    }
  };
  const renderAdmis = (score: number) => {
    if (!threshold) return "";
    try {
      // Làm tròn score và threshold tới 2 chữ số thập phân
      const roundedScore = parseFloat(score.toFixed(2));
      const roundedThreshold = parseFloat(threshold.toFixed(2));

      return roundedScore >= roundedThreshold ? "Admis" : "Ajourné";
    } catch (error) {
      return "Admis";
    }
  };
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
    fetchThresHold();
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

  const getDecisionIcon = (decisionText: string, monyenne?: any) => {
    if (monyenne) {
      if (renderAdmis(monyenne) === "Admis") {
        return <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />;
      } else {
        return <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />;
      }
    }
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

  const getDecisionTextColor = (decisionText: string, moyenne?: any) => {
    if (moyenne) {
      if (renderAdmis(moyenne) === "Admis") {
        return "text-blue-700";
      } else {
        return "text-red-700";
      }
    }
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
  const renderIcon = (admis: boolean, monyenne: any) => {
    if (threshold) {
      return renderAdmis(monyenne) === "Admis";
    } else {
      return admis;
    }
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
                  label={
                    examType === "BREVET"
                      ? ""
                      : threshold
                      ? renderAdmis(student.moyenne)
                      : student.decision_text
                  }
                  className={`mb-4 ${
                    threshold
                      ? getDecisionTextColor(
                          student.decision_text,
                          student.moyenne
                        )
                      : ""
                  }`}
                  size={isMobile ? 180 : 220}
                  strokeWidth={isMobile ? 14 : 18}
                  color={
                    threshold
                      ? getDecisionTextColor(
                          student.decision_text,
                          student.moyenne
                        )
                      : ""
                  }
                />
              </div>
              <div className="text-center">
                {examType === "BREVET" ? (
                  // For BREVET - Just show the score
                  threshold ? (
                    <div>
                      <p className="text-lg sm:text-xl font-bold text-blue-600 mb-2">
                        Note:{" "}
                        {student.moyenne ? student.moyenne.toFixed(2) : "0.00"}
                        /20
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        {getDecisionIcon(
                          student.decision_text,
                          student.moyenne
                        )}
                        <span
                          className={`text-lg sm:text-xl font-bold ${getDecisionTextColor(
                            student.decision_text,
                            student.moyenne
                          )}`}
                        >
                          {renderAdmis(student.moyenne)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-lg sm:text-xl font-bold text-blue-600 mb-2">
                        Note:{" "}
                        {student.moyenne ? student.moyenne.toFixed(2) : "0.00"}
                        /20
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
                  )
                ) : // For BAC - Show decision and score
                threshold ? (
                  <div>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      {getDecisionIcon(student.decision_text, student.moyenne)}
                      <span
                        className={`text-lg sm:text-xl font-bold ${getDecisionTextColor(
                          student.decision_text,
                          student.moyenne
                        )}`}
                      >
                        {renderAdmis(student.moyenne)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Note:{" "}
                      {student.moyenne ? student.moyenne.toFixed(2) : "0.00"}/20
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      {getDecisionIcon(student.decision_text, student.moyenne)}
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
                  {renderIcon(student.admis, student.moyenne) ? (
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
                      <div className="text-center mt-2">
                        <p className="text-green-600 font-bold text-sm animate-pulse">
                          Félicitations!
                        </p>
                      </div>
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
          <div className="mt-8 sm:mt-12">
            <div className="flex items-center justify-center mb-6 sm:mb-8">
              <div className="relative">
                <div className="relative bg-white rounded-xl px-4 sm:px-6 md:px-8 py-3 sm:py-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center">
                    <div className="relative mr-3 sm:mr-4">
                      <svg
                        className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold bg-gradient-to-r from-gray-800 via-blue-600 to-blue-600 bg-clip-text text-transparent">
                        Application & Réseaux Sociaux
                      </h2>
                      <div className="h-1 w-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full mt-2"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* App Download Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mb-8">
              {/* App Store Button */}
              <a
                href="https://apps.apple.com/eg/app/%D9%85%D8%AF%D8%B1%D8%B3%D8%AA%D9%8A-medrasti/id6741432147"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <div className="mr-3">
                  <svg
                    className="w-8 h-8"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-300">Télécharger sur</div>
                  <div className="text-lg font-semibold">App Store</div>
                </div>
              </a>

              {/* Google Play Button */}
              <a
                href="https://play.google.com/store/apps/details?id=com.nzamk.madrasty"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <div className="mr-3">
                  <svg
                    className="w-8 h-8"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-green-100">Disponible sur</div>
                  <div className="text-lg font-semibold">Google Play</div>
                </div>
              </a>
            </div>

            {/* Social Media Links */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mb-6">
              {/* YouTube Button */}
              <a
                href="https://youtube.com/@medrasti"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl w-full sm:w-auto justify-center"
              >
                <div className="mr-3">
                  <svg
                    className="w-8 h-8"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-red-100">Regardez sur</div>
                  <div className="text-lg font-semibold">YouTube</div>
                </div>
              </a>

              {/* Facebook Button */}
              <a
                href="https://www.facebook.com/Medrasti/"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl w-full sm:w-auto justify-center"
              >
                <div className="mr-3">
                  <svg
                    className="w-8 h-8"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-blue-100">Suivez sur</div>
                  <div className="text-lg font-semibold">Facebook</div>
                </div>
              </a>

              {/* TikTok Button */}
              <a
                href="https://www.tiktok.com/@medrasti"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl w-full sm:w-auto justify-center"
              >
                <div className="mr-3">
                  <svg
                    className="w-8 h-8"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-300">Découvrez sur</div>
                  <div className="text-lg font-semibold">TikTok</div>
                </div>
              </a>
            </div>

            {/* Description */}
            <div className="text-center max-w-2xl mx-auto">
              <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                Accédez facilement à vos résultats depuis votre mobile et restez
                connecté avec nous sur les réseaux sociaux pour les dernières
                actualités.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
