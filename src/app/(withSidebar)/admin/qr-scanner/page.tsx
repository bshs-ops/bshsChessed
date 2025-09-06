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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Camera, RefreshCw, Send } from "lucide-react";

// Types matching your Prisma schema
type Group = { id: string; name: string };
type Donor = { id: string; name: string; className: string; gradeName: string };

export default function ScannerPage() {
  const { setTitle } = usePageHeader();

  // Component State (All your existing state remains the same)
  const [mode, setMode] = useState<"NORMAL" | "PRESET" | "PHYSICAL">("NORMAL");
  const [physicalMode, setPhysicalMode] = useState<"PRESET" | "SEQUENCE">(
    "PRESET"
  );
  const [groups, setGroups] = useState<Group[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerKey, setScannerKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [processingQr, setProcessingQr] = useState(false); // Add a separate loading state for QR processing
  const [loadingMessage, setLoadingMessage] = useState(""); // Message to show during loading
  const [scannedDonor, setScannedDonor] = useState<Donor | null>(null);
  const [scannedToken, setScannedToken] = useState<string | null>(null);
  const [donationAmount, setDonationAmount] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [presetAmount, setPresetAmount] = useState("");
  const [presetGroupId, setPresetGroupId] = useState("");
  const [lastPresetScan, setLastPresetScan] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingDonation, setPendingDonation] = useState<{
    token: string;
    donorName: string;
    groupName: string;
    amount: string;
  } | null>(null);

  // Physical scanner states
  const [physicalPresetAmount, setPhysicalPresetAmount] = useState("");
  const [physicalPresetGroupId, setPhysicalPresetGroupId] = useState("");
  const [physicalScannedIdentity, setPhysicalScannedIdentity] = useState<{
    token: string;
    donor: Donor | null;
  } | null>(null);
  const [physicalScannedPreset, setPhysicalScannedPreset] = useState<{
    amount: string;
    groupId: string;
    groupName: string;
  } | null>(null);
  const [physicalScanStep, setPhysicalScanStep] = useState<
    "IDENTITY" | "PRESET"
  >("IDENTITY");
  const [lastPhysicalScan, setLastPhysicalScan] = useState<string | null>(null);

  // Input-based scanner states
  const [physicalScanInput, setPhysicalScanInput] = useState("");
  const [sequenceScanInput, setSequenceScanInput] = useState("");
  const physicalInputRef = React.useRef<HTMLInputElement>(null);
  const sequenceInputRef = React.useRef<HTMLInputElement>(null);

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

  // Auto-focus the appropriate input field when changing to physical scanner mode
  useEffect(() => {
    if (mode === "PHYSICAL") {
      if (physicalMode === "PRESET" && physicalInputRef.current) {
        setTimeout(() => physicalInputRef.current?.focus(), 100);
      } else if (physicalMode === "SEQUENCE" && sequenceInputRef.current) {
        setTimeout(() => sequenceInputRef.current?.focus(), 100);
      }
    }
  }, [mode, physicalMode]);

  const resetNormalMode = () => {
    setScannedDonor(null);
    setScannedToken(null);
    setDonationAmount("");
    setSelectedGroupId("");
    setIsScanning(false);
    setScannerKey((prev) => prev + 1); // Force new scanner instance
  };

  // Main scan handler that routes to the appropriate mode handler - only for camera scanning
  const handleScanSuccess = async (token: string) => {
    if (!token) return;

    // Physical scanner modes now use input fields instead of camera scanning

    // For normal and preset modes, use the original loading behavior
    if (loading || processingQr) return;

    // Show loading state immediately after scan
    setProcessingQr(true);
    setLoadingMessage("Processing QR code...");
    setIsScanning(false); // Stop scanning after one successful scan
    setScannerKey((prev) => prev + 1); // Force new scanner instance

    try {
      if (mode === "NORMAL") {
        setLoadingMessage("Validating student ID...");
        const res = await axios.post("/api/admin/scanner/record-donation", {
          action: "VALIDATE",
          token: token,
        });
        setScannedToken(token);
        setScannedDonor(res.data.data);
        toast.success(`Scanned: ${res.data.data.name}`);
        // Normal mode doesn't need a confirmation, so we can end loading
        setProcessingQr(false);
      } else {
        // PRESET MODE - First validate the token to get donor info
        setLoadingMessage("Validating student ID...");
        const res = await axios.post("/api/admin/scanner/record-donation", {
          action: "VALIDATE",
          token: token,
        });

        const donorName = res.data.data.name;
        // Find the group name based on the ID
        const selectedGroup = groups.find((g) => g.id === presetGroupId);
        const groupName = selectedGroup?.name || "Unknown Group";

        // Set up confirmation data
        setPendingDonation({
          token,
          donorName,
          groupName,
          amount: presetAmount,
        });

        setLoadingMessage("Preparing confirmation...");

        // Add a small delay to show the loading state before showing the dialog
        // This makes the UX feel more responsive
        setTimeout(() => {
          // Show confirmation dialog
          setShowConfirmation(true);
          // End loading after dialog appears
          setProcessingQr(false);
        }, 500);
      }
    } catch (error) {
      const axiosError = error as AxiosError<{ error: string }>;
      const errorMessage =
        axiosError.response?.data?.error || "An unknown error occurred.";
      toast.error(errorMessage);
      // End loading on error
      setProcessingQr(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelScanning = () => {
    setIsScanning(false);
    setScannerKey((prev) => prev + 1); // Force new scanner instance
    // Reset physical scanner states if needed
    if (mode === "PHYSICAL" && physicalMode === "SEQUENCE") {
      setPhysicalScanStep("IDENTITY");
      setPhysicalScannedIdentity(null);
      setPhysicalScannedPreset(null);
    }
  };

  // Handler for physical preset mode input field
  const handlePhysicalInputKeyDown = async (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter" && physicalScanInput) {
      const token = physicalScanInput;
      setPhysicalScanInput(""); // Clear input field for next scan

      // Process the scanned token
      await handlePhysicalPresetScan(token);

      // Re-focus the input field for next scan
      setTimeout(() => physicalInputRef.current?.focus(), 100);
    }
  };

  // Handler for sequence mode input field
  const handleSequenceInputKeyDown = async (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter" && sequenceScanInput) {
      const token = sequenceScanInput;
      setSequenceScanInput(""); // Clear input field for next scan

      // Process the scanned token based on current step
      await handlePhysicalSequenceScan(token);

      // Re-focus the input field for next scan
      setTimeout(() => sequenceInputRef.current?.focus(), 100);
    }
  };

  // Physical Scanner - Preset Mode Handler for continuous scanning with input field
  const handlePhysicalPresetScan = async (token: string) => {
    if (!token || loading || !physicalPresetAmount || !physicalPresetGroupId)
      return;

    // Show subtle processing indication
    setLastPhysicalScan("Processing...");
    setLoadingMessage("Processing QR code...");

    try {
      // Validate the student ID in the background
      const res = await axios.post("/api/admin/scanner/record-donation", {
        action: "VALIDATE",
        token: token,
      });

      const donor = res.data.data;
      const selectedGroup = groups.find((g) => g.id === physicalPresetGroupId);

      // Record the donation directly
      await axios.post("/api/admin/scanner/record-donation", {
        action: "RECORD",
        token: token,
        amount: parseFloat(physicalPresetAmount),
        groupId: physicalPresetGroupId,
      });

      // Update last scan and show success notification
      const successMessage = `Success: $${physicalPresetAmount} from ${
        donor.name
      } to ${selectedGroup?.name || "Unknown"}.`;

      setLastPhysicalScan(successMessage);
      toast.success(`Donation from ${donor.name} recorded!`, {
        duration: 2000, // Shorter toast for continuous scanning
      });

      // Play a success sound if available
      try {
        new Audio("/assets/sounds/success.mp3").play().catch(() => {});
      } catch (e) {
        // Ignore audio errors
      }
    } catch (error) {
      const axiosError = error as AxiosError<{ error: string }>;
      const errorMessage =
        axiosError.response?.data?.error || "An unknown error occurred.";
      toast.error(errorMessage, {
        duration: 3000,
      });

      // Play an error sound if available
      try {
        new Audio("/assets/sounds/error.mp3").play().catch(() => {});
      } catch (e) {
        // Ignore audio errors
      }
    }
  };

  // Physical Scanner - Sequence Mode Handlers for continuous scanning with input field
  const handlePhysicalSequenceScan = async (token: string) => {
    if (!token || loading) return;

    // Show minimal UI disruption for better UX
    const currentStep = physicalScanStep;

    try {
      if (physicalScanStep === "IDENTITY") {
        // First scan: Get donor identity
        try {
          const res = await axios.post("/api/admin/scanner/record-donation", {
            action: "VALIDATE",
            token: token,
          });

          setPhysicalScannedIdentity({
            token,
            donor: res.data.data,
          });

          // Move to next step
          setPhysicalScanStep("PRESET");
          toast.success(
            `Scanned: ${res.data.data.name}. Now scan the preset QR code.`
          );

          // Play a success sound if available
          try {
            new Audio("/assets/sounds/scan1.mp3").play().catch(() => {});
          } catch (e) {
            // Ignore audio errors
          }
        } catch (error) {
          const axiosError = error as AxiosError<{ error: string }>;
          const errorMessage =
            axiosError.response?.data?.error || "Invalid student ID QR code";
          toast.error(errorMessage);

          // Reset on error
          setPhysicalScanStep("IDENTITY");
          setPhysicalScannedIdentity(null);
        }
      } else {
        // Second scan: Process preset QR code using our new API
        try {
          // Call the new preset QR validation API
          const presetRes = await axios.post(
            "/api/admin/scanner/validate-preset-qr",
            {
              token: token,
            }
          );

          const presetData = presetRes.data.data;
          const { presetAmount, presetGroupId, presetGroupName } = presetData;

          // We have both identity and preset info, now record the donation
          if (!physicalScannedIdentity || !physicalScannedIdentity.token) {
            throw new Error("Missing identity information");
          }

          // Record the donation
          await axios.post("/api/admin/scanner/record-donation", {
            action: "RECORD",
            token: physicalScannedIdentity.token,
            amount: parseFloat(presetAmount),
            groupId: presetGroupId,
          });

          // Update success message
          const successMessage = `Success: $${presetAmount} from ${
            physicalScannedIdentity.donor?.name || "Unknown"
          } to ${presetGroupName}.`;

          setLastPhysicalScan(successMessage);
          toast.success(`Donation recorded successfully!`);

          // Play a success sound if available
          try {
            new Audio("/assets/sounds/success.mp3").play().catch(() => {});
          } catch (e) {
            // Ignore audio errors
          }

          // Reset for next scan
          setPhysicalScanStep("IDENTITY");
          setPhysicalScannedIdentity(null);
          setPhysicalScannedPreset(null);
        } catch (error) {
          const axiosError = error as AxiosError<{ error: string }>;
          const errorMessage =
            axiosError.response?.data?.error || "Invalid preset QR code";
          toast.error(errorMessage);

          // Reset scan step to start over
          setPhysicalScanStep("IDENTITY");
          setPhysicalScannedIdentity(null);

          // Play an error sound if available
          try {
            new Audio("/assets/sounds/error.mp3").play().catch(() => {});
          } catch (e) {
            // Ignore audio errors
          }
        }
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      // Reset scan step on error
      setPhysicalScanStep("IDENTITY");
      setPhysicalScannedIdentity(null);
    } finally {
      // No processing overlay to clean up in the new input-based approach
    }
  };

  const handleConfirmPresetDonation = async () => {
    if (!pendingDonation) return;

    setLoading(true);
    // Close the dialog but show processing overlay
    setShowConfirmation(false);
    setProcessingQr(true);
    setLoadingMessage("Recording donation...");

    try {
      // Record the donation
      const res = await axios.post("/api/admin/scanner/record-donation", {
        action: "RECORD",
        token: pendingDonation.token,
        amount: parseFloat(pendingDonation.amount),
        groupId: presetGroupId,
      });

      // Update success message
      setLastPresetScan(
        `Success: $${pendingDonation.amount} from ${pendingDonation.donorName} to ${pendingDonation.groupName}.`
      );
      toast.success(`Donation from ${pendingDonation.donorName} recorded!`);
    } catch (error) {
      const axiosError = error as AxiosError<{ error: string }>;
      const errorMessage =
        axiosError.response?.data?.error || "An unknown error occurred.";
      toast.error(errorMessage);
    } finally {
      // Close confirmation and clean up
      setPendingDonation(null);
      setLoading(false);
      setProcessingQr(false);
    }
  };

  const handleCancelPresetDonation = () => {
    setShowConfirmation(false);
    setPendingDonation(null);
    setProcessingQr(false); // Ensure processing overlay is hidden
    toast.info("Donation canceled");
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
      {/* QR Processing Overlay */}
      {processingQr && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center z-50">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mb-4"></div>
          <div className="text-white text-lg font-medium">{loadingMessage}</div>
        </div>
      )}

      {/* Confirmation Dialog for Preset Mode */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Donation</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDonation && (
                <div className="space-y-2 py-2">
                  <p>
                    <strong>Student:</strong> {pendingDonation.donorName}
                  </p>
                  <p>
                    <strong>Amount:</strong> ${pendingDonation.amount}
                  </p>
                  <p>
                    <strong>Fund:</strong> {pendingDonation.groupName}
                  </p>
                </div>
              )}
              Are you sure you want to record this donation?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelPresetDonation}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmPresetDonation}
              disabled={loading}
            >
              {loading ? "Processing..." : "Yes, Record Donation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isScanning && mode !== "PHYSICAL" ? (
        <Card>
          <CardHeader>
            <CardTitle>Scan QR Code</CardTitle>
            <CardDescription>
              Point your camera at a student&apos;s QR code.
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
          onValueChange={(v) => setMode(v as "NORMAL" | "PRESET" | "PHYSICAL")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="NORMAL">Normal Mode</TabsTrigger>
            <TabsTrigger value="PRESET">Preset Mode</TabsTrigger>
            <TabsTrigger value="PHYSICAL">Physical Scanner</TabsTrigger>
          </TabsList>
          <TabsContent value="NORMAL">
            <Card>
              <CardHeader>
                <CardTitle>Normal Scan</CardTitle>
                <CardDescription>
                  Scan a student&apos;s ID, then enter the donation amount and
                  select a fund.
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
          <TabsContent value="PHYSICAL">
            <Card>
              <CardHeader>
                <CardTitle>Physical Scanner Mode</CardTitle>
                <CardDescription>
                  Use a physical barcode scanner to process donations.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs
                  value={physicalMode}
                  onValueChange={(v) =>
                    setPhysicalMode(v as "PRESET" | "SEQUENCE")
                  }
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="PRESET">Preset Amount</TabsTrigger>
                    <TabsTrigger value="SEQUENCE">Scan Both</TabsTrigger>
                  </TabsList>

                  <TabsContent value="PRESET">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="physical-preset-amount">
                          Preset Amount
                        </Label>
                        <Input
                          id="physical-preset-amount"
                          type="number"
                          placeholder="e.g., 2.00"
                          value={physicalPresetAmount}
                          onChange={(e) =>
                            setPhysicalPresetAmount(e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="physical-preset-group">Fund</Label>
                        <Select
                          value={physicalPresetGroupId}
                          onValueChange={setPhysicalPresetGroupId}
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
                      <div className="space-y-2">
                        <Label htmlFor="physical-scan-input">
                          Scan Student ID (Input Field)
                        </Label>
                        <Input
                          id="physical-scan-input"
                          ref={physicalInputRef}
                          placeholder="QR code will be scanned here"
                          value={physicalScanInput}
                          onChange={(e) => setPhysicalScanInput(e.target.value)}
                          onKeyDown={handlePhysicalInputKeyDown}
                          className="bg-muted/30 border-dashed"
                          autoComplete="off"
                        />
                        <p className="text-sm text-muted-foreground">
                          Place cursor here and scan student IDs with your
                          physical scanner. Each scan will automatically record
                          a donation.
                        </p>
                      </div>

                      {lastPhysicalScan && (
                        <Alert variant="default" className="mt-4">
                          <AlertTitle>Last Scan</AlertTitle>
                          <AlertDescription>
                            {lastPhysicalScan}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="SEQUENCE">
                    <div className="space-y-4">
                      <Alert
                        variant={
                          physicalScanStep === "IDENTITY"
                            ? "default"
                            : undefined
                        }
                        className={
                          physicalScanStep !== "IDENTITY" ? "bg-muted" : ""
                        }
                      >
                        <AlertTitle>Step 1: Scan Student ID</AlertTitle>
                        <AlertDescription>
                          {physicalScannedIdentity
                            ? `Scanned: ${physicalScannedIdentity.donor?.name}`
                            : "Scan the student&apos;s identity QR code first."}
                        </AlertDescription>
                      </Alert>

                      <Alert
                        variant={
                          physicalScanStep === "PRESET" ? "default" : undefined
                        }
                        className={
                          physicalScanStep !== "PRESET" ? "bg-muted" : ""
                        }
                      >
                        <AlertTitle>Step 2: Scan Preset QR</AlertTitle>
                        <AlertDescription>
                          {physicalScanStep === "IDENTITY"
                            ? "Complete step 1 first."
                            : "Now scan the preset QR code with amount and fund information."}
                        </AlertDescription>
                      </Alert>

                      <div className="space-y-2">
                        <Label htmlFor="sequence-scan-input">
                          Scan QR Code (Input Field)
                        </Label>
                        <Input
                          id="sequence-scan-input"
                          ref={sequenceInputRef}
                          placeholder={
                            physicalScanStep === "IDENTITY"
                              ? "Scan student ID here..."
                              : "Scan preset QR code here..."
                          }
                          value={sequenceScanInput}
                          onChange={(e) => setSequenceScanInput(e.target.value)}
                          onKeyDown={handleSequenceInputKeyDown}
                          className={`bg-muted/30 border-dashed ${
                            physicalScanStep === "PRESET"
                              ? "border-primary"
                              : ""
                          }`}
                          autoComplete="off"
                        />
                        <p className="text-sm text-muted-foreground">
                          Place cursor here and scan QR codes in sequence with
                          your physical scanner.
                        </p>
                      </div>

                      <Button
                        onClick={() => {
                          setPhysicalScanStep("IDENTITY");
                          setPhysicalScannedIdentity(null);
                          setPhysicalScannedPreset(null);
                          setTimeout(
                            () => sequenceInputRef.current?.focus(),
                            100
                          );
                        }}
                        variant="outline"
                        className="w-full flex items-center justify-center gap-2"
                      >
                        <RefreshCw size={16} /> Reset Scan Process
                      </Button>

                      {lastPhysicalScan && (
                        <Alert variant="default" className="mt-4">
                          <AlertTitle>Last Scan</AlertTitle>
                          <AlertDescription>
                            {lastPhysicalScan}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
