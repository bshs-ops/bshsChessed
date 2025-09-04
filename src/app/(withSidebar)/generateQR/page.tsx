// src/app/admin/generate-qr/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
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

type Group = { id: string; name: string };

export default function GenerateQRPage() {
  const [qrType, setQrType] = useState<"IDENTITY" | "PRESET">("IDENTITY");
  const [studentName, setStudentName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [studentGrade, setStudentGrade] = useState("");

  // PRESET QR fields
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [presetAmount, setPresetAmount] = useState("");
  const [presetLabel, setPresetLabel] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);

  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string>("");

  // Fetch groups for PRESET QR
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
    if (qrType === "PRESET") {
      fetchGroups();
    }
  }, [qrType]);

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
      const payload = {
        type: qrType,
        ...(qrType === "IDENTITY"
          ? { studentName, studentClass, studentGrade }
          : {
              groupId: selectedGroupId,
              amount: parseFloat(presetAmount),
              label: presetLabel,
            }),
      };

      const res = await axios.post("/api/qr/generate-qr", payload);
      const qr = res.data?.data;
      toast.success("QR generated");
      setResultUrl(qr?.qrCodeUrl || "");

      // Clear fields after successful generation
      if (qrType === "IDENTITY") {
        setStudentName("");
        setStudentClass("");
        setStudentGrade("");
      } else {
        setSelectedGroupId("");
        setPresetAmount("");
        setPresetLabel("");
      }
    } catch (err) {
      console.error(err);
      toast.error("Generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-6 relative">
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="text-white text-lg font-semibold">Generating QR…</div>
        </div>
      )}

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

          {/* IDENTITY QR Fields */}
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

          {/* PRESET QR Fields */}
          {qrType === "PRESET" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="groupSelect">Group</Label>
                <Select
                  value={selectedGroupId}
                  onValueChange={setSelectedGroupId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="presetAmount">Amount</Label>
                <Input
                  id="presetAmount"
                  type="number"
                  step="0.01"
                  value={presetAmount}
                  onChange={(e) => setPresetAmount(e.target.value)}
                  placeholder="e.g., 5.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="presetLabel">Label (Optional)</Label>
                <Input
                  id="presetLabel"
                  value={presetLabel}
                  onChange={(e) => setPresetLabel(e.target.value)}
                  placeholder="e.g., Shiras Sara - $5"
                />
              </div>
            </>
          )}

          <Button
            onClick={handleGenerate}
            className="w-full bg-[#3b639a] text-white rounded-full py-3 hover:bg-[#6388bb] transition-colors"
          >
            Generate QR
          </Button>

          {/* Preview */}
          {resultUrl ? (
            <div className="pt-4 space-y-2">
              <Label>Preview</Label>
              <div className="border rounded-md p-3 flex items-center justify-center">
                {/* Permanent proxy URL */}
                <Image
                  src={resultUrl}
                  alt="QR"
                  width={256}
                  height={256}
                  className="max-h-64"
                />
              </div>
              <a
                href={resultUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm underline text-blue-600"
              >
                Open image in new tab
              </a>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
