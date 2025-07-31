"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  Trophy,
  Users,
  TrendingUp,
  Target,
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Star,
  Globe,
  AlertCircle,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";

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
  year: number;
  examType: "BAC" | "BREVET";
}

interface LeaderboardData {
  [section: string]: Student[];
}

interface WilayaData {
  [wilaya: string]: string[];
}

interface SectionStat {
  name: string;
  total: number;
  admitted: number;
  rate: string;
}

interface WilayaStat {
  name: string;
  total: number;
  admitted: number;
  rate: string;
}

interface Statistics {
  totalStudents: number;
  admittedStudents: number;
  admissionRate: string;
  sessionnaireRate: string;
  sections: string[];
  wilayas: string[];
  averageScore: string;
  sectionStats: SectionStat[];
  wilayaStats: WilayaStat[];
  message?: string;
}

// Section mapping and ordering for BAC
const SECTION_MAPPING: { [key: string]: string } = {
  "Sciences naturelles": "SN",
  SN: "SN",
  sn: "SN",
  Mathématiques: "M",
  M: "M",
  "Lettres modernes": "LM",
  LM: "LM",
  Lettres: "LM",
  LO: "LO",
  Économie: "TS",
  TS: "TS",
};

// Preferred section order for BAC
const SECTION_ORDER = ["SN", "M", "LM", "LO", "TS"];

// Available years and exam types - Updated range and default
const availableYears = [2022, 2023, 2024, 2025]; // Added 2022 and updated to 2025
const examTypes = ["BAC", "BREVET"] as const;

// Set default year to 2025
const defaultYear = 2025;

// Storage keys for persistence
const STORAGE_KEYS = {
  SELECTED_YEAR: "selectedYear",
  SELECTED_EXAM_TYPE: "selectedExamType",
};

export default function HomePage() {
  // Initialize state with defaults (no localStorage access during SSR)
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);
  const [selectedExamType, setSelectedExamType] = useState<"BAC" | "BREVET">(
    "BAC"
  );
  const [isHydrated, setIsHydrated] = useState(false);

  const [searchMatricule, setSearchMatricule] = useState("");
  const [selectedWilaya, setSelectedWilaya] = useState("");
  const [selectedEstablishment, setSelectedEstablishment] = useState("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | any>({});
  const [wilayaData, setWilayaData] = useState<WilayaData>({});
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState("");
  const [noDataMessage, setNoDataMessage] = useState("");
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isAutoSliding, setIsAutoSliding] = useState(true);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Touch/swipe handling
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  // Minimum swipe distance
  const minSwipeDistance = 50;

  // Persist selections to localStorage
  const handleYearChange = (year: string) => {
    const yearNum = Number.parseInt(year);
    setSelectedYear(yearNum);
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_YEAR, year);
    }
  };

  const handleExamTypeChange = (examType: "BAC" | "BREVET") => {
    setSelectedExamType(examType);
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_EXAM_TYPE, examType);
    }
    // Reset slide index when changing exam type
    setCurrentSlideIndex(0);
  };

  // Handle hydration and localStorage
  useEffect(() => {
    setIsHydrated(true);
    // Only access localStorage after hydration
    const storedYear = localStorage.getItem(STORAGE_KEYS.SELECTED_YEAR);
    const storedExamType = localStorage.getItem(
      STORAGE_KEYS.SELECTED_EXAM_TYPE
    );

    if (storedYear) {
      setSelectedYear(Number.parseInt(storedYear));
    }
    if (storedExamType) {
      setSelectedExamType(storedExamType as "BAC" | "BREVET");
    }
  }, []);

  useEffect(() => {
    // Only fetch data after hydration is complete
    if (isHydrated) {
      fetchLeaderboard();
      fetchWilayaData();
      fetchStatistics();
    }
  }, [selectedYear, selectedExamType, isHydrated]);

  // Handle page scroll when search is focused
  useEffect(() => {
    if (isSearchFocused && pageRef.current) {
      // Smooth scroll the page up when search is focused
      const scrollOffset = window.innerWidth < 640 ? 120 : 80;
      window.scrollTo({
        top: Math.max(0, window.scrollY - scrollOffset),
        behavior: "smooth",
      });
    }
  }, [isSearchFocused]);

  // Ajouter un bouton de rafraîchissement et améliorer la gestion des erreurs
  const fetchLeaderboard = async () => {
    try {
      setError("");
      setNoDataMessage("");
      setLoading(true);

      console.log(
        `🔍 Fetching leaderboard for ${selectedExamType} ${selectedYear}`
      );

      const response = await fetch(
        `/api/leaderboard?year=${selectedYear}&examType=${selectedExamType}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType?.includes("application/json")) {
        throw new Error("Response is not JSON");
      }

      const data = await response.json();
      console.log("📊 Leaderboard data received:", data);

      // Check if there's a special message (for current year with no data)
      if (data.message) {
        setNoDataMessage(data.message);
        setLeaderboard({});
        setError("");
        return;
      }

      if (selectedExamType === "BREVET") {
        // For BREVET, data should be an array of students
        if (Array.isArray(data) && data.length > 0) {
          console.log("✅ BREVET data is array with", data.length, "students");
          setLeaderboard({ "Top 10 Mauritanie": data });
          setError("");
          setNoDataMessage("");
        } else {
          console.log("❌ BREVET data is empty or invalid:", data);
          setLeaderboard({});
          setError(
            `Aucune donnée disponible pour ${selectedExamType} ${selectedYear} pour le moment`
          );
        }
      } else {
        // For BAC, data should be an object with sections
        const hasValidData =
          data &&
          typeof data === "object" &&
          !Array.isArray(data) &&
          Object.keys(data).length > 0 &&
          Object.values(data).some(
            (section: any) =>
              section &&
              section.students &&
              Array.isArray(section.students) &&
              section.students.length > 0
          );

        if (!hasValidData) {
          console.log("❌ BAC data is empty or invalid:", data);
          setLeaderboard({});
          setError(
            `Aucune donnée disponible pour ${selectedExamType} ${selectedYear} pour le moment`
          );
        } else {
          console.log("✅ BAC data is valid with sections:", Object.keys(data));
          // BAC - Filter out unwanted sections and apply ordering
          const filteredData: LeaderboardData = {};

          // Get sections in preferred order
          const orderedSections = SECTION_ORDER?.filter((sectionCode) => {
            // Find matching section in data
            return Object.keys(data).some((section) => {
              const mappedSection = SECTION_MAPPING[section] || section;
              return (
                mappedSection === sectionCode &&
                data[section] &&
                data[section].students &&
                Array.isArray(data[section].students) &&
                data[section].students.length > 0
              );
            });
          });

          // Add sections in order
          orderedSections.forEach((sectionCode) => {
            const matchingSection = Object.keys(data).find((section) => {
              const mappedSection = SECTION_MAPPING[section] || section;
              return mappedSection === sectionCode;
            });
            if (matchingSection && data[matchingSection]) {
              // Extract students array for compatibility with existing UI
              filteredData[matchingSection] =
                data[matchingSection].students || [];
              // Store stats for later use
              if (data[matchingSection].stats) {
                filteredData[`${matchingSection}_stats`] =
                  data[matchingSection].stats;
              }
            }
          });

          // Add any remaining sections not in the preferred order
          Object.keys(data).forEach((section) => {
            const mappedSection = SECTION_MAPPING[section] || section;
            if (
              !SECTION_ORDER?.includes(mappedSection) &&
              section !== "Sciences" &&
              section !== "sn" &&
              data[section] &&
              data[section].students &&
              Array.isArray(data[section].students) &&
              data[section].students.length > 0
            ) {
              filteredData[section] = data[section].students || [];
              if (data[section].stats) {
                filteredData[`${section}_stats`] = data[section].stats;
              }
            }
          });

          if (Object.keys(filteredData).length === 0) {
            setLeaderboard({});
            setError(
              `Aucune donnée disponible pour ${selectedExamType} ${selectedYear} pour le moment`
            );
          } else {
            setLeaderboard(filteredData);
            setError("");
            setNoDataMessage("");
          }
        }
      }
    } catch (error) {
      console.error("💥 Error fetching leaderboard:", error);
      setError(
        `Erreur lors du chargement des données pour ${selectedExamType} ${selectedYear}`
      );
      setLeaderboard({});
    } finally {
      setLoading(false);
    }
  };

  const fetchWilayaData = async () => {
    try {
      const response = await fetch(
        `/api/wilayas?year=${selectedYear}&examType=${selectedExamType}`
      );
      if (response.ok) {
        const data = await response.json();
        setWilayaData(data);
      }
    } catch (error) {
      console.error("Error fetching wilaya data:", error);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await fetch(
        `/api/statistics?year=${selectedYear}&examType=${selectedExamType}`
      );
      if (response.ok) {
        const data = await response.json();
        setStatistics(data);
      }
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  };

  // Get available sections for slider
  const availableSections = Object.keys(leaderboard)?.filter((section) => {
    const sectionData = leaderboard[section];
    // For BAC: check if section has students array, for BREVET: check if it's array
    if (selectedExamType === "BAC") {
      return (
        sectionData && Array.isArray(sectionData) && sectionData.length > 0
      );
    } else {
      return (
        sectionData && Array.isArray(sectionData) && sectionData.length > 0
      );
    }
  });

  // Auto-slide effect with 6-second intervals (only for BAC with multiple sections)
  useEffect(() => {
    if (
      !isAutoSliding ||
      availableSections.length <= 1 ||
      selectedExamType === "BREVET"
    )
      return;

    const interval = setInterval(() => {
      setCurrentSlideIndex(
        (prevIndex) => (prevIndex + 1) % availableSections.length
      );
    }, 15000); // Change slide every 15 seconds

    return () => clearInterval(interval);
  }, [availableSections.length, isAutoSliding, selectedExamType]);

  // Get current section data
  const currentSection = availableSections[currentSlideIndex];
  const currentSectionData = currentSection
    ? (selectedExamType === "BAC" && leaderboard[currentSection]?.students
        ? leaderboard[currentSection].students
        : leaderboard[currentSection]) || []
    : [];

  // Touch handlers for swipe functionality
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null); // otherwise the swipe is fired even with usual touch events
    setTouchStart(e.targetTouches[0].clientX);
    setIsAutoSliding(false); // Stop auto-sliding when user interacts
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && availableSections.length > 1) {
      nextSlide();
    }
    if (isRightSwipe && availableSections.length > 1) {
      prevSlide();
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchMatricule.trim()) return;

    setSearchLoading(true);
    try {
      const response = await fetch(
        `/api/search?matricule=${encodeURIComponent(
          searchMatricule
        )}&year=${selectedYear}&examType=${selectedExamType}`
      );
      if (response.ok) {
        router.push(
          `/results?matricule=${encodeURIComponent(
            searchMatricule
          )}&year=${selectedYear}&examType=${selectedExamType}&returnTo=${encodeURIComponent(
            "/"
          )}`
        );
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Étudiant non trouvé");
      }
    } catch (error) {
      console.error("Search error:", error);
      alert("Erreur lors de la recherche de l'étudiant");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleWilayaSelect = (wilaya: string) => {
    setSelectedWilaya(wilaya);
    setSelectedEstablishment("");
  };

  const handleEstablishmentSelect = (establishment: string) => {
    setSelectedEstablishment(establishment);
    router.push(
      `/school?name=${encodeURIComponent(
        establishment
      )}&year=${selectedYear}&examType=${selectedExamType}`
    );
  };

  const handleEstablishmentClick = (etablissement: string) => {
    router.push(
      `/school?name=${encodeURIComponent(
        etablissement
      )}&year=${selectedYear}&examType=${selectedExamType}`
    );
  };

  const handleWilayaClick = (wilayaName: string) => {
    router.push(
      `/wilaya?name=${encodeURIComponent(
        wilayaName
      )}&year=${selectedYear}&examType=${selectedExamType}`
    );
  };

  const getRankBadgeColor = (position: number) => {
    if (position === 1) return "bg-yellow-500 hover:bg-yellow-600"; // Gold
    if (position === 2) return "bg-gray-400 hover:bg-gray-500"; // Silver
    if (position === 3) return "bg-amber-600 hover:bg-amber-700"; // Bronze
    return "bg-blue-500 hover:bg-blue-600"; // Blue for other positions
  };

  const getDecisionBadgeVariant = (decisionText: string) => {
    const decision = decisionText?.toLowerCase();
    if (
      decision?.includes("admis") ||
      decision?.includes("reussi") ||
      decision === "r"
    ) {
      return "default";
    } else if (
      decision?.includes("sessionnaire") ||
      decision?.includes("sessionn")
    ) {
      return "secondary"; // This will be styled as orange
    }
    return "destructive";
  };

  const nextSlide = () => {
    if (availableSections.length <= 1) return;
    setIsAutoSliding(false);
    setCurrentSlideIndex(
      (prevIndex) => (prevIndex + 1) % availableSections.length
    );
    // Resume auto-sliding after 10 seconds
    setTimeout(() => setIsAutoSliding(true), 10000);
  };

  const prevSlide = () => {
    if (availableSections.length <= 1) return;
    setIsAutoSliding(false);
    setCurrentSlideIndex(
      (prevIndex) =>
        (prevIndex - 1 + availableSections.length) % availableSections.length
    );
    // Resume auto-sliding after 10 seconds
    setTimeout(() => setIsAutoSliding(true), 10000);
  };

  const goToSlide = (index: number) => {
    if (availableSections.length <= 1) return;
    setIsAutoSliding(false);
    setCurrentSlideIndex(index);
    // Resume auto-sliding after 10 seconds
    setTimeout(() => setIsAutoSliding(true), 10000);
  };

  const getSectionDisplayName = (section: string) => {
    if (selectedExamType === "BREVET") {
      return "Top 10 Mauritanie";
    }

    const mappedSection = SECTION_MAPPING[section] || section;

    // Return full name with code
    switch (mappedSection) {
      case "SN":
        return "SN - Sciences naturelles";
      case "M":
        return "M - Mathématiques";
      case "LM":
        return "LM - Lettres modernes";
      case "LO":
        return "LO - LO";
      case "TS":
        return "TS - Économie";
      default:
        return `${mappedSection} - ${section}`;
    }
  };

  return (
    <div
      ref={pageRef}
      className={`min-h-screen bg-white transition-all duration-300 ${
        isSearchFocused ? "transform -translate-y-4 sm:-translate-y-2" : ""
      }`}
    >
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4 md:py-8">
        {/* Year and Exam Type Selection - Side by Side on Mobile */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <Card className="shadow-lg border-blue-200">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg p-3 sm:p-4 md:p-6">
              <CardTitle className="flex items-center text-sm sm:text-base md:text-xl">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 mr-2" />
                Sélectionner l'année et le type d'examen
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {/* Year Selection */}
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">
                    Année
                  </label>
                  <Select
                    value={
                      isHydrated
                        ? selectedYear.toString()
                        : defaultYear.toString()
                    }
                    onValueChange={handleYearChange}
                  >
                    <SelectTrigger className="w-full border-blue-300 focus:border-blue-500 focus:outline-none text-sm sm:text-base h-9 sm:h-10">
                      <SelectValue placeholder="Choisir une année..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Exam Type Selection */}
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">
                    Type d'Examen
                  </label>
                  <Select
                    value={isHydrated ? selectedExamType : "BAC"}
                    onValueChange={handleExamTypeChange}
                  >
                    <SelectTrigger className="w-full border-blue-300 focus:border-blue-500 focus:outline-none text-sm sm:text-base h-9 sm:h-10">
                      <SelectValue placeholder="Choisir un type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {examTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Combined Search Section - Simple Design */}
        <div id="search-section" className="mb-6 sm:mb-8 md:mb-12">
          <Card className="shadow-2xl border-0 bg-gradient-to-br from-white via-blue-50 to-blue-100 overflow-hidden max-w-2xl mx-auto">
            <CardContent className="p-4 sm:p-6 bg-gradient-to-br from-white to-blue-50">
              <form onSubmit={handleSearch} className="space-y-4">
                {/* Main Search Input */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                  <div className="relative">
                    <Input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Taper votre matricule ici"
                      value={searchMatricule}
                      onChange={(e) => {
                        // Only allow numbers
                        const value = e.target.value.replace(/[^0-9]/g, "");
                        setSearchMatricule(value);
                      }}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() => setIsSearchFocused(false)}
                      className="w-full h-12 sm:h-14 px-4 sm:px-6 text-sm sm:text-base font-medium bg-white border-2 border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none rounded-xl shadow-lg transition-all duration-300 placeholder:text-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => handleSearch()}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center hover:from-blue-600 hover:to-blue-700 transition-all duration-200 focus:outline-none"
                    >
                      <Search className="h-4 w-4 text-white" />
                    </button>
                  </div>
                </div>

                {/* Search Button */}
                <Button
                  type="submit"
                  disabled={searchLoading || !searchMatricule.trim()}
                  className="w-full h-12 sm:h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm sm:text-base rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none focus:outline-none"
                >
                  {searchLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Recherche en cours...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      <span>Rechercher par matricule</span>
                    </div>
                  )}
                </Button>

                {/* Separator */}
                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                  <span className="text-sm text-gray-500 font-medium">OU</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                </div>

                {/* Wilaya Selection */}
                <div className="space-y-4">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                    <div className="relative">
                      <Select
                        value={selectedWilaya}
                        onValueChange={handleWilayaSelect}
                      >
                        <SelectTrigger className="w-full h-12 sm:h-14 border-2 border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none text-sm sm:text-base bg-white rounded-xl shadow-lg transition-all duration-300">
                          <SelectValue placeholder="Choisir une wilaya..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px] sm:max-h-[300px] overflow-y-auto">
                          {Object.keys(wilayaData)
                            ?.sort()
                            .map((wilaya) => (
                              <SelectItem
                                key={wilaya}
                                value={wilaya}
                                className="py-3 px-4"
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span className="text-sm sm:text-base font-medium truncate mr-2">
                                    {wilaya}
                                  </span>
                                  <Badge
                                    variant="secondary"
                                    className="text-xs bg-blue-100 text-blue-700 flex-shrink-0"
                                  >
                                    {wilayaData[wilaya].length}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Establishment Selection */}
                  {selectedWilaya && (
                    <div className="relative group animate-fade-in">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                      <div className="relative">
                        <Select
                          value={selectedEstablishment}
                          onValueChange={handleEstablishmentSelect}
                        >
                          <SelectTrigger className="w-full h-12 sm:h-14 border-2 border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none text-sm sm:text-base bg-white rounded-xl shadow-lg transition-all duration-300">
                            <SelectValue placeholder="Choisir un établissement..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px] sm:max-h-[300px] overflow-y-auto">
                            {wilayaData[selectedWilaya]?.map(
                              (establishment) => (
                                <SelectItem
                                  key={establishment}
                                  value={establishment}
                                  className="text-sm sm:text-base font-medium py-3 px-4"
                                >
                                  <span
                                    className="truncate"
                                    title={establishment}
                                  >
                                    {establishment}
                                  </span>
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard Section with Touch Support */}
        <div id="leaderboard-section" className="mb-6 sm:mb-8 md:mb-12">
          {/* ENHANCED BEAUTIFUL MODERN TITLE */}
          <div className="flex items-center justify-center mb-6 sm:mb-8 md:mb-12">
            <div className="relative">
              {/* Main title container */}
              <div className="relative bg-white rounded-2xl px-6 sm:px-8 md:px-12 py-4 sm:py-6 md:py-8 shadow-sm border border-gray-100">
                <div className="flex items-center justify-center">
                  {/* Animated trophy icon */}
                  <div className="relative mr-4 sm:mr-6">
                    <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 rounded-full p-3 sm:p-4 shadow-sm">
                      <Trophy
                        className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-white drop-shadow-lg animate-bounce"
                        style={{ animationDuration: "2s" }}
                      />
                    </div>
                  </div>

                  {/* Title text with gradient */}
                  <div className="text-center">
                    <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-black bg-gradient-to-r from-gray-800 via-blue-600 to-blue-600 bg-clip-text text-transparent leading-tight">
                      {selectedExamType === "BREVET"
                        ? `Top 10 Mauritanie`
                        : `Top 10 par Section`}
                    </h2>
                    <div className="mt-2 sm:mt-3">
                      <div className="h-1 sm:h-1.5 w-full bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 rounded-full"></div>
                      <div className="mt-1 text-sm sm:text-base md:text-lg font-bold text-gray-600">
                        {isHydrated
                          ? `${selectedExamType} ${selectedYear}`
                          : `BAC ${defaultYear}`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Decorative elements */}
                <div className="absolute top-2 right-2 w-4 h-4 sm:w-6 sm:h-6 bg-blue-400 rounded-full opacity-60 animate-ping"></div>
                <div className="absolute bottom-2 left-2 w-3 h-3 sm:w-4 sm:h-4 bg-blue-500 rounded-full opacity-40 animate-pulse"></div>
                <div className="absolute top-1/2 right-4 w-2 h-2 sm:w-3 sm:h-3 bg-blue-400 rounded-full opacity-50 animate-bounce"></div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 text-sm sm:text-base">
                Chargement du classement...
              </p>
            </div>
          ) : noDataMessage ? (
            <div className="text-center py-12">
              <Card className="max-w-2xl mx-auto shadow-xl border-blue-200">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                      <AlertCircle className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                      Information
                    </h3>
                    <p className="text-gray-600 text-center text-sm sm:text-base leading-relaxed">
                      {noDataMessage}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : // Ajouter un bouton de rafraîchissement dans la section des erreurs
          error ? (
            <div className="text-center py-12">
              <Card className="max-w-md mx-auto shadow-xl border-blue-200">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                      <AlertCircle className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Aucune donnée disponible
                    </h3>
                    <p className="text-gray-600 text-center text-sm sm:text-base mb-4">
                      {error}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        onClick={fetchLeaderboard}
                        variant="outline"
                        className="text-sm sm:text-base bg-transparent border-blue-300 text-blue-600 hover:bg-blue-50"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Actualiser
                      </Button>
                      <Button
                        onClick={() => {
                          fetchLeaderboard();
                          fetchStatistics();
                          fetchWilayaData();
                        }}
                        className="text-sm sm:text-base bg-blue-600 hover:bg-blue-700"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Tout Actualiser
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : availableSections.length === 0 ? (
            <div className="text-center py-12">
              <Card className="max-w-md mx-auto shadow-xl border-blue-200">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                      <AlertCircle className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Aucune donnée disponible
                    </h3>
                    <p className="text-gray-600 text-center text-sm sm:text-base mb-4">
                      Il n'y a rien pour le moment pour {selectedExamType}{" "}
                      {selectedYear}
                    </p>
                    <Button
                      onClick={fetchLeaderboard}
                      variant="outline"
                      className="text-sm sm:text-base bg-transparent border-blue-300 text-blue-600 hover:bg-blue-50"
                    >
                      Réessayer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {/* Slider Container with Touch Support */}
              <div
                className="relative"
                ref={sliderRef}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              >
                {/* Navigation Buttons - Desktop (only show for BAC with multiple sections) */}
                {selectedExamType === "BAC" && availableSections.length > 1 && (
                  <div className="hidden sm:flex absolute top-1/2 -translate-y-1/2 left-0 right-0 justify-between pointer-events-none z-10">
                    <Button
                      onClick={prevSlide}
                      variant="outline"
                      size="sm"
                      className="pointer-events-auto -ml-4 bg-white/90 hover:bg-white border-blue-300 text-blue-600 shadow-lg focus:outline-none"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={nextSlide}
                      variant="outline"
                      size="sm"
                      className="pointer-events-auto -mr-4 bg-white/90 hover:bg-white border-blue-300 text-blue-600 shadow-lg focus:outline-none"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Section Indicator (only show for BAC with multiple sections) */}
                {selectedExamType === "BAC" && availableSections.length > 1 && (
                  <div className="flex items-center justify-center mb-4">
                    <div className="bg-white rounded-lg shadow-lg px-3 sm:px-4 py-2 border border-blue-200">
                      <div className="flex items-center gap-3">
                        <div className="text-xs sm:text-base font-semibold text-blue-600">
                          {getSectionDisplayName(currentSection)}
                        </div>
                        {/* Section Stats */}

                        <div className="flex gap-1">
                          {availableSections.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => goToSlide(index)}
                              className={`w-2 h-2 rounded-full transition-all duration-300 focus:outline-none ${
                                index === currentSlideIndex
                                  ? "bg-blue-500"
                                  : "bg-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mobile Swipe Instruction (only show for BAC with multiple sections) */}
                {selectedExamType === "BAC" && availableSections.length > 1 && (
                  <div className="sm:hidden text-center mb-3">
                    <p className="text-xs text-gray-500">
                      👈 Glissez pour naviguer 👉
                    </p>
                  </div>
                )}

                {/* Slider Content */}
                <Card className="shadow-lg border-blue-200 overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 sm:p-6">
                    <CardTitle className="flex items-center justify-between text-base sm:text-xl">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                        <span className="truncate">
                          {getSectionDisplayName(currentSection)}
                        </span>
                      </div>
                      {selectedExamType === "BAC" &&
                        availableSections.length > 1 && (
                          <div className="flex items-center gap-2 text-sm">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                isAutoSliding
                                  ? "bg-blue-200 animate-pulse"
                                  : "bg-blue-300"
                              }`}
                            />
                            <span className="text-blue-100 text-xs sm:text-sm hidden sm:inline">
                              {isAutoSliding ? "Auto" : "Manuel"}
                            </span>
                          </div>
                        )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 sm:p-6">
                    <div
                      className="transition-all duration-500 ease-in-out"
                      key={currentSection} // Force re-render for animation
                    >
                      <div className="grid gap-2 sm:gap-3">
                        {Array.isArray(currentSectionData) &&
                        currentSectionData.length > 0 ? (
                          currentSectionData.map((student, index) => (
                            <div
                              key={student.matricule}
                              className="flex items-center justify-between p-2 sm:p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg hover:from-gray-100 hover:to-gray-200 transition-all duration-200 shadow-sm animate-fade-in"
                              style={{ animationDelay: `${index * 50}ms` }}
                            >
                              <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                                <Badge
                                  className={`${getRankBadgeColor(
                                    index + 1
                                  )} text-white transition-colors text-xs sm:text-sm flex-shrink-0 px-1.5 py-0.5 sm:px-2 sm:py-1`}
                                >
                                  {index + 1}
                                </Badge>
                                <div className="min-w-0 flex-1">
                                  <button
                                    onClick={() =>
                                      router.push(
                                        `/results?matricule=${encodeURIComponent(
                                          student.matricule
                                        )}&year=${selectedYear}&examType=${selectedExamType}&returnTo=${encodeURIComponent(
                                          "/"
                                        )}`
                                      )
                                    }
                                    className="font-semibold text-gray-900 hover:text-blue-600 hover:underline transition-colors text-left text-xs sm:text-base block w-full break-words leading-tight focus:outline-none"
                                    title={student.nom_complet} // Show full name on hover
                                  >
                                    {student.nom_complet}
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleEstablishmentClick(
                                        student.etablissement
                                      )
                                    }
                                    className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors block w-full text-left break-words leading-tight focus:outline-none"
                                    title={student.etablissement} // Show full establishment name on hover
                                  >
                                    {student.etablissement}
                                  </button>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0 ml-2 flex flex-col items-center">
                                <p className="font-bold text-xs sm:text-lg text-blue-600 mb-1">
                                  {student.moyenne
                                    ? student.moyenne.toFixed(2)
                                    : "0.00"}
                                </p>
                                <Badge
                                  variant={getDecisionBadgeVariant(
                                    student.decision_text
                                  )}
                                  className="text-xs"
                                >
                                  {student.decision_text}
                                </Badge>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-gray-500 text-sm sm:text-base">
                              {selectedExamType === "BREVET"
                                ? "Aucun étudiant trouvé"
                                : "Aucun étudiant trouvé dans cette section"}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Auto-slide Progress Bar (only for BAC with multiple sections) */}
                {selectedExamType === "BAC" &&
                  availableSections.length > 1 &&
                  isAutoSliding && (
                    <div className="mt-2 bg-gray-200 rounded-full h-1 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full transition-all duration-15000 ease-linear"
                        style={{
                          width: "100%",
                          animation: "progress 15s linear infinite",
                        }}
                      />
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>

        {/* APP DOWNLOAD & SOCIAL MEDIA SECTION */}
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center justify-center mb-6 sm:mb-8">
            <div className="relative">
              <div className="relative bg-white rounded-xl px-4 sm:px-6 md:px-8 py-3 sm:py-4 border border-gray-100">
                <div className="flex items-center">
                  <div className="relative mr-3 sm:mr-4">
                    <Globe className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg md:text-2xl lg:text-3xl xl:text-4xl font-bold bg-gradient-to-r from-gray-800 via-blue-600 to-blue-600 bg-clip-text text-transparent">
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

        {/* PROFESSIONAL STATISTICS SECTION WITH EYE-CATCHING COLORS - HIDE CERTAIN STATS FOR BREVET */}
        {statistics && !statistics.message && (
          <div className="mb-6 sm:mb-8">
            {/* Update the statistics section title to be more modern and beautiful */}
            <div className="flex items-center justify-center mb-6 sm:mb-8 md:mb-12">
              <div className="relative">
                <div className="relative bg-white rounded-xl px-4 sm:px-6 md:px-8 py-3 sm:py-4 border border-gray-100">
                  <div className="flex items-center">
                    <div className="relative mr-3 sm:mr-4">
                      <BarChart3 className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg md:text-2xl lg:text-3xl xl:text-4xl font-bold bg-gradient-to-r from-gray-800 via-blue-600 to-blue-600 bg-clip-text text-transparent">
                        Statistiques Générales
                      </h2>
                      <div className="h-1 w-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full mt-2"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ENHANCED MAIN STATISTICS WITH VIBRANT COLORS - CONDITIONAL FOR BREVET */}
            <div
              className={`grid gap-3 sm:gap-4 md:gap-6 lg:gap-8 mb-6 sm:mb-8 md:mb-12 ${
                selectedExamType === "BREVET"
                  ? "grid-cols-1 sm:grid-cols-2"
                  : "grid-cols-2 lg:grid-cols-4"
              }`}
            >
              {/* Total Students - Vibrant Blue */}
              <Card className="border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white transform hover:scale-105 transition-all duration-300">
                <CardContent className="p-3 sm:p-4 md:p-6 lg:p-8 text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full -mr-8 sm:-mr-10 -mt-8 sm:-mt-10"></div>
                  <div className="absolute bottom-0 left-0 w-12 h-12 sm:w-16 sm:h-16 bg-white/10 rounded-full -ml-6 sm:-ml-8 -mb-6 sm:-mb-8"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-center mb-2 sm:mb-3 md:mb-4">
                      <GraduationCap className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 text-white drop-shadow-lg" />
                    </div>
                    <p className="text-xs sm:text-sm font-semibold mb-1 sm:mb-2 text-blue-100">
                      Total Étudiants
                    </p>
                    <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold drop-shadow-lg">
                      {statistics?.totalStudents?.toLocaleString() || "0"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Admitted Students - Vibrant Green */}
              <Card className="border-0 bg-gradient-to-br from-blue-400 to-blue-500 text-white transform hover:scale-105 transition-all duration-300">
                <CardContent className="p-3 sm:p-4 md:p-6 lg:p-8 text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full -mr-8 sm:-mr-10 -mt-8 sm:-mt-10"></div>
                  <div className="absolute bottom-0 left-0 w-12 h-12 sm:w-16 sm:h-16 bg-white/10 rounded-full -ml-6 sm:-ml-8 -mb-6 sm:-mb-8"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-center mb-2 sm:mb-3 md:mb-4">
                      <Star className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 text-white drop-shadow-lg" />
                    </div>
                    <p className="text-xs sm:text-sm font-semibold mb-1 sm:mb-2 text-blue-100">
                      Étudiants Admis
                    </p>
                    <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold drop-shadow-lg">
                      {statistics?.admittedStudents?.toLocaleString() || "0"}
                    </p>
                    <p className="text-xs sm:text-sm text-blue-200 font-medium">
                      ({statistics?.admissionRate || "0"}%)
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Average Score - Vibrant Purple - HIDE FOR BREVET */}
              {selectedExamType !== "BREVET" && (
                <Card className="border-0 bg-gradient-to-br from-blue-600 to-blue-700 text-white transform hover:scale-105 transition-all duration-300">
                  <CardContent className="p-3 sm:p-4 md:p-6 lg:p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full -mr-8 sm:-mr-10 -mt-8 sm:-mt-10"></div>
                    <div className="absolute bottom-0 left-0 w-12 h-12 sm:w-16 sm:h-16 bg-white/10 rounded-full -ml-6 sm:-ml-8 -mb-6 sm:-mb-8"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-center mb-2 sm:mb-3 md:mb-4">
                        <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 text-white drop-shadow-lg" />
                      </div>
                      <p className="text-xs sm:text-sm font-semibold mb-1 sm:mb-2 text-blue-100">
                        Moyenne Générale
                      </p>
                      <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold drop-shadow-lg">
                        {statistics.averageScore}
                      </p>
                      <p className="text-xs sm:text-sm text-blue-200 font-medium">
                        /20
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Success Rate - Vibrant Orange - HIDE FOR BREVET */}
              {selectedExamType !== "BREVET" && (
                <Card className="border-0 bg-gradient-to-br from-blue-300 to-blue-400 text-white transform hover:scale-105 transition-all duration-300">
                  <CardContent className="p-3 sm:p-4 md:p-6 lg:p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full -mr-8 sm:-mr-10 -mt-8 sm:-mt-10"></div>
                    <div className="absolute bottom-0 left-0 w-12 h-12 sm:w-16 sm:h-16 bg-white/10 rounded-full -ml-6 sm:-ml-8 -mb-6 sm:-mb-8"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-center mb-2 sm:mb-3 md:mb-4">
                        <Target className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 text-white drop-shadow-lg" />
                      </div>
                      <p className="text-xs sm:text-sm font-semibold mb-1 sm:mb-2 text-blue-100">
                        Taux Sessionnaires
                      </p>
                      <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold drop-shadow-lg">
                        {statistics.sessionnaireRate}%
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Section and Wilaya Statistics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
              {/* Section Statistics (HIDE FOR BREVET) */}
              {selectedExamType === "BAC" && (
                <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-50">
                  <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-600 text-white p-3 sm:p-4 md:p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full -mr-12 sm:-mr-16 -mt-12 sm:-mt-16"></div>
                    <CardTitle className="flex items-center text-base sm:text-lg md:text-xl relative z-10">
                      <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 mr-2 sm:mr-3 drop-shadow-lg" />
                      Statistiques par Section
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 md:p-6">
                    <div className="space-y-2 sm:space-y-3 md:space-y-4">
                      {statistics.sectionStats
                        ?.filter(
                          (stat) =>
                            stat.name !== "Sciences" && stat.name !== "sn"
                        )
                        .map((stat, index) => (
                          <div
                            key={stat.name}
                            className="flex items-center justify-between p-2 sm:p-3 md:p-4 bg-gradient-to-r from-white to-blue-50 rounded-xl border border-blue-100"
                            style={{ animationDelay: `${index * 100}ms` }}
                          >
                            <div>
                              <p className="font-bold text-gray-800 text-xs sm:text-sm md:text-base">
                                {getSectionDisplayName(stat.name)}
                              </p>
                              <p className="text-xs sm:text-sm text-blue-600 font-medium">
                                {stat.admitted}/{stat.total} admis
                              </p>
                            </div>
                            <Badge className="bg-gradient-to-r from-blue-500 to-blue-500 text-white border-0 text-xs sm:text-sm font-bold px-2 sm:px-3 py-1">
                              {stat.rate}%
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Wilaya Statistics - UPDATED COLOR AND SORTED BY PERCENTAGE */}
              <Card
                className={`border-0 bg-gradient-to-br from-blue-50 to-blue-50 ${
                  selectedExamType === "BREVET" ? "lg:col-span-2" : ""
                }`}
              >
                <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-600 text-white p-3 sm:p-4 md:p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full -mr-12 sm:-mr-16 -mt-12 sm:-mt-16"></div>
                  <CardTitle className="flex items-center text-base sm:text-lg md:text-xl relative z-10">
                    <Globe className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 mr-2 sm:mr-3 drop-shadow-lg" />
                    Statistiques par Wilaya
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 md:p-6">
                  <div className="space-y-2 sm:space-y-3 md:space-y-4">
                    {statistics.wilayaStats
                      ?.sort(
                        (a, b) =>
                          Number.parseFloat(b.rate) - Number.parseFloat(a.rate)
                      ) // Sort by percentage (high to low)
                      .map((stat, index) => (
                        <button
                          key={stat.name}
                          onClick={() => handleWilayaClick(stat.name)}
                          className="w-full flex items-center justify-between p-2 sm:p-3 md:p-4 bg-gradient-to-r from-white to-blue-50 rounded-xl border border-blue-100 hover:from-blue-50 hover:to-blue-50 hover:border-blue-300 focus:outline-none"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className="text-left">
                            <p className="font-bold text-gray-800 text-xs sm:text-sm md:text-base">
                              {stat.name}
                            </p>
                            <p className="text-xs sm:text-sm text-blue-600 font-medium">
                              {stat.admitted}/{stat.total} admis
                            </p>
                          </div>
                          <Badge className="bg-gradient-to-r from-blue-500 to-blue-500 text-white border-0 text-xs sm:text-sm font-bold px-2 sm:px-3 py-1">
                            {stat.rate}%
                          </Badge>
                        </button>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Show special message if statistics has message */}
        {statistics && statistics.message && (
          <div className="text-center py-12">
            <Card className="max-w-2xl mx-auto border-blue-200">
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                    Information
                  </h3>
                  <p className="text-gray-600 text-center text-sm sm:text-base leading-relaxed">
                    {statistics.message}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes progress {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(0%);
          }
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #3b82f6, #1d4ed8);
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #2563eb, #1e40af);
        }
      `}</style>
    </div>
  );
}
