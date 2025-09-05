// src/app/admin/generate-qr/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import ExcelJS from "exceljs";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription, // ✨ Import CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { FileUp, FileDown } from "lucide-react"; // ✨ Import icons
import { usePageHeader } from "@/components/page-header-context";

type Group = { id: string; name: string };

export default function GenerateQRPage() {
  const [qrType, setQrType] = useState<"IDENTITY" | "PRESET">("IDENTITY");
  const [studentName, setStudentName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [studentGrade, setStudentGrade] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [presetAmount, setPresetAmount] = useState("");
  const [presetLabel, setPresetLabel] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const { setTitle } = usePageHeader();

  useEffect(() => {
    setTitle("Generate QR Codes");
  }, [setTitle]);

  // Fetch PRESET groups
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await axios.get<{ data: Group[] }>(
          "/api/admin/groups/get-all-groups"
        );
        setGroups(res.data.data);
      } catch {
        toast.error("Failed to fetch groups");
      }
    };
    if (qrType === "PRESET") fetchGroups();
  }, [qrType]);

  // Manual QR generation
  const handleGenerate = async () => {
    if (
      qrType === "IDENTITY" &&
      (!studentName || !studentClass || !studentGrade)
    ) {
      toast.error("Please fill all fields for IDENTITY QR");
      return;
    }
    if (qrType === "PRESET" && (!selectedGroupId || !presetAmount)) {
      toast.error("Please fill group and amount for PRESET QR");
      return;
    }

    try {
      setLoading(true);
      const payload =
        qrType === "IDENTITY"
          ? { type: "IDENTITY", studentName, studentClass, studentGrade }
          : {
              type: "PRESET",
              groupId: selectedGroupId,
              amount: parseFloat(presetAmount),
              label: presetLabel,
            };

      await axios.post("/api/qr/generate-qr", payload);

      toast.success("QR generated");
      router.push("/admin/qr-management"); // ✅ redirect after success
    } catch (err) {
      console.error(err);
      toast.error("Generation failed");
    } finally {
      setLoading(false);
    }
  };

  // Excel Upload Logic
  const handleExcelUpload = async (file: File, type: "IDENTITY" | "PRESET") => {
    setLoading(true); // Set loading at the beginning
    try {
      const workbook = new ExcelJS.Workbook();
      const buffer = await file.arrayBuffer();
      await workbook.xlsx.load(buffer);

      const sheet = workbook.worksheets[0];
      if (sheet.rowCount < 2) {
        toast.error("Excel file is empty or has no data rows.");
        setLoading(false);
        return;
      }

      // --- 💡 FIX STARTS HERE ---

      // 1. Create a map of header names to their column numbers
      const headerMap: { [key: string]: number } = {};
      const headerRow = sheet.getRow(1);
      headerRow.eachCell((cell, colNumber) => {
        const headerText = cell.value?.toString().trim();
        if (headerText) {
          headerMap[headerText] = colNumber;
        }
      });

      // 2. Validate headers using the map's keys
      if (
        type === "IDENTITY" &&
        (!headerMap["Name"] || !headerMap["Class"] || !headerMap["Grade"])
      ) {
        toast.error(
          "Invalid Identity Excel. Headers must include 'Name', 'Class', and 'Grade'."
        );
        setLoading(false);
        return;
      }

      if (
        type === "PRESET" &&
        (!headerMap["Group"] || !headerMap["Amount"] || !headerMap["Label"])
      ) {
        toast.error(
          "Invalid Preset Excel. Headers must include 'Group', 'Amount', and 'Label'."
        );
        setLoading(false);
        return;
      }

      // --- 💡 FIX ENDS HERE ---

      let successCount = 0;

      // Loop through data rows (starting from row 2)
      for (let i = 2; i <= sheet.rowCount; i++) {
        const row = sheet.getRow(i);

        if (type === "IDENTITY") {
          // 3. Use the headerMap to get cell data by column number
          const payload = {
            type: "IDENTITY",
            studentName: row.getCell(headerMap["Name"]).value?.toString() || "",
            studentClass:
              row.getCell(headerMap["Class"]).value?.toString() || "",
            studentGrade:
              row.getCell(headerMap["Grade"]).value?.toString() || "",
          };
          if (
            payload.studentName &&
            payload.studentClass &&
            payload.studentGrade
          ) {
            await axios.post("/api/qr/generate-qr", payload);
            successCount++;
          }
        } else {
          // PRESET
          const groupName = row.getCell(headerMap["Group"]).value?.toString();
          const targetGroup = groups.find((g) => g.name === groupName);

          const payload = {
            type: "PRESET",
            groupId: targetGroup?.id || "",
            amount: parseFloat(
              row.getCell(headerMap["Amount"]).value?.toString() || "0"
            ),
            label: row.getCell(headerMap["Label"]).value?.toString() || "",
          };
          if (payload.groupId && payload.amount > 0) {
            await axios.post("/api/qr/generate-qr", payload);
            successCount++;
          }
        }
      }

      toast.success(`${successCount} ${type} QR codes generated`);
      if (successCount > 0) {
        router.push("/admin/qr-management"); // Redirect on success
      }
    } catch (err) {
      console.error(err);
      toast.error(
        "Excel processing failed. Check the file format and console for details."
      );
    } finally {
      setLoading(false);
    }
  };

  const triggerFileInput = (type: "IDENTITY" | "PRESET") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx";
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) handleExcelUpload(file, type);
    };
    input.click();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="text-white text-lg font-semibold">Processing…</div>
        </div>
      )}

      {/* ✨ Page Header */}
      <div className="space-y-1">
        {/* <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Generate QR Codes
        </h1> */}
        <p className="text-muted-foreground">
          Create individual QR codes manually or upload an Excel file for bulk
          generation.
        </p>
      </div>

      {/* ✨ Two-column layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-12">
        {/* Left Column: Main Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Create a Single QR Code</CardTitle>
              <CardDescription>
                Fill in the details below to generate one QR code at a time.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>QR Type</Label>
                <Select
                  value={qrType}
                  onValueChange={(v: "IDENTITY" | "PRESET") => setQrType(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select QR Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IDENTITY">IDENTITY (Student)</SelectItem>
                    <SelectItem value="PRESET">
                      PRESET (Fund + Amount)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {qrType === "IDENTITY" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="studentName">Student Name</Label>
                    <Input
                      id="studentName"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="e.g., John Doe"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="studentClass">Class</Label>
                      <Input
                        id="studentClass"
                        value={studentClass}
                        onChange={(e) => setStudentClass(e.target.value)}
                        placeholder="e.g., B"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="studentGrade">Grade</Label>
                      <Input
                        id="studentGrade"
                        value={studentGrade}
                        onChange={(e) => setStudentGrade(e.target.value)}
                        placeholder="e.g., 6"
                      />
                    </div>
                  </div>
                </>
              )}

              {qrType === "PRESET" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="group">Group</Label>
                    <Select
                      value={selectedGroupId}
                      onValueChange={setSelectedGroupId}
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
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={presetAmount}
                      onChange={(e) => setPresetAmount(e.target.value)}
                      placeholder="e.g., 50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="label">Label (optional)</Label>
                    <Input
                      id="label"
                      value={presetLabel}
                      onChange={(e) => setPresetLabel(e.target.value)}
                      placeholder="e.g., Lunch Fund"
                    />
                  </div>
                </>
              )}

              <Button size="lg" className="w-full" onClick={handleGenerate}>
                Generate QR
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Bulk Actions */}
        <div className="space-y-8 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Excel Upload</CardTitle>
              <CardDescription>
                Generate multiple QR codes at once by uploading a formatted
                Excel file.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => triggerFileInput("IDENTITY")}
              >
                <FileUp className="mr-2 h-4 w-4" /> Upload Identity Excel
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => triggerFileInput("PRESET")}
              >
                <FileUp className="mr-2 h-4 w-4" /> Upload Preset Excel
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Download Templates</CardTitle>
              <CardDescription>
                Get the required Excel templates to ensure your data is
                formatted correctly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <a
                href="/assets/excelTemplates/IdentityQRTemplate.xlsx"
                download
                className="w-full block"
              >
                <Button variant="outline" className="w-full">
                  <FileDown className="mr-2 h-4 w-4" /> Download Identity
                  Template
                </Button>
              </a>
              <a
                href="/assets/excelTemplates/PresetQRTemplate.xlsx"
                download
                className="w-full block"
              >
                <Button variant="outline" className="w-full">
                  <FileDown className="mr-2 h-4 w-4" /> Download Preset Template
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
