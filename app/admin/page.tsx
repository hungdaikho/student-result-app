"use client";

import type React from "react";

import { useState, useEffect } from "react";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Database,
  Calendar,
  Lock,
  User,
  TestTube,
  Globe,
  RefreshCw,
  HardDrive,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Settings,
  Eye,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UploadStats {
  totalStudents: number;
  admittedStudents: number;
  admissionRate: string;
  sections: string[];
  schools: string[];
  establishments: string[];
  wilayas: string[];
  averageScore: string;
}

interface ExcelAnalysis {
  fileName: string;
  fileSize: number;
  examType: "BAC" | "BREVET";
  columns: string[];
  sampleData: any[];
  totalRows: number;
  requiredFields: { field: string; description: string }[];
  suggestedMapping: { [field: string]: string };
}

interface ColumnMapping {
  [field: string]: string;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [selectedExamType, setSelectedExamType] = useState<"BAC" | "BREVET">(
    "BAC"
  );
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    stats?: UploadStats;
    details?: any;
  } | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [regionInfo, setRegionInfo] = useState<any>(null);
  const [databaseInfo, setDatabaseInfo] = useState<any>(null);

  // New states for column mapping
  const [currentStep, setCurrentStep] = useState<
    "upload" | "mapping" | "processing"
  >("upload");
  const [excelAnalysis, setExcelAnalysis] = useState<ExcelAnalysis | null>(
    null
  );
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [analyzing, setAnalyzing] = useState(false);

  const [files, setFiles] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [showFileDetails, setShowFileDetails] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);

  // Available years and exam types for upload
  const availableYears = [2022, 2023, 2024, 2025];
  const examTypes = ["BAC", "BREVET"] as const;

  // Check if user is already authenticated (from localStorage)
  useEffect(() => {
    const authStatus = localStorage.getItem("adminAuthenticated");
    if (authStatus === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  // Load initial data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      getFiles();
      getDatabaseInfo();
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (username === "MedAhmed01" && password === "Medahmed28233") {
      setIsAuthenticated(true);
      localStorage.setItem("adminAuthenticated", "true");
    } else {
      setLoginError("Nom d'utilisateur ou mot de passe incorrect");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("adminAuthenticated");
    setUsername("");
    setPassword("");
    // Reset upload states
    setCurrentStep("upload");
    setExcelAnalysis(null);
    setColumnMapping({});
    setFile(null);
  };

  const testConnection = async () => {
    try {
      const response = await fetch("/api/test-upload");
      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        status: "ERROR",
        error: "Failed to connect to test endpoint",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const getRegionInfo = async () => {
    try {
      const response = await fetch("/api/admin/region-info");
      const result = await response.json();
      setRegionInfo(result);
    } catch (error) {
      setRegionInfo({
        status: "ERROR",
        error: "Failed to get region info",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const getDatabaseInfo = async () => {
    try {
      const response = await fetch("/api/admin/database-info");
      const result = await response.json();
      setDatabaseInfo(result);
    } catch (error) {
      setDatabaseInfo({
        status: "ERROR",
        error: "Failed to get database info",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Reset previous results and states
      setUploadResult(null);
      setExcelAnalysis(null);
      setColumnMapping({});
      setCurrentStep("upload");

      // Check file size (50MB limit for database upload)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (selectedFile.size > maxSize) {
        setUploadResult({
          success: false,
          message: `Fichier trop volumineux. Taille maximum: 50MB. Votre fichier: ${(
            selectedFile.size /
            1024 /
            1024
          ).toFixed(2)}MB`,
        });
        return;
      }

      // Enhanced file type validation
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "application/octet-stream", // Sometimes Excel files are sent as this
        ".xlsx",
        ".xls",
      ];

      const fileName = selectedFile.name?.toLowerCase();
      const hasValidExtension =
        fileName.endsWith(".xlsx") || fileName.endsWith(".xls");
      const hasValidMimeType = validTypes?.includes(selectedFile.type);

      console.log("File validation:", {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
        hasValidExtension,
        hasValidMimeType,
      });

      if (!hasValidExtension && !hasValidMimeType) {
        setUploadResult({
          success: false,
          message: `Type de fichier invalide. Veuillez sélectionner un fichier Excel (.xlsx ou .xls). 
                   Fichier reçu: ${selectedFile.name} (${selectedFile.type})`,
          details: {
            fileName: selectedFile.name,
            mimeType: selectedFile.type,
            validTypes: validTypes,
          },
        });
        return;
      }

      setFile(selectedFile);
      console.log("File selected successfully:", {
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type,
      });
    }
  };

  const handleAnalyzeFile = async () => {
    if (!file) {
      setUploadResult({
        success: false,
        message: "Aucun fichier sélectionné",
      });
      return;
    }

    setAnalyzing(true);
    setUploadResult(null);

    try {
      // Create FormData for analysis
      const formData = new FormData();
      formData.append("excel", file);
      formData.append("examType", selectedExamType);

      console.log("📤 Sending analysis request...");

      const response = await fetch("/api/admin/analyze-excel", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setExcelAnalysis(result);
        setColumnMapping(result.suggestedMapping || {});
        setCurrentStep("mapping");
        console.log("🎉 Analysis successful!");
      } else {
        setUploadResult({
          success: false,
          message: result.error || "Échec de l'analyse du fichier Excel",
          details: result,
        });
        console.error("❌ Analysis failed:", result);
      }
    } catch (error) {
      console.error("💥 Analysis error:", error);
      setUploadResult({
        success: false,
        message: "Erreur lors de l'analyse du fichier. Veuillez réessayer.",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleColumnMappingChange = (field: string, column: string) => {
    setColumnMapping((prev) => ({
      ...prev,
      [field]: column === "__none__" ? "" : column,
    }));
  };

  const handleProcessWithMapping = async () => {
    if (!file || !excelAnalysis) {
      setUploadResult({
        success: false,
        message: "Fichier ou analyse manquante",
      });
      return;
    }

    // Validate required fields are mapped
    const requiredFields = excelAnalysis.requiredFields?.filter(
      (field) =>
        ["matricule", "nom_complet", "moyenne", "decision"]?.includes(
          field.field
        ) ||
        (selectedExamType === "BAC" &&
          ["section", "ecole", "etablissement"]?.includes(field.field)) ||
        (selectedExamType === "BREVET" &&
          ["ecole", "etablissement"]?.includes(field.field))
    );

    const missingMappings = requiredFields?.filter(
      (field) => !columnMapping[field.field]
    );

    if (missingMappings.length > 0) {
      setUploadResult({
        success: false,
        message: `Veuillez mapper les champs obligatoires: ${missingMappings
          ?.map((f) => f.field)
          .join(", ")}`,
      });
      return;
    }

    setCurrentStep("processing");
    setUploading(true);
    setUploadProgress(0);
    setUploadResult(null);

    try {
      // Create FormData with mapping
      const formData = new FormData();
      formData.append("excel", file);
      formData.append("year", selectedYear.toString());
      formData.append("examType", selectedExamType);
      formData.append("columnMapping", JSON.stringify(columnMapping));

      console.log("📤 Sending upload request with mapping...");
      console.log("Column mapping:", columnMapping);

      // Progress simulation
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95; // Stop at 95% to wait for server response
          }
          return prev + 3;
        });
      }, 2000); // Slower progress updates

      // Create abort controller for timeout (match API timeout)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log("⏰ Request aborted due to timeout");
      }, 280000); // 4 minutes 40 seconds (slightly less than API timeout)

      // Make the request
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      // Clear timeout and progress
      clearTimeout(timeoutId);
      clearInterval(progressInterval);
      setUploadProgress(100);

      console.log("📥 Response received:", {
        status: response.status,
        statusText: response.statusText,
      });

      // Parse response
      let result: any;
      try {
        const responseText = await response.text();
        console.log("📥 Raw response:", responseText.substring(0, 500) + "...");
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error("❌ Failed to parse response:", parseError);
        throw new Error("Invalid response from server");
      }

      console.log("📥 Parsed response:", result);

      if (response.ok) {
        setUploadResult({
          success: true,
          message: result.message,
          stats: result.stats,
          details: {
            ...result.fileInfo,
          },
        });
        console.log("🎉 Upload successful!");

        // Refresh database info after successful upload
        getDatabaseInfo();

        // Reset to upload step for next file
        setTimeout(() => {
          setCurrentStep("upload");
          setExcelAnalysis(null);
          setColumnMapping({});
          setFile(null);
        }, 5000);
      } else {
        setUploadResult({
          success: false,
          message:
            result.error ||
            `Erreur HTTP ${response.status}: ${response.statusText}`,
          details: result,
        });
        console.error("❌ Upload failed:", result);
      }
    } catch (error) {
      console.error("💥 Upload error:", error);

      let errorMessage = "Erreur lors du téléchargement";
      const errorDetails: any = {};

      if (error instanceof Error) {
        errorDetails.errorName = error.name;
        errorDetails.errorMessage = error.message;

        if (error.name === "AbortError") {
          errorMessage =
            "Timeout: Le téléchargement a pris trop de temps. Vérifiez si les données ont été sauvegardées en actualisant les infos de la base de données.";
        } else if (error.message?.includes("fetch")) {
          errorMessage =
            "Erreur de connexion. Vérifiez votre connexion internet et réessayez.";
        } else if (error.message?.includes("multipart")) {
          errorMessage = "Erreur de format de fichier. Veuillez réessayer.";
        } else if (error.message?.includes("database")) {
          errorMessage = "Erreur de base de données. Veuillez réessayer.";
        } else {
          errorMessage = `Erreur: ${error.message}`;
        }
      }

      setUploadResult({
        success: false,
        message: errorMessage,
        details: errorDetails,
      });

      // If it's a timeout error, automatically refresh database info
      if (error instanceof Error && error.name === "AbortError") {
        console.log("🔄 Timeout detected, refreshing database info...");
        setTimeout(() => {
          getDatabaseInfo();
        }, 2000);
      }
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 3000);
    }
  };

  const clearData = async () => {
    if (
      !confirm(
        `Êtes-vous sûr de vouloir effacer toutes les données des étudiants pour ${selectedExamType} ${selectedYear} ? Cette action ne peut pas être annulée.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/clear?year=${selectedYear}&examType=${selectedExamType}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        setUploadResult({
          success: true,
          message: result.message,
          details: { deletedRecords: result.deletedCount },
        });

        // Refresh database info after clearing data
        getDatabaseInfo();
      } else {
        setUploadResult({
          success: false,
          message: result.error || "Échec de l'effacement des données",
        });
      }
    } catch (error) {
      console.error("Clear data error:", error);
      setUploadResult({
        success: false,
        message: "Erreur réseau lors de l'effacement",
      });
    }
  };

  const recalculateRanks = async () => {
    if (
      !confirm(
        `Êtes-vous sûr de vouloir recalculer les rangs pour ${selectedExamType} ${selectedYear} ? Cela mettra à jour les rangs basés sur les moyennes.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch("/api/admin/recalculate-ranks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          year: selectedYear,
          examType: selectedExamType,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setUploadResult({
          success: true,
          message: result.message,
          details: result,
        });

        // Refresh database info after recalculating ranks
        getDatabaseInfo();
      } else {
        setUploadResult({
          success: false,
          message: result.error || "Échec du recalcul des rangs",
        });
      }
    } catch (error) {
      console.error("Recalculate ranks error:", error);
      setUploadResult({
        success: false,
        message: "Erreur réseau lors du recalcul des rangs",
      });
    }
  };

  const debugAdmisLogic = async () => {
    try {
      setUploadResult({
        success: true,
        message: "Analyse de la logique admis en cours...",
      });

      const response = await fetch(
        `/api/admin/debug-admis?year=${selectedYear}&examType=${selectedExamType}&limit=100`
      );
      const result = await response.json();

      if (response.ok) {
        setUploadResult({
          success: true,
          message: `Analyse terminée: ${result.summary.inconsistentRecords} enregistrements incohérents sur ${result.summary.totalStudents}`,
          details: result,
        });
      } else {
        setUploadResult({
          success: false,
          message: result.error || "Échec de l'analyse de la logique admis",
        });
      }
    } catch (error) {
      console.error("Debug admis error:", error);
      setUploadResult({
        success: false,
        message: "Erreur réseau lors de l'analyse de la logique admis",
      });
    }
  };

  const fixAdmisLogic = async (dryRun = true) => {
    if (
      !dryRun &&
      !confirm(
        `Êtes-vous sûr de vouloir corriger la logique admis pour ${selectedExamType} ${selectedYear} ? Cela mettra à jour les valeurs admis basées sur decision_text.`
      )
    ) {
      return;
    }

    try {
      setUploadResult({
        success: true,
        message: dryRun
          ? "Test de correction en cours..."
          : "Correction de la logique admis en cours...",
      });

      const response = await fetch("/api/admin/fix-admis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          year: selectedYear,
          examType: selectedExamType,
          dryRun,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setUploadResult({
          success: true,
          message: dryRun
            ? `Test terminé: ${result.report.incorrectRecords} enregistrements à corriger sur ${result.report.totalStudents}`
            : result.message,
          details: result,
        });

        if (!dryRun) {
          // Refresh database info after fixing
          getDatabaseInfo();
        }
      } else {
        setUploadResult({
          success: false,
          message: result.error || "Échec de la correction de la logique admis",
        });
      }
    } catch (error) {
      console.error("Fix admis error:", error);
      setUploadResult({
        success: false,
        message: "Erreur réseau lors de la correction de la logique admis",
      });
    }
  };

  const resetToUpload = () => {
    setCurrentStep("upload");
    setExcelAnalysis(null);
    setColumnMapping({});
    setFile(null);
    setUploadResult(null);
  };

  const getFiles = async () => {
    setLoadingFiles(true);
    try {
      const response = await fetch("/api/admin/files");
      const result = await response.json();
      setFiles(result.files || []);
    } catch (error) {
      console.error("Error fetching files:", error);
      setFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  };

  const deleteFile = async (fileId: string) => {
    if (
      !confirm(
        "Êtes-vous sûr de vouloir supprimer ce fichier ? Cette action ne peut pas être annulée."
      )
    ) {
      return;
    }

    setDeletingFile(fileId);
    try {
      console.log("🗑️ Attempting to delete file:", fileId);

      const response = await fetch(
        `/api/admin/files/${encodeURIComponent(fileId)}`,
        {
          method: "DELETE",
        }
      );

      console.log("🗑️ Delete response status:", response.status);

      const result = await response.json();
      console.log("🗑️ Delete response:", result);

      if (response.ok && result.success) {
        setUploadResult({
          success: true,
          message: result.message,
          details: result.deletedFile,
        });
        // Refresh file list
        getFiles();
        getDatabaseInfo();
      } else {
        console.error("Delete failed:", result);
        setUploadResult({
          success: false,
          message: result.error || "Échec de la suppression du fichier",
        });
      }
    } catch (error) {
      console.error("Delete file error:", error);
      setUploadResult({
        success: false,
        message: "Erreur réseau lors de la suppression",
      });
    } finally {
      setDeletingFile(null);
    }
  };

  const viewFileDetails = async (fileId: string) => {
    try {
      const response = await fetch(
        `/api/admin/files/${encodeURIComponent(fileId)}`
      );
      const result = await response.json();

      if (response.ok && result.success) {
        setSelectedFile(result.file);
        setShowFileDetails(true);
      } else {
        console.error(
          "Error fetching file details:",
          result.error || "Unknown error"
        );
        setUploadResult({
          success: false,
          message:
            result.error ||
            "Erreur lors de la récupération des détails du fichier",
        });
      }
    } catch (error) {
      console.error("Error fetching file details:", error);
      setUploadResult({
        success: false,
        message: "Erreur réseau lors de la récupération des détails du fichier",
      });
    }
  };
  console.log(uploadResult);

  // Login form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-2xl border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg p-6">
            <CardTitle className="flex items-center text-2xl justify-center">
              <Lock className="h-6 w-6 mr-2" />
              Connexion Dashboard
            </CardTitle>
            <CardDescription className="text-blue-100 text-center">
              Veuillez vous connecter pour accéder au dashboard administrateur
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="username"
                  className="text-sm font-medium text-gray-700"
                >
                  Nom d'utilisateur
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Entrez votre nom d'utilisateur"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-gray-700"
                >
                  Mot de passe
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Entrez votre mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {loginError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{loginError}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2"
              >
                Se connecter
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin panel (authenticated)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header with logout */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Database className="h-12 w-12 text-blue-600 mr-3" />
              <h1 className="text-4xl font-bold text-gray-900">
                Dashboard Administrateur
              </h1>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={testConnection}
                variant="outline"
                className="border-green-300 text-green-600 hover:bg-green-50 bg-transparent"
              >
                <TestTube className="h-4 w-4 mr-2" />
                Test API
              </Button>
              <Button
                onClick={getRegionInfo}
                variant="outline"
                className="border-blue-300 text-blue-600 hover:bg-blue-50 bg-transparent"
              >
                <Globe className="h-4 w-4 mr-2" />
                Info Région
              </Button>
              <Button
                onClick={getDatabaseInfo}
                variant="outline"
                className="border-purple-300 text-purple-600 hover:bg-purple-50 bg-transparent"
              >
                <HardDrive className="h-4 w-4 mr-2" />
                Info Database
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50 bg-transparent"
              >
                Déconnexion
              </Button>
            </div>
          </div>
          <p className="text-xl text-gray-600">
            Télécharger et gérer les données des résultats avec PostgreSQL
            Database
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Database Storage Information */}
          {databaseInfo && (
            <Card
              className={`shadow-lg ${
                databaseInfo.status === "SUCCESS"
                  ? "border-purple-200"
                  : "border-red-200"
              }`}
            >
              <CardHeader>
                <CardTitle
                  className={`flex items-center ${
                    databaseInfo.status === "SUCCESS"
                      ? "text-purple-700"
                      : "text-red-700"
                  }`}
                >
                  <HardDrive className="h-6 w-6 mr-2" />
                  Informations de la Base de Données
                </CardTitle>
              </CardHeader>
              <CardContent>
                {databaseInfo.status === "SUCCESS" && databaseInfo.summary && (
                  <div className="space-y-6">
                    {/* Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <p className="text-sm text-purple-600 font-medium">
                          Total Étudiants
                        </p>
                        <p className="text-2xl font-bold text-purple-700">
                          {databaseInfo.summary.totalStudents}
                        </p>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-600 font-medium">
                          Total Uploads
                        </p>
                        <p className="text-lg font-bold text-blue-700">
                          {databaseInfo.summary.totalUploads}
                        </p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <p className="text-sm text-green-600 font-medium">
                          Années/Types
                        </p>
                        <p className="text-2xl font-bold text-green-700">
                          {databaseInfo.summary.distinctYearTypes}
                        </p>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                        <p className="text-sm text-orange-600 font-medium">
                          Records Totaux
                        </p>
                        <p className="text-2xl font-bold text-orange-700">
                          {databaseInfo.summary.totalDataSize}
                        </p>
                      </div>
                    </div>

                    {/* Data by Year and Type */}
                    {Object.keys(databaseInfo.data).length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-4">
                          Données par Année et Type:
                        </h4>
                        <div className="grid gap-4">
                          {Object.entries(databaseInfo.data)?.map(
                            ([key, data]: [string, any]) => (
                              <div
                                key={key}
                                className="bg-gray-50 p-4 rounded-lg border border-gray-200"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="font-semibold text-gray-800">
                                    {key}
                                  </h5>
                                  <Badge variant="secondary">
                                    {data.studentCount} étudiants
                                  </Badge>
                                </div>
                                <div className="text-sm text-gray-600 space-y-1">
                                  <p>
                                    <strong>Moyenne générale:</strong>{" "}
                                    {data.averageScore}/20
                                  </p>
                                  {data.uploadInfo && (
                                    <>
                                      <p>
                                        <strong>Fichier:</strong>{" "}
                                        {data.uploadInfo.fileName}
                                      </p>
                                      <p>
                                        <strong>Uploadé le:</strong>{" "}
                                        {new Date(
                                          data.uploadInfo.uploadedAt
                                        ).toLocaleString()}
                                      </p>
                                    </>
                                  )}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {/* Recent Uploads */}
                    {databaseInfo.recentUploads &&
                      databaseInfo.recentUploads.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-4">
                            Uploads Récents:
                          </h4>
                          <div className="space-y-2">
                            {databaseInfo.recentUploads
                              .slice(0, 5)
                              ?.map((upload: any) => (
                                <div
                                  key={upload.id}
                                  className="bg-white p-3 rounded border border-gray-200 flex items-center justify-between"
                                >
                                  <div>
                                    <p className="font-medium text-sm">
                                      {upload.fileName}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {upload.examType} {upload.year} -{" "}
                                      {upload.studentCount} étudiants
                                    </p>
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    {new Date(
                                      upload.uploadedAt
                                    ).toLocaleDateString()}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                  </div>
                )}

                {databaseInfo.error && (
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <p className="text-red-600">
                      <strong>Erreur:</strong> {databaseInfo.error}
                    </p>
                    <p className="text-sm text-red-500 mt-2">
                      Configuré: {databaseInfo.configured ? "Oui" : "Non"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* File Management */}
          <Card className="shadow-lg border-indigo-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-2xl text-indigo-700">
                <div className="flex items-center">
                  <FileText className="h-6 w-6 mr-2" />
                  Gestion des Fichiers Uploadés
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={async () => {
                      try {
                        await fetch("/api/admin/clear-cache", {
                          method: "POST",
                        });
                        setUploadResult({
                          success: true,
                          message: "Cache supprimé avec succès",
                        });
                      } catch (error) {
                        setUploadResult({
                          success: false,
                          message: "Erreur lors de la suppression du cache",
                        });
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="border-orange-300 text-orange-600 hover:bg-orange-50"
                  >
                    Vider Cache
                  </Button>
                  <Button
                    onClick={getFiles}
                    disabled={loadingFiles}
                    variant="outline"
                    className="border-indigo-300 text-indigo-600 hover:bg-indigo-50 bg-transparent"
                  >
                    {loadingFiles ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Actualiser
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Voir tous les fichiers uploadés, détecter les doublons et gérer
                les données.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingFiles ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  <span>Chargement des fichiers...</span>
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>
                    Aucun fichier trouvé. Cliquez sur "Actualiser" pour
                    recharger.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                      <p className="text-sm text-indigo-600 font-medium">
                        Total Fichiers
                      </p>
                      <p className="text-2xl font-bold text-indigo-700">
                        {files.length}
                      </p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-600 font-medium">
                        Total Étudiants
                      </p>
                      <p className="text-2xl font-bold text-blue-700">
                        {files.reduce((sum, f) => sum + f.studentCount, 0)}
                      </p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <p className="text-sm text-orange-600 font-medium">
                        Doublons Détectés
                      </p>
                      <p className="text-2xl font-bold text-orange-700">
                        {files.reduce(
                          (sum, f) => sum + (f.duplicateCount || 0),
                          0
                        )}
                      </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-sm text-green-600 font-medium">
                        Taille Totale
                      </p>
                      <p className="text-lg font-bold text-green-700">
                        {files
                          .reduce((sum, f) => sum + f.studentCount * 0.5, 0)
                          .toFixed(0)}{" "}
                        KB
                      </p>
                    </div>
                  </div>

                  {/* Files Table */}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fichier</TableHead>
                          <TableHead>Année/Type</TableHead>
                          <TableHead>Étudiants</TableHead>
                          <TableHead>Doublons</TableHead>
                          <TableHead>Taux Admission</TableHead>
                          <TableHead>Taille</TableHead>
                          <TableHead>Date Upload</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {files?.map((file) => (
                          <TableRow key={file.id}>
                            <TableCell>
                              <div className="flex items-center">
                                <FileText className="h-4 w-4 mr-2 text-gray-400" />
                                <div>
                                  <p className="font-medium text-sm">
                                    {file.fileName}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {file.id}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {file.examType} {file.year}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p className="font-medium">
                                  {file.studentCount}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {file.uniqueStudents} uniques
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {file.duplicateCount > 0 ? (
                                <div className="flex items-center">
                                  <AlertTriangle className="h-4 w-4 text-orange-500 mr-1" />
                                  <span className="text-orange-600 font-medium">
                                    {file.duplicateCount}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-green-600">✓ Aucun</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p className="font-medium">
                                  {file.admissionRate}%
                                </p>
                                <p className="text-xs text-gray-500">
                                  {file.admittedCount}/{file.studentCount}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {file.sizeFormatted}
                            </TableCell>
                            <TableCell className="text-sm">
                              {new Date(file.uploadedAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => viewFileDetails(file.id)}
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-8 p-0"
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                                <Button
                                  onClick={() => deleteFile(file.id)}
                                  disabled={deletingFile === file.id}
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-8 p-0 border-red-300 text-red-600 hover:bg-red-50"
                                >
                                  {deletingFile === file.id ? (
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* File Details Modal */}
          {showFileDetails && selectedFile && (
            <Card className="shadow-lg border-blue-200 mt-8">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-xl text-blue-700">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Détails du Fichier
                  </div>
                  <Button
                    onClick={() => setShowFileDetails(false)}
                    variant="outline"
                    size="sm"
                  >
                    Fermer
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* File Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-800 mb-2">
                        Informations du fichier
                      </h4>
                      <div className="space-y-1 text-sm">
                        <p>
                          <strong>ID:</strong> {selectedFile.file.id}
                        </p>
                        <p>
                          <strong>Taille:</strong>{" "}
                          {(selectedFile.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <p>
                          <strong>Uploadé:</strong>{" "}
                          {new Date(
                            selectedFile.file.uploadedAt
                          ).toLocaleString()}
                        </p>
                        <p>
                          <strong>Étudiants:</strong>{" "}
                          {selectedFile.file.studentCount}
                        </p>
                      </div>
                    </div>

                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <h4 className="font-semibold text-orange-800 mb-2">
                        Analyse des doublons
                      </h4>
                      <div className="space-y-1 text-sm">
                        <p>
                          <strong>Total doublons:</strong>{" "}
                          {selectedFile.duplicates.totalDuplicates}
                        </p>
                        <p>
                          <strong>Groupes de doublons:</strong>{" "}
                          {selectedFile.duplicates.totalGroups}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Duplicate Groups */}
                  {selectedFile.duplicates.duplicateGroups.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-4">
                        Groupes de doublons (premiers{" "}
                        {Math.min(
                          10,
                          selectedFile.duplicates.duplicateGroups.length
                        )}
                        )
                      </h4>
                      <div className="space-y-3">
                        {selectedFile.duplicates.duplicateGroups
                          .slice(0, 10)
                          ?.map((group: any, index: number) => (
                            <div
                              key={index}
                              className="bg-red-50 p-3 rounded-lg border border-red-200"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-medium text-red-800">
                                  Matricule: {group.matricule}
                                </p>
                                <Badge variant="destructive">
                                  {group.count} copies
                                </Badge>
                              </div>
                              <div className="grid gap-2">
                                {group.students
                                  .slice(0, 3)
                                  ?.map(
                                    (student: any, studentIndex: number) => (
                                      <div
                                        key={studentIndex}
                                        className="text-xs bg-white p-2 rounded border"
                                      >
                                        <p>
                                          <strong>Nom:</strong>{" "}
                                          {student.nom_complet}
                                        </p>
                                        <p>
                                          <strong>École:</strong>{" "}
                                          {student.ecole}
                                        </p>
                                        <p>
                                          <strong>Moyenne:</strong>{" "}
                                          {student.moyenne}
                                        </p>
                                        <p>
                                          <strong>Décision:</strong>{" "}
                                          {student.decision_text}
                                        </p>
                                      </div>
                                    )
                                  )}
                                {group.students.length > 3 && (
                                  <p className="text-xs text-gray-500">
                                    ... et {group.students.length - 3} autres
                                    copies
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Sample Students */}
                  {selectedFile.students &&
                    selectedFile.students.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-4">
                          Aperçu des étudiants (premiers 10)
                        </h4>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Matricule</TableHead>
                                <TableHead>Nom</TableHead>
                                <TableHead>École</TableHead>
                                <TableHead>Moyenne</TableHead>
                                <TableHead>Décision</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedFile.students
                                .slice(0, 10)
                                ?.map((student: any, index: number) => (
                                  <TableRow key={index}>
                                    <TableCell className="font-mono text-xs">
                                      {student.matricule}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      {student.nom_complet}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      {student.ecole}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      {student.moyenne}
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        variant={
                                          student.admis
                                            ? "default"
                                            : "secondary"
                                        }
                                      >
                                        {student.decision_text}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Region Information */}
          {regionInfo && (
            <Card
              className={`shadow-lg ${
                regionInfo.status === "SUCCESS"
                  ? "border-blue-200"
                  : "border-red-200"
              }`}
            >
              <CardHeader>
                <CardTitle
                  className={`flex items-center ${
                    regionInfo.status === "SUCCESS"
                      ? "text-blue-700"
                      : "text-red-700"
                  }`}
                >
                  <Globe className="h-6 w-6 mr-2" />
                  Informations de Région et Environnement
                </CardTitle>
              </CardHeader>
              <CardContent>
                {regionInfo.status === "SUCCESS" && regionInfo.data && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Vercel Info */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-800 mb-2">
                        Vercel
                      </h4>
                      <div className="space-y-1 text-sm">
                        <p>
                          <strong>Région:</strong>{" "}
                          {regionInfo.data.vercelRegion}
                        </p>
                        <p>
                          <strong>Environnement:</strong>{" "}
                          {regionInfo.data.vercelEnv}
                        </p>
                        <p>
                          <strong>URL:</strong> {regionInfo.data.vercelUrl}
                        </p>
                      </div>
                    </div>

                    {/* AWS Lambda Info */}
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <h4 className="font-semibold text-orange-800 mb-2">
                        AWS Lambda
                      </h4>
                      <div className="space-y-1 text-sm">
                        <p>
                          <strong>Région AWS:</strong>{" "}
                          {regionInfo.data.awsRegion}
                        </p>
                        <p>
                          <strong>Mémoire:</strong>{" "}
                          {regionInfo.data.lambdaMemorySize}MB
                        </p>
                        <p>
                          <strong>Runtime:</strong>{" "}
                          {regionInfo.data.awsExecutionEnv}
                        </p>
                      </div>
                    </div>

                    {/* System Info */}
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h4 className="font-semibold text-green-800 mb-2">
                        Système
                      </h4>
                      <div className="space-y-1 text-sm">
                        <p>
                          <strong>Node.js:</strong>{" "}
                          {regionInfo.data.nodeVersion}
                        </p>
                        <p>
                          <strong>Plateforme:</strong>{" "}
                          {regionInfo.data.platform}
                        </p>
                        <p>
                          <strong>Architecture:</strong>{" "}
                          {regionInfo.data.architecture}
                        </p>
                      </div>
                    </div>

                    {/* Memory Usage */}
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 md:col-span-2">
                      <h4 className="font-semibold text-purple-800 mb-2">
                        Utilisation Mémoire
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <p>
                          <strong>RSS:</strong>{" "}
                          {Math.round(
                            regionInfo.data.memoryUsage.rss / 1024 / 1024
                          )}
                          MB
                        </p>
                        <p>
                          <strong>Heap Total:</strong>{" "}
                          {Math.round(
                            regionInfo.data.memoryUsage.heapTotal / 1024 / 1024
                          )}
                          MB
                        </p>
                        <p>
                          <strong>Heap Used:</strong>{" "}
                          {Math.round(
                            regionInfo.data.memoryUsage.heapUsed / 1024 / 1024
                          )}
                          MB
                        </p>
                        <p>
                          <strong>External:</strong>{" "}
                          {Math.round(
                            regionInfo.data.memoryUsage.external / 1024 / 1024
                          )}
                          MB
                        </p>
                      </div>
                    </div>

                    {/* Time Info */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-800 mb-2">
                        Temps
                      </h4>
                      <div className="space-y-1 text-sm">
                        <p>
                          <strong>Timezone:</strong> {regionInfo.data.timezone}
                        </p>
                        <p>
                          <strong>Uptime:</strong>{" "}
                          {Math.round(regionInfo.data.uptime)}s
                        </p>
                        <p>
                          <strong>Timestamp:</strong>{" "}
                          {new Date(regionInfo.data.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {regionInfo.error && (
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <p className="text-red-600">
                      <strong>Erreur:</strong> {regionInfo.error}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Test Results */}
          {testResult && (
            <Card
              className={`shadow-lg ${
                testResult.status === "OK"
                  ? "border-green-200"
                  : "border-red-200"
              }`}
            >
              <CardHeader>
                <CardTitle
                  className={`flex items-center ${
                    testResult.status === "OK"
                      ? "text-green-700"
                      : "text-red-700"
                  }`}
                >
                  <TestTube className="h-6 w-6 mr-2" />
                  Test de Connexion API
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p>
                    <strong>Status:</strong> {testResult.status}
                  </p>
                  {testResult.tests && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p>
                        <strong>Environment:</strong>{" "}
                        {testResult.tests.environment}
                      </p>
                      <p>
                        <strong>Region:</strong> {testResult.tests.vercelRegion}
                      </p>
                      <p>
                        <strong>Memory:</strong>{" "}
                        {JSON.stringify(testResult.tests.memoryUsage)}
                      </p>
                      <p>
                        <strong>Runtime:</strong> {testResult.tests.runtime}
                      </p>
                    </div>
                  )}
                  {testResult.error && (
                    <p className="text-red-600">
                      <strong>Erreur:</strong> {testResult.error}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Year and Exam Type Selection */}
          <Card className="shadow-lg border-primary-200">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl text-primary-700">
                <Calendar className="h-6 w-6 mr-2" />
                Sélectionner l'Année et le Type d'Examen
              </CardTitle>
              <CardDescription>
                Choisissez l'année et le type d'examen pour lesquels vous
                souhaitez télécharger ou gérer les données.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="year-select"
                    className="text-sm font-medium text-gray-700"
                  >
                    Année
                  </Label>
                  <Select
                    value={selectedYear.toString()}
                    onValueChange={(value) =>
                      setSelectedYear(Number.parseInt(value))
                    }
                  >
                    <SelectTrigger className="w-full border-primary-300 focus:border-primary-500 focus:outline-none">
                      <SelectValue placeholder="Choisir une année..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears?.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="exam-type-select"
                    className="text-sm font-medium text-gray-700"
                  >
                    Type d'Examen
                  </Label>
                  <Select
                    value={selectedExamType}
                    onValueChange={(value: "BAC" | "BREVET") =>
                      setSelectedExamType(value)
                    }
                  >
                    <SelectTrigger className="w-full border-primary-300 focus:border-primary-500 focus:outline-none">
                      <SelectValue placeholder="Choisir un type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {examTypes?.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4 p-3 bg-primary-50 rounded-lg border border-primary-200">
                <div className="text-sm text-gray-600">
                  Sélection actuelle:{" "}
                  <span className="font-semibold text-primary-600">
                    {selectedExamType} {selectedYear}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Multi-Step Upload Process */}
          <Card className="shadow-lg border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl text-blue-700">
                <Upload className="h-6 w-6 mr-2" />
                Télécharger le Fichier Excel - {selectedExamType} {selectedYear}
                {currentStep === "mapping" && (
                  <Badge variant="secondary" className="ml-2">
                    Étape 2/3: Mappage des colonnes
                  </Badge>
                )}
                {currentStep === "processing" && (
                  <Badge variant="secondary" className="ml-2">
                    Étape 3/3: Traitement
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {currentStep === "upload" && (
                  <>
                    Téléchargez votre fichier RES-{selectedExamType}-
                    {selectedYear}-FINALE.xlsx contenant les résultats des
                    étudiants. <strong>Stockage: PostgreSQL Database</strong>
                  </>
                )}
                {currentStep === "mapping" && (
                  <>
                    Mappez les colonnes de votre fichier Excel aux champs
                    requis. Les suggestions automatiques sont basées sur les
                    noms de colonnes courants.
                  </>
                )}
                {currentStep === "processing" && (
                  <>
                    Traitement et stockage des données en cours. Veuillez
                    patienter...
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: File Upload */}
              {currentStep === "upload" && (
                <>
                  {/* File Input */}
                  <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors bg-blue-50">
                    <FileSpreadsheet className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                    <div className="space-y-2">
                      <p className="text-lg font-medium text-gray-700">
                        {file ? (
                          <>
                            <span className="text-green-600">✓</span>{" "}
                            {file.name} ({(file.size / 1024 / 1024).toFixed(2)}
                            MB)
                          </>
                        ) : (
                          "Choisir un fichier Excel"
                        )}
                      </p>
                      <p className="text-sm text-gray-500">
                        Supporte les fichiers .xlsx et .xls (Maximum 4MB)
                        <br />
                        Types MIME acceptés: Excel, application/octet-stream
                        <br />
                        <span className="text-purple-600 font-medium">
                          📦 Stockage: Base de données PostgreSQL
                        </span>
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/octet-stream"
                      onChange={handleFileSelect}
                      className="mt-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 focus:outline-none"
                    />
                  </div>

                  {/* Action Buttons - Organized in Groups */}
                  <div className="space-y-4">
                    {/* Primary Actions */}
                    <div className="flex gap-3">
                      <Button
                        onClick={handleAnalyzeFile}
                        disabled={!file || analyzing}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                      >
                        {analyzing ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Analyse en cours...
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-2" />
                            Analyser le fichier Excel
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={clearData}
                        variant="destructive"
                        disabled={analyzing}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Effacer {selectedExamType} {selectedYear}
                      </Button>
                    </div>

                    {/* Secondary Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Button
                        onClick={recalculateRanks}
                        variant="outline"
                        disabled={analyzing}
                        className="border-blue-300 text-blue-600 hover:bg-blue-50"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Recalculer Rangs {selectedExamType} {selectedYear}
                      </Button>
                      <Button
                        onClick={debugAdmisLogic}
                        variant="outline"
                        disabled={analyzing}
                        className="border-orange-300 text-orange-600 hover:bg-orange-50"
                      >
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Analyser Logique Admis
                      </Button>
                    </div>

                    {/* Debug/Fix Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Button
                        onClick={() => fixAdmisLogic(true)}
                        variant="outline"
                        disabled={analyzing}
                        className="border-purple-300 text-purple-600 hover:bg-purple-50"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Test Correction Admis
                      </Button>
                      <Button
                        onClick={() => fixAdmisLogic(false)}
                        variant="outline"
                        disabled={analyzing}
                        className="border-green-300 text-green-600 hover:bg-green-50"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Corriger Logique Admis
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* Step 2: Column Mapping */}
              {currentStep === "mapping" && excelAnalysis && (
                <>
                  <div className="space-y-6">
                    {/* File Info */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-800 mb-2">
                        Fichier analysé:
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <p>
                          <strong>Nom:</strong> {excelAnalysis.fileName}
                        </p>
                        <p>
                          <strong>Taille:</strong>{" "}
                          {(excelAnalysis.fileSize / 1024 / 1024).toFixed(2)}MB
                        </p>
                        <p>
                          <strong>Lignes:</strong> {excelAnalysis.totalRows}
                        </p>
                        <p>
                          <strong>Colonnes:</strong>{" "}
                          {excelAnalysis.columns.length}
                        </p>
                      </div>
                    </div>

                    {/* Column Mapping Interface */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-800">
                        Mappage des colonnes:
                      </h4>
                      <div className="grid gap-4">
                        {excelAnalysis.requiredFields?.map((field) => (
                          <div
                            key={field.field}
                            className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-4 bg-gray-50 rounded-lg border"
                          >
                            <div>
                              <Label className="font-medium text-gray-700">
                                {field.field}
                              </Label>
                              <p className="text-xs text-gray-500 mt-1">
                                {field.description}
                              </p>
                              {[
                                "matricule",
                                "nom_complet",
                                "moyenne",
                                "decision",
                              ]?.includes(field.field) ||
                              (selectedExamType === "BAC" &&
                                ["section", "ecole", "etablissement"]?.includes(
                                  field.field
                                )) ||
                              (selectedExamType === "BREVET" &&
                                ["ecole", "etablissement"]?.includes(
                                  field.field
                                )) ? (
                                <Badge
                                  variant="destructive"
                                  className="mt-1 text-xs"
                                >
                                  Obligatoire
                                </Badge>
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className="mt-1 text-xs"
                                >
                                  Optionnel
                                </Badge>
                              )}
                            </div>
                            <div>
                              <Select
                                value={columnMapping[field.field] || "__none__"}
                                onValueChange={(value) =>
                                  handleColumnMappingChange(field.field, value)
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Sélectionner une colonne..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">
                                    -- Aucune --
                                  </SelectItem>
                                  {excelAnalysis.columns?.map((column) => (
                                    <SelectItem key={column} value={column}>
                                      {column}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="text-sm text-gray-600">
                              {columnMapping[field.field] && (
                                <div className="bg-white p-2 rounded border">
                                  <strong>Exemple:</strong>{" "}
                                  {excelAnalysis.sampleData[0]?.[
                                    columnMapping[field.field]
                                  ] || "N/A"}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sample Data Preview */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-gray-800">
                        Aperçu des données (3 premières lignes):
                      </h4>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {excelAnalysis.columns
                                .slice(0, 8)
                                ?.map((column) => (
                                  <TableHead key={column} className="text-xs">
                                    {column}
                                  </TableHead>
                                ))}
                              {excelAnalysis.columns.length > 8 && (
                                <TableHead className="text-xs">...</TableHead>
                              )}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {excelAnalysis.sampleData?.map((row, index) => (
                              <TableRow key={index}>
                                {excelAnalysis.columns
                                  .slice(0, 8)
                                  ?.map((column) => (
                                    <TableCell
                                      key={column}
                                      className="text-xs max-w-32 truncate"
                                    >
                                      {row[column] || ""}
                                    </TableCell>
                                  ))}
                                {excelAnalysis.columns.length > 8 && (
                                  <TableCell className="text-xs">...</TableCell>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex gap-4">
                    <Button onClick={resetToUpload} variant="outline">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Retour
                    </Button>
                    <Button
                      onClick={handleProcessWithMapping}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Traiter avec ce mappage
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </>
              )}

              {/* Step 3: Processing */}
              {currentStep === "processing" && (
                <>
                  {/* Upload Progress */}
                  {uploading && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>
                          Traitement et stockage en base de données pour{" "}
                          {selectedExamType} {selectedYear}...
                        </span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="w-full" />
                      <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        <span>
                          Traitement Excel + Stockage base de données - Cela
                          peut prendre plusieurs minutes...
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Upload Result */}
          {uploadResult && (
            <Card
              className={`shadow-lg ${
                uploadResult.success ? "border-green-200" : "border-red-200"
              }`}
            >
              <CardHeader>
                <CardTitle
                  className={`flex items-center ${
                    uploadResult.success ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {uploadResult.success ? (
                    <CheckCircle className="h-6 w-6 mr-2" />
                  ) : (
                    <AlertCircle className="h-6 w-6 mr-2" />
                  )}
                  {uploadResult.success
                    ? "Téléchargement Réussi"
                    : "Échec du Téléchargement"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">{uploadResult.message}</p>

                {/* Show error details if available */}
                {!uploadResult.success && uploadResult.details && (
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200 mb-4">
                    <h4 className="font-semibold text-red-800 mb-2">
                      Détails de l'erreur:
                    </h4>
                    <pre className="text-xs text-red-700 overflow-auto">
                      {JSON.stringify(uploadResult.details, null, 2)}
                    </pre>
                  </div>
                )}

                {uploadResult.success && uploadResult.stats && (
                  <div className="space-y-6">
                    {/* Success Message with Instructions */}
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200 mb-4">
                      <div className="flex items-center mb-2">
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                        <h4 className="font-semibold text-green-800">
                          Données uploadées avec succès !
                        </h4>
                      </div>
                      <p className="text-green-700 text-sm mb-3">
                        Les données ont été stockées en base de données et sont
                        maintenant disponibles sur le site.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => window.open("/", "_blank")}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Globe className="h-4 w-4 mr-2" />
                          Voir sur le Site
                        </Button>
                        <Button
                          onClick={getDatabaseInfo}
                          size="sm"
                          variant="outline"
                          className="border-green-300 text-green-600 hover:bg-green-50 bg-transparent"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Actualiser Info Base de Données
                        </Button>
                      </div>
                    </div>

                    {/* Main Statistics */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-600 font-medium">
                          Total Étudiants
                        </p>
                        <p className="text-2xl font-bold text-blue-700">
                          {uploadResult.stats.totalStudents}
                        </p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <p className="text-sm text-green-600 font-medium">
                          Admis
                        </p>
                        <p className="text-2xl font-bold text-green-700">
                          {uploadResult.stats.admittedStudents}
                        </p>
                        <p className="text-xs text-green-600">
                          ({uploadResult.stats.admissionRate}%)
                        </p>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <p className="text-sm text-purple-600 font-medium">
                          Sections
                        </p>
                        <p className="text-2xl font-bold text-purple-700">
                          {uploadResult.stats.sections?.length}
                        </p>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                        <p className="text-sm text-orange-600 font-medium">
                          Moyenne Générale
                        </p>
                        <p className="text-2xl font-bold text-orange-700">
                          {uploadResult.stats.averageScore}
                        </p>
                      </div>
                    </div>

                    {/* File and Database Info */}
                    {uploadResult.details && (
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h4 className="font-semibold text-gray-800 mb-2">
                          Informations du fichier et stockage:
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p>
                              <strong>Nom:</strong> {uploadResult.details.name}
                            </p>
                            <p>
                              <strong>Taille:</strong>{" "}
                              {(
                                uploadResult.details.size /
                                1024 /
                                1024
                              ).toFixed(2)}
                              MB
                            </p>
                            <p>
                              <strong>Type:</strong> {uploadResult.details.type}
                            </p>
                          </div>
                          <div>
                            <p>
                              <strong>Stocké:</strong> ✅ Oui (Database
                              PostgreSQL)
                            </p>
                            <p>
                              <strong>Persistant:</strong> ✅ Oui
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Detailed Information */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <p className="font-medium mb-2">Sections (SERIE):</p>
                        <div className="flex flex-wrap gap-2">
                          {uploadResult.stats.sections?.map((section) => (
                            <Badge key={section} variant="secondary">
                              {section}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="font-medium mb-2">Wilayas:</p>
                        <div className="flex flex-wrap gap-2">
                          {uploadResult.stats.wilayas
                            .slice(0, 8)
                            ?.map((wilaya) => (
                              <Badge key={wilaya} variant="outline">
                                {wilaya}
                              </Badge>
                            ))}
                          {uploadResult.stats.wilayas.length > 8 && (
                            <Badge variant="outline">
                              +{uploadResult.stats.wilayas.length - 8} autres
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
