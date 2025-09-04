// src/app/(withSidebar)/admin/qr-management/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

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
  } | null;
  preset: {
    groupId: string | null;
    groupName: string | null;
    amount: string | null; // string coming from API
    label: string | null;
  } | null;
};

export default function QRManagementPage() {
  const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [filterType, setFilterType] = useState<"ALL" | "IDENTITY" | "PRESET">(
    "ALL"
  );
  const [filterActive, setFilterActive] = useState<"ALL" | "YES" | "NO">("ALL");

  // selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const qrRes = await axios.get<{ data: QRCode[] }>(
          "/api/qr/get-all-qrcodes"
        );
        setQrCodes(qrRes.data.data);
      } catch {
        toast.error("Failed to fetch QR codes");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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
      return matchesType && matchesActive;
    });
  }, [qrCodes, filterType, filterActive]);

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
    checked ? next.add(id) : next.delete(id);
    setSelectedIds(next);
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
      { header: "Created At", key: "createdAt", width: 24 },
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
        createdAt: new Date(q.createdAt).toLocaleString(),
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

  // Fetch image as dataURL for jsPDF
  const fetchImageAsDataURL = async (url: string) => {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    // png assumed for QR
    const bytes = new Uint8Array(buf);
    const bin = bytes.reduce((acc, b) => acc + String.fromCharCode(b), "");
    return `data:image/png;base64,${btoa(bin)}`;
  };

  // Create a PDF of the given rows (grid of cards)
  const printQRCodesToPdf = async (rows: QRCode[]) => {
    if (!rows.length) {
      toast.message("Nothing to print", {
        description: "Adjust filters or select rows.",
      });
      return;
    }

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

    for (let index = 0; index < rows.length; index++) {
      const q = rows[index];
      const col = index % cols;
      const row = Math.floor((index % (cols * rowsPerPage)) / cols);

      if (index > 0 && index % (cols * rowsPerPage) === 0) {
        doc.addPage();
      }

      const pageIndex = Math.floor(index / (cols * rowsPerPage));
      const startX = margin + col * (cardW + gutter);
      const startY = margin + row * (cardH + gutter);

      // Card border (optional)
      doc.setDrawColor(200);
      doc.rect(startX, startY, cardW, cardH);

      // Caption
      const caption = getCaption(q) || "";
      doc.setFont("helvetica", "bold");
      doc.setFontSize(titleFontSize);
      doc.text(caption, startX + cardW / 2, startY + 28, { align: "center" });

      // (Optional) secondary meta line (for identity, show Class/Grade)
      let meta = "";
      if (q.type === "IDENTITY" && q.identity) {
        const cls = q.identity.className || "-";
        const grd = q.identity.gradeName || "-";
        meta = `Class ${cls} • Grade ${grd}`;
      } else if (q.type === "PRESET" && q.preset) {
        const amt = q.preset.amount ? `$${q.preset.amount}` : "";
        meta = [q.preset.label, amt].filter(Boolean).join(" • ");
      }
      if (meta) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(metaFontSize);
        doc.text(meta, startX + cardW / 2, startY + 44, { align: "center" });
      }

      // ===== move QR down so it never overlaps text =====
      const topAfterTextY = meta ? startY + 44 : startY + 28;
      const qrTopPadding = 22; // extra space under text
      const imgX = startX + (cardW - qrSize) / 2;
      const imgY = topAfterTextY + qrTopPadding;

      // draw QR (same as before)
      try {
        const dataUrl = await fetchImageAsDataURL(toQrImgUrl(q.storagePath));
        doc.addImage(dataUrl, "PNG", imgX, imgY, qrSize, qrSize);
      } catch {
        doc.setDrawColor(150);
        doc.rect(imgX, imgY, qrSize, qrSize);
        doc.setFontSize(10);
        doc.text("QR unavailable", imgX + qrSize / 2, imgY + qrSize / 2, {
          align: "center",
        });
      }
    }

    doc.save("qr-codes.pdf");
  };

  // Bulk print button
  const handlePrintSelected = async () => {
    await printQRCodesToPdf(rowsForExportOrPrint);
  };

  // Per-row print button
  const handlePrintSingle = async (q: QRCode) => {
    await printQRCodesToPdf([q]);
  };

  return (
    <div className="min-h-screen p-8">
      <Card className="mx-auto max-w-6xl">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle>QR Code Management</CardTitle>

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

            <Button
              onClick={handleExportExcel}
              className="bg-[#3b639a] text-white"
            >
              Export Excel
            </Button>
            <Button onClick={handlePrintSelected} variant="outline">
              Print (PDF)
            </Button>
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
                  <TableHead>Created At</TableHead>
                  <TableHead>Donor/Group</TableHead>
                  <TableHead>Amount/Label</TableHead>
                  <TableHead>Actions</TableHead>
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
                        <img
                          src={toQrImgUrl(q.storagePath)}
                          alt="QR"
                          width={60}
                          height={60}
                          style={{
                            border: "1px solid #e5e7eb",
                            borderRadius: 4,
                          }}
                          onError={(e) =>
                            ((e.currentTarget as HTMLImageElement).src =
                              "/placeholder-qr.png")
                          }
                        />
                      </TableCell>

                      <TableCell className="font-medium">
                        {caption || "-"}
                      </TableCell>

                      <TableCell>{q.isActive ? "Yes" : "No"}</TableCell>

                      <TableCell>
                        {new Date(q.createdAt).toLocaleString()}
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

                      <TableCell>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handlePrintSingle(q)}
                        >
                          Print
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
