// src/app/admin/generate-qr/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import ExcelJS from "exceljs";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import Image from "next/image";
import { useRouter } from "next/navigation"; // add this at the top

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
  const [resultUrl] = useState<string>("");

  const router = useRouter();

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
    <div className="min-h-screen py-12 px-6 space-y-10 relative">
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="text-white text-lg font-semibold">Processing…</div>
        </div>
      )}

      {/* Manual Generate QR */}
      <Card className="mx-auto max-w-xl w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Generate Student QR</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* QR Type */}
          <div className="space-y-2">
            <Label htmlFor="qrType">QR Type</Label>
            <Select
              value={qrType}
              onValueChange={(value: "IDENTITY" | "PRESET") => setQrType(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select QR Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IDENTITY">IDENTITY (Student)</SelectItem>
                <SelectItem value="PRESET">PRESET (Fund + Amount)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* IDENTITY QR Inputs */}
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
            </>
          )}

          {/* PRESET QR Inputs */}
          {qrType === "PRESET" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="group">Group</Label>
                <Select
                  value={selectedGroupId}
                  onValueChange={(value) => setSelectedGroupId(value)}
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

          {/* Generate button */}
          <Button className="w-full" onClick={handleGenerate}>
            Generate QR
          </Button>

          {/* Show QR result */}
          {resultUrl && (
            <div className="flex justify-center">
              <Image
                src={resultUrl}
                alt="Generated QR"
                width={200}
                height={200}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Excel Upload */}
      <Card className="mx-auto max-w-xl w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Excel Upload</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full"
            onClick={() => triggerFileInput("IDENTITY")}
          >
            Upload Identity Excel
          </Button>
          <Button className="w-full" onClick={() => triggerFileInput("PRESET")}>
            Upload Preset Excel
          </Button>
        </CardContent>
      </Card>

      {/* Template Download */}
      <Card className="mx-auto max-w-xl w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Download Templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <a
            href="/assets/excelTemplates/IdentityQRTemplate.xlsx"
            download
            className="w-full block"
          >
            <Button className="w-full">Download Identity Template</Button>
          </a>
          <a
            href="/assets/excelTemplates/PresetQRTemplate.xlsx"
            download
            className="w-full block"
          >
            <Button className="w-full">Download Preset Template</Button>
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
