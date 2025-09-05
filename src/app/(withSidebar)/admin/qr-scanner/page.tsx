//src/app/(withSidebar)/admin/qr-scanner/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
// ✨ Import our new custom scanner component
import QrScanner from "@/components/qr-scanner";
import { usePageHeader } from "@/components/page-header-context";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Camera, RefreshCw, Send } from "lucide-react";

// Types matching your Prisma schema
type Group = { id: string; name: string };
type Donor = { id: string; name: string; className: string; gradeName: string };

export default function ScannerPage() {
  const { setTitle } = usePageHeader();

  // Component State (All your existing state remains the same)
  const [mode, setMode] = useState<"NORMAL" | "PRESET">("NORMAL");
  const [groups, setGroups] = useState<Group[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerKey, setScannerKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [scannedDonor, setScannedDonor] = useState<Donor | null>(null);
  const [scannedToken, setScannedToken] = useState<string | null>(null);
  const [donationAmount, setDonationAmount] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [presetAmount, setPresetAmount] = useState("");
  const [presetGroupId, setPresetGroupId] = useState("");
  const [lastPresetScan, setLastPresetScan] = useState<string | null>(null);

  useEffect(() => {
    setTitle("QR Code Scanner");
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
    fetchGroups();
  }, [setTitle]);

  const resetNormalMode = () => {
    setScannedDonor(null);
    setScannedToken(null);
    setDonationAmount("");
    setSelectedGroupId("");
    setIsScanning(false);
    setScannerKey((prev) => prev + 1); // Force new scanner instance
  };

  // ✨ The success handler is now simpler
  const handleScanSuccess = async (token: string) => {
    if (!token || loading) return;

    setLoading(true);
    setIsScanning(false); // Stop scanning after one successful scan
    setScannerKey((prev) => prev + 1); // Force new scanner instance

    try {
      if (mode === "NORMAL") {
        const res = await axios.post("/api/admin/scanner/record-donation", {
          action: "VALIDATE",
          token: token,
        });
        setScannedToken(token);
        setScannedDonor(res.data.data);
        toast.success(`Scanned: ${res.data.data.name}`);
      } else {
        // PRESET MODE
        const res = await axios.post("/api/scanner/record-donation", {
          action: "RECORD",
          token: token,
          amount: parseFloat(presetAmount),
          groupId: presetGroupId,
        });
        const { donorName, groupName, amount } = res.data.data;
        setLastPresetScan(
          `Success: $${amount} from ${donorName} to ${groupName}.`
        );
        toast.success(`Donation from ${donorName} recorded!`);
        // We don't auto-restart scanning here to avoid infinite loops on error
      }
    } catch (error) {
      const axiosError = error as AxiosError<{ error: string }>;
      const errorMessage =
        axiosError.response?.data?.error || "An unknown error occurred.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelScanning = () => {
    setIsScanning(false);
    setScannerKey((prev) => prev + 1); // Force new scanner instance
  };

  const handleSubmitDonation = async () => {
    if (!scannedToken || !donationAmount || !selectedGroupId) {
      toast.error("Please fill all donation fields.");
      return;
    }
    setLoading(true);
    try {
      await axios.post("/api/admin/scanner/record-donation", {
        action: "RECORD",
        token: scannedToken,
        amount: parseFloat(donationAmount),
        groupId: selectedGroupId,
      });
      toast.success("Donation submitted successfully!");
      resetNormalMode();
    } catch (error) {
      const axiosError = error as AxiosError<{ error: string }>;
      const errorMessage =
        axiosError.response?.data?.error || "Submission failed.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-xl mx-auto space-y-6">
      {isScanning ? (
        <Card>
          <CardHeader>
            <CardTitle>Scan QR Code</CardTitle>
            <CardDescription>
              Point your camera at a student's QR code.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* ✨ Use scannerKey to force new instances */}
            <QrScanner
              key={Date.now().toString()}
              onScanSuccess={handleScanSuccess}
            />
            <Button
              onClick={handleCancelScanning}
              className="w-full mt-4 flex items-center justify-center"
              variant="outline"
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as any)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="NORMAL">Normal Mode</TabsTrigger>
            <TabsTrigger value="PRESET">Preset Mode</TabsTrigger>
          </TabsList>
          <TabsContent value="NORMAL">
            <Card>
              <CardHeader>
                <CardTitle>Normal Scan</CardTitle>
                <CardDescription>
                  Scan a student's ID, then enter the donation amount and select
                  a fund.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!scannedDonor ? (
                  <Button
                    onClick={() => setIsScanning(true)}
                    size="lg"
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <Camera /> Start Scanning
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <Alert>
                      <AlertTitle className="font-bold">
                        {scannedDonor.name}
                      </AlertTitle>
                      <AlertDescription>
                        Class: {scannedDonor.className} • Grade:{" "}
                        {scannedDonor.gradeName}
                      </AlertDescription>
                    </Alert>
                    <div className="space-y-2">
                      <Label htmlFor="amount">Donation Amount</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="e.g., 5.00"
                        value={donationAmount}
                        onChange={(e) => setDonationAmount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="group">Group / Fund</Label>
                      <Select
                        value={selectedGroupId}
                        onValueChange={setSelectedGroupId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a group" />
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
                    <div className="grid grid-cols-2 gap-4 mt-6">
                      <Button
                        onClick={resetNormalMode}
                        variant="outline"
                        className="w-full flex items-center justify-center gap-2"
                      >
                        <RefreshCw size={16} /> Scan Another
                      </Button>
                      <Button
                        onClick={handleSubmitDonation}
                        className="w-full flex items-center justify-center gap-2"
                        disabled={loading}
                      >
                        <Send size={16} /> Submit Donation
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="PRESET">
            <Card>
              <CardHeader>
                <CardTitle>Preset Scan</CardTitle>
                <CardDescription>
                  Set the amount and fund first, then scan multiple student IDs.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="preset-amount">Preset Amount</Label>
                  <Input
                    id="preset-amount"
                    type="number"
                    placeholder="e.g., 2.00"
                    value={presetAmount}
                    onChange={(e) => setPresetAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preset-group">Preset Group / Fund</Label>
                  <Select
                    value={presetGroupId}
                    onValueChange={setPresetGroupId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a group" />
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
                <Button
                  onClick={() => setIsScanning(true)}
                  size="lg"
                  className="w-full flex items-center justify-center gap-2"
                  disabled={!presetAmount || !presetGroupId}
                >
                  <Camera /> Start Scanning
                </Button>
                {lastPresetScan && (
                  <Alert variant="default" className="mt-4">
                    <AlertTitle>Last Scan</AlertTitle>
                    <AlertDescription>{lastPresetScan}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
