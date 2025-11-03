// src/app/(withSidebar)/admin/qr-management/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import axios from "axios";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import JSZip from "jszip";
import * as htmlToImage from "html-to-image";
import "../../../../../public/assets/fonts/NotoSansHebrew-Regular-normal.js";
import { toast } from "sonner";
import {
  SquarePen,
  Trash,
  Printer,
  Sheet,
  Search,
  Loader2,
  ChevronDown,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { usePageHeader } from "@/components/page-header-context";

type QRCode = {
  id: string;
  type: "IDENTITY" | "PRESET";
  code: string;
  imageUrl: string;
  storagePath: string;
  isActive: boolean;
  createdAt: string;
  identity: {
    donorId: string;
    name: string;
    className: string | null;
    gradeName: string | null;
    year: string | null;
  } | null;
  preset: {
    groupId: string | null;
    groupName: string | null;
    amount: string | null;
    label: string | null;
  } | null;
};

// Type for Groups (for the edit dropdown)
type Group = {
  id: string;
  name: string;
};

// Type for the edit form state
type EditFormState = {
  // IDENTITY fields
  studentName: string;
  studentClass: string;
  studentGrade: string;
  studentYear: string;
  // PRESET fields
  groupId: string;
  amount: string;
  label: string;
  // Common field
  isActive: boolean;
};

export default function QRManagementPage() {
  const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
  const [loading, setLoading] = useState(true);
  // ✨ Add processing state for full-screen loader
  const [processing, setProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("");

  // filters
  const [filterType, setFilterType] = useState<"ALL" | "IDENTITY" | "PRESET">(
    "ALL"
  );
  const [filterActive, setFilterActive] = useState<"ALL" | "YES" | "NO">("ALL");
  const [filterGrade, setFilterGrade] = useState<string>("ALL");
  const [filterClass, setFilterClass] = useState<string>("ALL");
  const [filterYear, setFilterYear] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // State for Edit Dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingQr, setEditingQr] = useState<QRCode | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);

  const [editForm, setEditForm] = useState<EditFormState>({
    studentName: "",
    studentClass: "",
    studentGrade: "",
    studentYear: "",
    groupId: "",
    amount: "",
    label: "",
    isActive: true,
  });

  const { setTitle } = usePageHeader();

  useEffect(() => {
    setTitle("QR Code Management"); // ✅ Show in layout header
  }, [setTitle]);

  const fetchData = async () => {
    try {
      // Fetch both QR Codes and Groups
      const [qrRes, groupsRes] = await Promise.all([
        axios.get<{ data: QRCode[] }>("/api/qr/get-all-qrcodes"),
        axios.get<{ data: Group[] }>("/api/admin/groups/get-all-groups"),
      ]);
      setQrCodes(qrRes.data.data);
      setGroups(groupsRes.data.data);
    } catch {
      toast.error("Failed to fetch page data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Helper functions to get unique filter values
  const getUniqueGrades = () => {
    const grades = qrCodes
      .filter((q) => q.type === "IDENTITY" && q.identity?.gradeName)
      .map((q) => q.identity!.gradeName!)
      .filter((grade, index, arr) => arr.indexOf(grade) === index)
      .sort();
    return grades;
  };

  const getUniqueClasses = () => {
    const classes = qrCodes
      .filter((q) => q.type === "IDENTITY" && q.identity?.className)
      .map((q) => q.identity!.className!)
      .filter((className, index, arr) => arr.indexOf(className) === index)
      .sort();
    return classes;
  };

  const getUniqueYears = () => {
    const years = qrCodes
      .filter((q) => q.type === "IDENTITY" && q.identity?.year)
      .map((q) => q.identity!.year!)
      .filter((year, index, arr) => arr.indexOf(year) === index)
      .sort();
    return years;
  };

  const toQrImgUrl = (storagePath: string) =>
    `/api/qr/${storagePath.split("/").map(encodeURIComponent).join("/")}`;

  // Filtered rows (used for table + export/print)
  const filtered = useMemo(() => {
    return qrCodes.filter((q) => {
      const matchesType = filterType === "ALL" ? true : q.type === filterType;
      const matchesActive =
        filterActive === "ALL"
          ? true
          : filterActive === "YES"
          ? q.isActive
          : !q.isActive;

      // Only apply grade/class/year filters to IDENTITY type QR codes
      const matchesGrade =
        filterGrade === "ALL" ||
        (q.type === "IDENTITY" && q.identity?.gradeName === filterGrade);

      const matchesClass =
        filterClass === "ALL" ||
        (q.type === "IDENTITY" && q.identity?.className === filterClass);

      const matchesYear =
        filterYear === "ALL" ||
        (q.type === "IDENTITY" && q.identity?.year === filterYear);

      // Search functionality - searches through relevant text fields
      const matchesSearch =
        searchQuery === "" ||
        (() => {
          const lowerQuery = searchQuery.toLowerCase();

          // Search in ID
          if (q.id.toLowerCase().includes(lowerQuery)) return true;

          // Search in type
          if (q.type.toLowerCase().includes(lowerQuery)) return true;

          // For IDENTITY type, search in name, class, grade, year
          if (q.type === "IDENTITY" && q.identity) {
            if (q.identity.name.toLowerCase().includes(lowerQuery)) return true;
            if (q.identity.className?.toLowerCase().includes(lowerQuery))
              return true;
            if (q.identity.gradeName?.toLowerCase().includes(lowerQuery))
              return true;
            if (q.identity.year?.toLowerCase().includes(lowerQuery))
              return true;
          }

          // For PRESET type, search in group name, amount, label
          if (q.type === "PRESET" && q.preset) {
            if (q.preset.groupName?.toLowerCase().includes(lowerQuery))
              return true;
            if (q.preset.amount?.toLowerCase().includes(lowerQuery))
              return true;
            if (q.preset.label?.toLowerCase().includes(lowerQuery)) return true;
          }

          return false;
        })();

      return (
        matchesType &&
        matchesActive &&
        matchesGrade &&
        matchesClass &&
        matchesYear &&
        matchesSearch
      );
    });
  }, [
    qrCodes,
    filterType,
    filterActive,
    filterGrade,
    filterClass,
    filterYear,
    searchQuery,
  ]);

  // Selection helpers
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((q) => selectedIds.has(q.id));
  const someFilteredSelected = filtered.some((q) => selectedIds.has(q.id));

  const toggleSelectAllFiltered = (checked: boolean | "indeterminate") => {
    const next = new Set(selectedIds);
    if (checked) filtered.forEach((q) => next.add(q.id));
    else filtered.forEach((q) => next.delete(q.id));
    setSelectedIds(next);
  };

  const toggleRow = (id: string, checked: boolean | "indeterminate") => {
    const next = new Set(selectedIds);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    setSelectedIds(next);
  };

  // ✨ Handle Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      window.alert("No QR codes selected");
      return;
    }

    if (
      !window.confirm(
        "Are you sure you want to delete the selected QR codes permanently?"
      )
    ) {
      return;
    }

    setProcessing(true);
    setProcessingMessage("Deleting QR codes...");

    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          axios.delete(`/api/qr/update-or-delete-qr/${id}`)
        )
      );
      toast.success("Selected QR codes deleted.");
      setQrCodes((prev) => prev.filter((q) => !selectedIds.has(q.id)));
      setSelectedIds(new Set());
    } catch {
      toast.error("Failed to delete selected QR codes.");
    } finally {
      setProcessing(false);
      setProcessingMessage("");
    }
  };

  const openEditDialog = (qr: QRCode) => {
    setEditingQr(qr);
    if (qr.type === "IDENTITY" && qr.identity) {
      setEditForm({
        studentName: qr.identity.name,
        studentClass: qr.identity.className ?? "",
        studentGrade: qr.identity.gradeName ?? "",
        studentYear: qr.identity.year ?? "",
        groupId: "",
        amount: "",
        label: "",
        isActive: qr.isActive,
      });
    } else if (qr.type === "PRESET" && qr.preset) {
      setEditForm({
        studentName: "",
        studentClass: "",
        studentGrade: "",
        studentYear: "",
        groupId: qr.preset.groupId ?? "",
        amount: qr.preset.amount ?? "",
        label: qr.preset.label ?? "",
        isActive: qr.isActive,
      });
    }
    setEditOpen(true);
  };

  // ✨ Handle Update submission
  const handleUpdate = async () => {
    if (!editingQr) return;

    let payload;
    if (editingQr.type === "IDENTITY") {
      if (
        !editForm.studentName ||
        !editForm.studentClass ||
        !editForm.studentGrade
      ) {
        toast.error("Name, Class, and Grade are required.");
        return;
      }
      payload = {
        type: "IDENTITY",
        studentName: editForm.studentName,
        studentClass: editForm.studentClass,
        studentGrade: editForm.studentGrade,
        studentYear: editForm.studentYear,
        isActive: editForm.isActive,
      };
    } else {
      // PRESET
      if (!editForm.groupId || !editForm.amount) {
        toast.error("Group and Amount are required.");
        return;
      }
      payload = {
        type: "PRESET",
        groupId: editForm.groupId,
        amount: parseFloat(editForm.amount),
        label: editForm.label,
        isActive: editForm.isActive,
      };
    }

    try {
      await axios.patch(`/api/qr/update-or-delete-qr/${editingQr.id}`, payload);
      toast.success("QR Code updated successfully.");
      setEditOpen(false);
      setEditingQr(null);
      fetchData(); // Refresh data from server
    } catch (err) {
      toast.error("Failed to update QR Code.");
      console.error(err);
    }
  };

  // ✨ Handle Delete
  const handleDelete = async (id: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this QR code permanently?"
      )
    ) {
      return;
    }

    setProcessing(true);
    setProcessingMessage("Deleting QR code...");

    try {
      await axios.delete(`/api/qr/update-or-delete-qr/${id}`);
      toast.success("QR Code deleted.");
      // Optimistic UI update
      setQrCodes((prev) => prev.filter((q) => q.id !== id));
    } catch {
      toast.error("Failed to delete QR Code.");
    } finally {
      setProcessing(false);
      setProcessingMessage("");
    }
  };

  const rowsForExportOrPrint = selectedIds.size
    ? filtered.filter((q) => selectedIds.has(q.id))
    : filtered;

  /* ---------- Export Excel ---------- */
  const handleExportExcel = async () => {
    if (!rowsForExportOrPrint.length) {
      toast.message("Nothing to export", {
        description: "Adjust filters or select rows.",
      });
      return;
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("QR Codes");

    ws.columns = [
      { header: "ID", key: "id", width: 28 },
      { header: "Type", key: "type", width: 12 },
      { header: "Active", key: "active", width: 10 },
      { header: "Year", key: "year", width: 10 },
      { header: "Name/Group", key: "who", width: 26 },
      { header: "Class", key: "className", width: 10 },
      { header: "Grade", key: "gradeName", width: 10 },
      { header: "Amount", key: "amount", width: 12 },
      { header: "Label", key: "label", width: 24 },
    ];

    for (const q of rowsForExportOrPrint) {
      ws.addRow({
        id: q.id,
        type: q.type,
        active: q.isActive ? "Yes" : "No",
        year: q.identity?.year ?? "",
        who:
          q.type === "IDENTITY" && q.identity
            ? q.identity.name
            : q.type === "PRESET" && q.preset
            ? q.preset.groupName ?? ""
            : "",
        className: q.identity?.className ?? "",
        gradeName: q.identity?.gradeName ?? "",
        amount: q.preset?.amount ?? "",
        label: q.preset?.label ?? "",
      });
    }

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "qr-codes.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ---------- Print (PDF) helpers ---------- */

  // Build a printable caption for each QR
  const getCaption = (q: QRCode) => {
    if (q.type === "IDENTITY" && q.identity) return q.identity.name;
    if (q.type === "PRESET" && q.preset) return q.preset.groupName ?? "Fund";
    return "";
  };

  // Fetch image as dataURL for jsPDF with caching
  const imageCache = new Map<string, string>();

  const fetchImageAsDataURL = async (url: string): Promise<string> => {
    if (imageCache.has(url)) {
      return imageCache.get(url)!;
    }

    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    // png assumed for QR
    const bytes = new Uint8Array(buf);
    const bin = bytes.reduce((acc, b) => acc + String.fromCharCode(b), "");
    const dataUrl = `data:image/png;base64,${btoa(bin)}`;

    imageCache.set(url, dataUrl);
    return dataUrl;
  };

  // Fetch images in parallel with concurrency limit
  const fetchImagesInBatches = async (
    urls: string[],
    batchSize = 10
  ): Promise<Map<string, string>> => {
    const imageMap = new Map<string, string>();

    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const promises = batch.map(async (url) => {
        try {
          const dataUrl = await fetchImageAsDataURL(url);
          return { url, dataUrl };
        } catch (error) {
          console.warn(`Failed to fetch image: ${url}`, error);
          return { url, dataUrl: null };
        }
      });

      const results = await Promise.all(promises);
      results.forEach(({ url, dataUrl }) => {
        if (dataUrl) {
          imageMap.set(url, dataUrl);
        }
      });

      // Update progress
      const progress = Math.min(i + batchSize, urls.length);
      setProcessingMessage(`Loading images... (${progress}/${urls.length})`);
    }

    return imageMap;
  };

  // Create a PDF of the given rows (grid of cards) with batch processing
  const printQRCodesToPdf = async (rows: QRCode[]) => {
    if (!rows.length) {
      toast.message("Nothing to print", {
        description: "Adjust filters or select rows.",
      });
      return;
    }

    const MAX_ITEMS_PER_PDF = 200; // Limit to prevent memory issues

    if (rows.length > MAX_ITEMS_PER_PDF) {
      const shouldProceed = window.confirm(
        `You're trying to print ${
          rows.length
        } QR codes. This will be split into ${Math.ceil(
          rows.length / MAX_ITEMS_PER_PDF
        )} separate PDF files. Continue?`
      );
      if (!shouldProceed) return;
    }

    setProcessing(true);
    setProcessingMessage("Preparing QR codes for printing...");

    try {
      // Split into batches if too many items
      const batches = [];
      for (let i = 0; i < rows.length; i += MAX_ITEMS_PER_PDF) {
        batches.push(rows.slice(i, i + MAX_ITEMS_PER_PDF));
      }

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const batchNumber =
          batches.length > 1 ? ` (${batchIndex + 1}/${batches.length})` : "";

        setProcessingMessage(`Generating PDF${batchNumber}...`);

        // Pre-fetch all images for this batch
        const imageUrls = batch.map((q) => toQrImgUrl(q.storagePath));
        const imageMap = await fetchImagesInBatches(imageUrls);

        setProcessingMessage(`Creating PDF${batchNumber}...`);

        // Letter size in points (jsPDF default units = 'pt')
        const doc = new jsPDF({ unit: "pt", format: "letter" }); // 612 x 792
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();

        // Card layout: 2 columns x 4 rows per page (8 per page)
        const cols = 2;
        const rowsPerPage = 4;
        const margin = 36; // 0.5 inch
        const gutter = 24;

        const cardW = (pageW - margin * 2 - gutter * (cols - 1)) / cols;
        const cardH =
          (pageH - margin * 2 - gutter * (rowsPerPage - 1)) / rowsPerPage;

        const qrSize = Math.min(cardW, cardH) * 0.5; // QR image size
        const titleFontSize = 12;
        const metaFontSize = 10;

        for (let index = 0; index < batch.length; index++) {
          const q = batch[index];
          const col = index % cols;
          const row = Math.floor((index % (cols * rowsPerPage)) / cols);

          if (index > 0 && index % (cols * rowsPerPage) === 0) {
            doc.addPage();
          }

          const startX = margin + col * (cardW + gutter);
          const startY = margin + row * (cardH + gutter);

          // Card border (optional)
          doc.setDrawColor(200);
          doc.rect(startX, startY, cardW, cardH);

          // Add logo in the top-right corner of the card
          try {
            const logoSize = 24; // Small logo size
            const logoX = startX + cardW - logoSize - 8; // 8pt padding from right edge
            const logoY = startY + cardH - logoSize - 7; // 7pt padding from top edge
            doc.addImage(
              "/assets/logos/logo-qr.png",
              "PNG",
              logoX,
              logoY,
              logoSize,
              logoSize
            );
          } catch (error) {
            console.warn("Could not add logo to PDF:", error);
          }

          // Caption (always English, so Helvetica is fine)
          const caption = getCaption(q) || "";
          doc.setFont("helvetica", "bold");
          doc.setFontSize(titleFontSize);
          doc.text(caption, startX + cardW / 2, startY + 28, {
            align: "center",
          });

          let metaExists = false; // 👈 track whether we printed a meta line

          // (Optional) secondary meta line (for identity, show Class/Grade)
          if (q.type === "IDENTITY" && q.identity) {
            const cls = q.identity.className || "-";
            const grd = q.identity.gradeName || "-";

            const metaClass = `Class ${cls}`;
            const metaGrade = `• Grade ${grd}`;

            const baseY = startY + 44; // single line Y position

            // 1. Render className part (Hebrew font)
            doc.setFont("NotoSansHebrew-Regular", "normal");
            doc.setFontSize(metaFontSize);
            const classWidth = doc.getTextWidth(metaClass);

            // 2. Measure full line width (class + grade)
            doc.setFont("helvetica", "normal");
            const gradeWidth = doc.getTextWidth(metaGrade);
            const fullWidth = classWidth + gradeWidth + 4; // +4pt spacing buffer

            // 3. Compute starting X so it's centered
            const startXLine = startX + cardW / 2 - fullWidth / 2;

            // 4. Draw class (Hebrew font)
            doc.setFont("NotoSansHebrew-Regular", "normal");
            doc.text(metaClass, startXLine, baseY);

            // 5. Draw grade (Helvetica) right after
            doc.setFont("helvetica", "normal");
            doc.text(metaGrade, startXLine + classWidth + 4, baseY);

            metaExists = true;
          } else if (q.type === "PRESET" && q.preset) {
            const amt = q.preset.amount ? `$${q.preset.amount}` : "";
            const meta = [q.preset.label, amt].filter(Boolean).join(" • ");
            if (meta) {
              doc.setFont("helvetica", "normal");
              doc.setFontSize(metaFontSize);
              doc.text(meta, startX + cardW / 2, startY + 44, {
                align: "center",
              });
              metaExists = true; // 👈 meta printed
            }
          }

          // ===== move QR down so it never overlaps text =====
          const topAfterTextY = metaExists ? startY + 38 : startY + 18; // notice: IDENTITY prints 2 lines
          const qrTopPadding = 10;
          const imgX = startX + (cardW - qrSize) / 2;
          const imgY = topAfterTextY + qrTopPadding;

          // Use pre-fetched image
          const imageUrl = toQrImgUrl(q.storagePath);
          const dataUrl = imageMap.get(imageUrl);

          if (dataUrl) {
            try {
              doc.addImage(dataUrl, "PNG", imgX, imgY, qrSize, qrSize);
            } catch (error) {
              console.warn("Failed to add QR image to PDF:", error);
              // Fallback: draw placeholder
              doc.setDrawColor(150);
              doc.rect(imgX, imgY, qrSize, qrSize);
              doc.setFontSize(8);
              doc.text("QR unavailable", imgX + qrSize / 2, imgY + qrSize / 2, {
                align: "center",
              });
            }
          } else {
            // Fallback: draw placeholder
            doc.setDrawColor(150);
            doc.rect(imgX, imgY, qrSize, qrSize);
            doc.setFontSize(8);
            doc.text("QR unavailable", imgX + qrSize / 2, imgY + qrSize / 2, {
              align: "center",
            });
          }

          // Add "BAIS SHAINDEL CHESSED" text at the bottom of the QR code
          const chessedText = "BAIS SHAINDEL CHESSED";
          const chessedY = imgY + qrSize + 20; // 20pt space below QR code
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.text(chessedText, startX + cardW / 2, chessedY, {
            align: "center",
          });

          // Update progress within batch
          if (index % 10 === 0 || index === batch.length - 1) {
            setProcessingMessage(
              `Creating PDF${batchNumber}... (${index + 1}/${batch.length})`
            );
            // Allow UI to update
            await new Promise((resolve) => setTimeout(resolve, 1));
          }
        }

        // Save the PDF
        const filename =
          batches.length > 1
            ? `qr-codes-batch-${batchIndex + 1}.pdf`
            : "qr-codes.pdf";

        doc.save(filename);

        // Clear image cache between batches to free memory
        imageCache.clear();

        // Small delay between batches to prevent UI freezing
        if (batchIndex < batches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      toast.success(
        batches.length > 1
          ? `Generated ${batches.length} PDF files successfully!`
          : "PDF generated successfully!"
      );
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF. Please try with fewer QR codes.");
    } finally {
      setProcessing(false);
      setProcessingMessage("");
      imageCache.clear();
    }
  };

  // --- Canvas-based JPEG renderer (robust and CORS-safe) ---
  const loadImageFromBlobUrl = (blobUrl: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = blobUrl;
    });

  const fetchAsImage = async (url: string): Promise<HTMLImageElement> => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch image: ${url}`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    try {
      const img = await loadImageFromBlobUrl(blobUrl);
      return img;
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  };

  // Draw a 4x2 inch (landscape) card => 1200 x 600 px at 300 DPI
  const renderQrCardToJpegBlob = async (q: QRCode): Promise<Blob> => {
    const WIDTH = 1200;
    const HEIGHT = 600;
    const canvas = document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Border
    ctx.strokeStyle = "#e5e7eb"; // Tailwind slate-200
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 8, WIDTH - 16, HEIGHT - 16);

    // Title (name / group)
    const caption = getCaption(q) || "";
    ctx.fillStyle = "#000000";
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(caption, WIDTH / 2, 40);

    // Meta line
    let metaText = "";
    if (q.type === "IDENTITY" && q.identity) {
      const cls = q.identity.className || "-";
      const grd = q.identity.gradeName || "-";
      metaText = `Class ${cls} • Grade ${grd}`;
    } else if (q.type === "PRESET" && q.preset) {
      const amt = q.preset.amount ? `$${q.preset.amount}` : "";
      metaText = [q.preset.label, amt].filter(Boolean).join(" • ");
    }
    if (metaText) {
      ctx.fillStyle = "#4b5563"; // slate-600
      ctx.font = "normal 32px Arial";
      ctx.fillText(metaText, WIDTH / 2, 100);
    }

    // Load images
    const qrImg = await fetchAsImage(toQrImgUrl(q.storagePath));
    let logoImg: HTMLImageElement | null = null;
    try {
      logoImg = await fetchAsImage("/assets/logos/logo-qr.png");
    } catch {
      // optional
    }

    // Draw QR
    const qrSize = 320; // fits comfortably
    const qrX = (WIDTH - qrSize) / 2;
    const qrY = 160;
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    // Brand line under QR
    ctx.fillStyle = "#000000";
    ctx.font = "bold 30px Arial";
    ctx.fillText("BAIS SHAINDEL CHESSED", WIDTH / 2, qrY + qrSize + 24);

    // Small logo (optional) bottom-right
    if (logoImg) {
      const ls = 50;
      ctx.drawImage(logoImg, WIDTH - ls - 24, HEIGHT - ls - 24, ls, ls);
    }

    // Export to JPEG
    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("JPEG blob failed"))),
        "image/jpeg",
        0.95
      );
    });
    return blob;
  };

  // Generate JPEG images for QR codes
  const generateJPEGImages = async (rows: QRCode[]) => {
    if (!rows.length) {
      toast.message("Nothing to export", {
        description: "Adjust filters or select rows.",
      });
      return;
    }

    setProcessing(true);
    setProcessingMessage("Generating JPEG images...");

    try {
      const images: { name: string; blob: Blob }[] = [];

      for (let i = 0; i < rows.length; i++) {
        const q = rows[i];
        setProcessingMessage(
          `Generating JPEG image ${i + 1}/${rows.length}...`
        );

        try {
          // Render with canvas and get JPEG blob
          const blob = await renderQrCardToJpegBlob(q);

          // Generate filename
          const caption = getCaption(q) || "QR";
          const sanitizedCaption = caption
            .replace(/[^a-zA-Z0-9\s]/g, "")
            .replace(/\s+/g, "_");
          const filename = `${sanitizedCaption}_${q.id.slice(-8)}.jpg`;

          images.push({ name: filename, blob });
        } catch (error) {
          console.error(`Failed to generate JPEG for QR ${q.id}:`, error);
          toast.error(`Failed to generate image for ${getCaption(q) || q.id}`);
        }

        // Small delay to prevent UI freezing
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      if (images.length === 1) {
        // Single image download
        const { name, blob } = images[0];
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("JPEG image downloaded!");
      } else {
        // Multiple images - create ZIP
        setProcessingMessage("Creating ZIP archive...");
        const zip = new JSZip();

        images.forEach(({ name, blob }) => {
          zip.file(name, blob);
        });

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "qr-codes-images.zip";
        a.click();
        URL.revokeObjectURL(url);
        toast.success("ZIP file with JPEG images downloaded!");
      }
    } catch (error) {
      console.error("Error generating JPEG images:", error);
      toast.error("Failed to generate JPEG images. Please try again.");
    } finally {
      setProcessing(false);
      setProcessingMessage("");
    }
  };

  // Bulk print button
  const handlePrintSelected = async (format: "pdf" | "jpeg") => {
    if (format === "pdf") {
      await printQRCodesToPdf(rowsForExportOrPrint);
    } else {
      await generateJPEGImages(rowsForExportOrPrint);
    }
  };

  // Per-row print button
  const handlePrintSingle = async (q: QRCode, format: "pdf" | "jpeg") => {
    if (format === "pdf") {
      await printQRCodesToPdf([q]);
    } else {
      await generateJPEGImages([q]);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <Card className="mx-auto max-w-full">
        <CardHeader className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
          {/* ✨ Left Half: Filter Controls */}
          <div className="flex flex-col gap-3">
            {/* First row of filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Filter: Type */}
              <Select
                value={filterType}
                onValueChange={(v: "ALL" | "IDENTITY" | "PRESET") =>
                  setFilterType(v)
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="IDENTITY">Identity</SelectItem>
                  <SelectItem value="PRESET">Preset</SelectItem>
                </SelectContent>
              </Select>

              {/* Filter: Active */}
              <Select
                value={filterActive}
                onValueChange={(v: "ALL" | "YES" | "NO") => setFilterActive(v)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Active" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="YES">Active</SelectItem>
                  <SelectItem value="NO">Inactive</SelectItem>
                </SelectContent>
              </Select>

              {/* Filter: Grade */}
              <Select value={filterGrade} onValueChange={setFilterGrade}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Grades</SelectItem>
                  {getUniqueGrades().map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Second row of filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Filter: Class */}
              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Classes</SelectItem>
                  {getUniqueClasses().map((className) => (
                    <SelectItem key={className} value={className}>
                      {className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filter: Year */}
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Years</SelectItem>
                  {getUniqueYears().map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ✨ Right Half: Search Bar + Action Buttons */}
          <div className="flex flex-col gap-3 items-stretch lg:items-end w-full lg:w-auto">
            {/* Search Bar */}
            <div className="relative w-full lg:w-80">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={16}
              />
              <Input
                placeholder="Search QR codes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Export Excel */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleExportExcel}
                    style={{ backgroundColor: "var(--card-colour-1)" }}
                    className="text-white"
                  >
                    <Sheet size={16} /> Excel
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Export the selected QR codes to Excel</p>
                </TooltipContent>
              </Tooltip>

              {/* Print Bulk Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    style={{ backgroundColor: "var(--card-colour-3)" }}
                    className="text-white hover:text-white"
                    variant="outline"
                  >
                    <Printer size={16} /> Print <ChevronDown size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handlePrintSelected("pdf")}>
                    <FileText size={16} className="mr-2" />
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePrintSelected("jpeg")}>
                    <ImageIcon size={16} className="mr-2" />
                    Export as JPEG
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Delete Selected */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleBulkDelete}
                    style={{ backgroundColor: "var(--card-colour-4)" }}
                    className="text-white"
                    variant="destructive"
                  >
                    <Trash size={16} /> Delete
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete the selected QR codes permanently</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-10 text-gray-500">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              No QR codes found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={
                        allFilteredSelected
                          ? true
                          : someFilteredSelected
                          ? "indeterminate"
                          : false
                      }
                      onCheckedChange={toggleSelectAllFiltered}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Type</TableHead>
                  {/* Removed Code column as requested */}
                  <TableHead>Image</TableHead>
                  <TableHead>Caption</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Donor/Group</TableHead>
                  <TableHead>Amount/Label</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.map((q) => {
                  const caption = getCaption(q);
                  return (
                    <TableRow key={q.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(q.id)}
                          onCheckedChange={(checked) =>
                            toggleRow(q.id, checked)
                          }
                          aria-label={`Select row`}
                        />
                      </TableCell>

                      <TableCell>{q.type}</TableCell>

                      <TableCell>
                        <Image
                          src={toQrImgUrl(q.storagePath)}
                          alt="QR"
                          width={60}
                          height={60}
                          style={{
                            border: "1px solid #e5e7eb",
                            borderRadius: 4,
                          }}
                        />
                      </TableCell>

                      <TableCell className="font-medium">
                        {caption || "-"}
                      </TableCell>

                      <TableCell>{q.isActive ? "Yes" : "No"}</TableCell>

                      <TableCell>
                        {(q.type === "IDENTITY" && q.identity?.year) || "-"}
                      </TableCell>

                      <TableCell>
                        {q.type === "IDENTITY" && q.identity
                          ? `${q.identity.name} (${
                              q.identity.className || "-"
                            }, ${q.identity.gradeName || "-"})`
                          : q.type === "PRESET" && q.preset
                          ? q.preset.groupName || "-"
                          : "-"}
                      </TableCell>

                      <TableCell>
                        {q.type === "PRESET" && q.preset
                          ? `${q.preset.amount || "-"} ${
                              q.preset.label ? `(${q.preset.label})` : ""
                            }`
                          : "-"}
                      </TableCell>

                      <TableCell className="text-right space-x-2">
                        {/* Edit Button */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(q)}
                              style={{
                                backgroundColor: "var(--card-colour-7)",
                              }}
                              className="text-white"
                            >
                              <SquarePen size={16} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit QR code</p>
                          </TooltipContent>
                        </Tooltip>

                        {/* Delete Button */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(q.id)}
                              style={{
                                backgroundColor: "var(--card-colour-4)",
                              }}
                            >
                              <Trash size={16} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete QR code</p>
                          </TooltipContent>
                        </Tooltip>

                        {/* Print Button Dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant="secondary"
                              style={{
                                backgroundColor: "var(--card-colour-3)",
                              }}
                              className="text-white"
                            >
                              <Printer size={16} />
                              <ChevronDown size={12} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() => handlePrintSingle(q, "pdf")}
                            >
                              <FileText size={16} className="mr-2" />
                              PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handlePrintSingle(q, "jpeg")}
                            >
                              <ImageIcon size={16} className="mr-2" />
                              JPEG
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {/* ✨ Edit Dialog Component */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit QR Code</DialogTitle>
          </DialogHeader>
          {editingQr && (
            <div className="space-y-4 py-2">
              {/* Conditional form for IDENTITY type */}
              {editingQr.type === "IDENTITY" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="edit-studentName">Student Name</Label>
                    <Input
                      id="edit-studentName"
                      value={editForm.studentName}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          studentName: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-studentClass">Class</Label>
                    <Input
                      id="edit-studentClass"
                      value={editForm.studentClass}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          studentClass: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-studentGrade">Grade</Label>
                    <Input
                      id="edit-studentGrade"
                      value={editForm.studentGrade}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          studentGrade: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-studentYear">Year</Label>
                    <Input
                      id="edit-studentYear"
                      value={editForm.studentYear}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          studentYear: e.target.value,
                        })
                      }
                    />
                  </div>
                </>
              )}
              {/* Conditional form for PRESET type */}
              {editingQr.type === "PRESET" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="edit-group">Group</Label>
                    <Select
                      value={editForm.groupId}
                      onValueChange={(v) =>
                        setEditForm({ ...editForm, groupId: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Group" />
                      </SelectTrigger>
                      <SelectContent>
                        {groups.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-amount">Amount</Label>
                    <Input
                      id="edit-amount"
                      type="number"
                      value={editForm.amount}
                      onChange={(e) =>
                        setEditForm({ ...editForm, amount: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-label">Label (optional)</Label>
                    <Input
                      id="edit-label"
                      value={editForm.label}
                      onChange={(e) =>
                        setEditForm({ ...editForm, label: e.target.value })
                      }
                    />
                  </div>
                </>
              )}
              {/* Common field for Is Active status */}
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="edit-isActive"
                  checked={editForm.isActive}
                  onCheckedChange={(checked) =>
                    setEditForm({ ...editForm, isActive: !!checked })
                  }
                />
                <Label htmlFor="edit-isActive">QR Code is Active</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleUpdate}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✨ Full-Screen Processing Loader */}
      {processing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/90 backdrop-blur-md rounded-lg p-8 flex flex-col items-center gap-4 shadow-xl border border-white/20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-lg font-medium text-gray-700">
              {processingMessage || "Processing..."}
            </p>
            <p className="text-sm text-gray-500">Please wait...</p>
          </div>
        </div>
      )}
    </div>
  );
}
