// src/app/(withSidebar)/admin/qr-management/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import axios from "axios";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { SquarePen, Trash, Printer, Sheet } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  } | null;
  preset: {
    groupId: string | null;
    groupName: string | null;
    amount: string | null;
    label: string | null;
  } | null;
};

// Type for Groups (for the edit dropdown)
type Group = { id: string; name: string };

// Type for the edit form state
type EditFormState = {
  // IDENTITY fields
  studentName: string;
  studentClass: string;
  studentGrade: string;
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

  // filters
  const [filterType, setFilterType] = useState<"ALL" | "IDENTITY" | "PRESET">(
    "ALL"
  );
  const [filterActive, setFilterActive] = useState<"ALL" | "YES" | "NO">("ALL");

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
    }
  };

  const openEditDialog = (qr: QRCode) => {
    setEditingQr(qr);
    if (qr.type === "IDENTITY" && qr.identity) {
      setEditForm({
        studentName: qr.identity.name,
        studentClass: qr.identity.className ?? "",
        studentGrade: qr.identity.gradeName ?? "",
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
    try {
      await axios.delete(`/api/qr/update-or-delete-qr/${id}`);
      toast.success("QR Code deleted.");
      // Optimistic UI update
      setQrCodes((prev) => prev.filter((q) => q.id !== id));
    } catch {
      toast.error("Failed to delete QR Code.");
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
          {/* <CardTitle>QR Code Management</CardTitle> */}

          {/* ✨ Group 1: Filters (aligns to the left) */}
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
          </div>

          {/* ✨ Group 2: Action Buttons (gets pushed to the right) */}
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
            {/* Print Bulk */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handlePrintSelected}
                  style={{ backgroundColor: "var(--card-colour-3)" }}
                  className="text-white hover:text-white"
                  variant="outline"
                >
                  <Printer size={16} /> Bulk
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Print the selected QR codes as PDF</p>
              </TooltipContent>
            </Tooltip>

            {/* Delete Selected */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleBulkDelete}
                  style={{ backgroundColor: "var(--card-colour-4)" }}
                  className="text-white"
                  variant="destructive"
                >
                  <Trash size={16} /> Selected
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete the selected QR codes permanently</p>
              </TooltipContent>
            </Tooltip>
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

                        {/* Print Button */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handlePrintSingle(q)}
                              style={{
                                backgroundColor: "var(--card-colour-3)",
                              }}
                              className="text-white"
                            >
                              <Printer size={16} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Print QR code</p>
                          </TooltipContent>
                        </Tooltip>
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
    </div>
  );
}
