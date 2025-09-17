"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { UserPlus, Trash } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { usePageHeader } from "@/components/page-header-context";

// Types
type Donor = {
  id: string;
  name: string;
  className: string;
  gradeName: string;
  isVolunteer: boolean; // Computed field: true if in at least one volunteer group
  participations: {
    id: string;
    groupId: string;
    groupName: string;
    date: string;
  }[];
};

type Group = {
  id: string;
  name: string;
  type: "FUND" | "VOLUNTEER";
};

export default function VolunteerPage() {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);

  // Filter for volunteers/non-volunteers
  const [viewMode, setViewMode] = useState<"nonVolunteers" | "volunteers">(
    "nonVolunteers"
  );

  // Selected students
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Volunteer dialog
  const [volunteerDialogOpen, setVolunteerDialogOpen] = useState(false);
  const [selectedVolunteerGroupId, setSelectedVolunteerGroupId] =
    useState<string>("");
  const [isAddingVolunteers, setIsAddingVolunteers] = useState(false);

  // Filter only volunteer groups for the dialog
  const volunteerGroups = useMemo(
    () => groups.filter((group) => group.type === "VOLUNTEER"),
    [groups]
  );

  const { setTitle } = usePageHeader();

  useEffect(() => {
    setTitle("Volunteer Management");
  }, [setTitle]);

  // Separate donors into volunteers and non-volunteers
  const nonVolunteers = useMemo(
    () => donors.filter((donor) => !donor.isVolunteer),
    [donors]
  );

  const volunteers = useMemo(
    () => donors.filter((donor) => donor.isVolunteer),
    [donors]
  );

  // Current displayed list based on view mode
  const displayedDonors =
    viewMode === "nonVolunteers" ? nonVolunteers : volunteers;

  // Selection helpers
  const allDisplayedSelected =
    displayedDonors.length > 0 &&
    displayedDonors.every((donor) => selectedIds.has(donor.id));

  const someDisplayedSelected = displayedDonors.some((donor) =>
    selectedIds.has(donor.id)
  );

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch both donor data and groups
      const [donorsRes, groupsRes] = await Promise.all([
        axios.get<{ data: Donor[] }>("/api/admin/volunteer/get-donors"),
        axios.get<{ data: Group[] }>("/api/admin/groups/get-all-groups"),
      ]);

      setDonors(donorsRes.data.data);
      setGroups(groupsRes.data.data);
    } catch (error) {
      console.error("Failed to fetch volunteer data:", error);
      toast.error("Failed to load volunteer data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleSelectAll = (checked: boolean | "indeterminate") => {
    const next = new Set(selectedIds);
    if (checked) {
      displayedDonors.forEach((donor) => next.add(donor.id));
    } else {
      displayedDonors.forEach((donor) => next.delete(donor.id));
    }
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

  const handleAddVolunteer = async () => {
    // Validate inputs
    if (!selectedVolunteerGroupId) {
      toast.error("Please select a volunteer group");
      return;
    }

    const selectedDonorIds = Array.from(selectedIds);

    if (selectedDonorIds.length === 0) {
      toast.error("Please select at least one student");
      return;
    }

    setIsAddingVolunteers(true);

    try {
      // Create participation records for each selected student
      const results = await Promise.allSettled(
        selectedDonorIds.map((donorId) => {
          return axios.post("/api/admin/volunteer/add-participation", {
            donorId,
            groupId: selectedVolunteerGroupId,
          });
        })
      );

      // Check results for any failures
      const successful = results.filter(
        (result) => result.status === "fulfilled"
      ).length;
      const failed = results.filter((result) => result.status === "rejected");

      if (successful > 0) {
        toast.success(`Added ${successful} volunteer(s) successfully`);
      }

      // Show specific error messages for duplicates or other failures
      if (failed.length > 0) {
        failed.forEach((result) => {
          if (result.status === "rejected") {
            const error = result.reason;
            if (error?.response?.status === 409) {
              // This is a duplicate entry error
              toast.warning(
                "Some students were already volunteers in this group"
              );
            } else {
              toast.error("Some volunteers could not be added");
            }
          }
        });
      }

      setVolunteerDialogOpen(false);
      setSelectedVolunteerGroupId("");
      setSelectedIds(new Set());

      // Refresh data
      fetchData();
    } catch (error) {
      console.error("Failed to add volunteers:", error);
      toast.error("Failed to add volunteers");
    } finally {
      setIsAddingVolunteers(false);
    }
  };

  const handleRemoveVolunteer = async (
    donorId: string,
    participationId: string
  ) => {
    if (!confirm("Are you sure you want to remove this volunteer record?")) {
      return;
    }

    try {
      await axios.delete(
        `/api/admin/volunteer/delete-participation/${participationId}`
      );
      toast.success("Volunteer record removed successfully");

      // Update local state optimistically
      setDonors((prev) =>
        prev.map((donor) => {
          if (donor.id === donorId) {
            return {
              ...donor,
              participations: donor.participations.filter(
                (p) => p.id !== participationId
              ),
            };
          }
          return donor;
        })
      );

      // Refresh data to get the updated isVolunteer status
      fetchData();
    } catch (error) {
      console.error("Failed to remove volunteer:", error);
      toast.error("Failed to remove volunteer record");
    }
  };

  return (
    <div className="min-h-screen p-8 space-y-8">
      {/* Non-Volunteers Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {viewMode === "nonVolunteers"
              ? "Students Not Yet Volunteers"
              : "Student Volunteers"}
          </CardTitle>
          <div className="flex gap-3">
            <Button
              onClick={() => setVolunteerDialogOpen(true)}
              disabled={
                selectedIds.size === 0 ||
                viewMode !== "nonVolunteers" ||
                isAddingVolunteers
              }
              style={{ backgroundColor: "var(--card-colour-2)" }}
              className="text-white"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              {isAddingVolunteers ? "Adding..." : "Add as Volunteer"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-10 text-gray-500">Loading...</div>
          ) : (
            <>
              <div className="border-b">
                <div className="flex space-x-4 px-1">
                  <Button
                    variant="ghost"
                    className={`relative h-9 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 text-sm font-semibold text-muted-foreground shadow-none transition-none hover:bg-transparent ${
                      viewMode === "nonVolunteers"
                        ? "border-primary text-foreground"
                        : ""
                    }`}
                    onClick={() => {
                      setViewMode("nonVolunteers");
                      setSelectedIds(new Set());
                    }}
                  >
                    Non-Volunteers
                  </Button>
                  <Button
                    variant="ghost"
                    className={`relative h-9 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 text-sm font-semibold text-muted-foreground shadow-none transition-none hover:bg-transparent ${
                      viewMode === "volunteers"
                        ? "border-primary text-foreground"
                        : ""
                    }`}
                    onClick={() => {
                      setViewMode("volunteers");
                      setSelectedIds(new Set());
                    }}
                  >
                    Volunteers
                  </Button>
                </div>
              </div>

              <div className="pt-4">
                {viewMode === "nonVolunteers" && (
                  <>
                    {nonVolunteers.length === 0 ? (
                      <div className="text-center py-10 text-gray-500">
                        All students are already volunteers in at least one
                        group.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10">
                              <Checkbox
                                checked={
                                  allDisplayedSelected
                                    ? true
                                    : someDisplayedSelected
                                    ? "indeterminate"
                                    : false
                                }
                                onCheckedChange={toggleSelectAll}
                                aria-label="Select all"
                              />
                            </TableHead>
                            <TableHead>Student Name</TableHead>
                            <TableHead>Class</TableHead>
                            <TableHead>Grade</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {nonVolunteers.map((donor) => (
                            <TableRow key={donor.id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedIds.has(donor.id)}
                                  onCheckedChange={(checked) =>
                                    toggleRow(donor.id, checked)
                                  }
                                  aria-label={`Select ${donor.name}`}
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                {donor.name}
                              </TableCell>
                              <TableCell>{donor.className}</TableCell>
                              <TableCell>{donor.gradeName}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </>
                )}

                {viewMode === "volunteers" && (
                  <>
                    {volunteers.length === 0 ? (
                      <div className="text-center py-10 text-gray-500">
                        No students have been added as volunteers yet.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student Name</TableHead>
                            <TableHead>Class</TableHead>
                            <TableHead>Grade</TableHead>
                            <TableHead>Volunteer Group</TableHead>
                            <TableHead>Date Added</TableHead>
                            <TableHead className="text-right">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {volunteers.flatMap((donor) =>
                            donor.participations.map((participation) => (
                              <TableRow key={`${donor.id}-${participation.id}`}>
                                <TableCell className="font-medium">
                                  {donor.name}
                                </TableCell>
                                <TableCell>{donor.className}</TableCell>
                                <TableCell>{donor.gradeName}</TableCell>
                                <TableCell>{participation.groupName}</TableCell>
                                <TableCell>
                                  {new Date(
                                    participation.date
                                  ).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() =>
                                      handleRemoveVolunteer(
                                        donor.id,
                                        participation.id
                                      )
                                    }
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Volunteer Selection Dialog */}
      <Dialog
        open={volunteerDialogOpen}
        onOpenChange={(open) => {
          // Prevent closing dialog while adding volunteers
          if (!isAddingVolunteers) {
            setVolunteerDialogOpen(open);
            // Reset states when dialog is closed
            if (!open) {
              setSelectedVolunteerGroupId("");
              setIsAddingVolunteers(false);
            }
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Students as Volunteers</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="volunteer-group">Select Volunteer Group</Label>
              <Select
                value={selectedVolunteerGroupId}
                onValueChange={setSelectedVolunteerGroupId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a volunteer group" />
                </SelectTrigger>
                <SelectContent>
                  {volunteerGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-amber-50 p-3 rounded-md text-sm text-amber-800">
              <p>
                <strong>Note:</strong> This will add all selected students as
                volunteers to the chosen group.
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">
                Selected students:{" "}
                <span className="font-medium">{selectedIds.size}</span>
              </p>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isAddingVolunteers}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={handleAddVolunteer}
              disabled={
                !selectedVolunteerGroupId ||
                selectedIds.size === 0 ||
                isAddingVolunteers
              }
              style={{ backgroundColor: "var(--card-colour-2)" }}
            >
              {isAddingVolunteers ? "Adding Volunteers..." : "Add Volunteers"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
