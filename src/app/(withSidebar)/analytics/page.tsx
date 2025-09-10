"use client";

import React, { useEffect, useState } from "react";
import { usePageHeader } from "@/components/page-header-context";
import axios from "axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Medal, Trophy, TrendingUp } from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// Types
type Group = {
  id: string;
  name: string;
  type: "FUND" | "VOLUNTEER";
};

type TopDonor = {
  id: string;
  name: string;
  className: string;
  gradeName: string;
  totalDonated: number;
};

type TopGroup = {
  id: string;
  name: string;
  totalDonated: number;
};

type Grade = {
  name: string; // e.g. "Grade 2"
  classes: string[]; // e.g. ["2A", "2B", "2C"]
};

type GroupDonationStat = {
  totalAmount: number;
};

type ClassDonationStat = {
  totalAmount: number;
  donorCount: number;
};

export default function AnalyticsPage() {
  const { setTitle } = usePageHeader();

  // State variables
  const [topDonors, setTopDonors] = useState<TopDonor[]>([]);
  const [topGroups, setTopGroups] = useState<TopGroup[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [groupDonationStat, setGroupDonationStat] =
    useState<GroupDonationStat | null>(null);
  const [classDonationStat, setClassDonationStat] =
    useState<ClassDonationStat | null>(null);

  // Set page title
  useEffect(() => {
    setTitle("Analytics");
  }, [setTitle]);

  // Fetch all necessary data when the component mounts
  useEffect(() => {
    fetchTopDonors();
    fetchTopGroups();
    fetchGroups();
    fetchGrades();
  }, []);

  // Fetch data when selections change
  useEffect(() => {
    if (selectedGroup) {
      fetchGroupDonations(selectedGroup);
    }
  }, [selectedGroup]);

  useEffect(() => {
    if (selectedGrade && selectedClass) {
      fetchClassDonations(selectedGrade, selectedClass);
    }
  }, [selectedGrade, selectedClass]);

  // Data fetching functions
  const fetchTopDonors = async () => {
    try {
      const res = await axios.get("/api/analytics/top-donors");
      setTopDonors(res.data);
    } catch (error) {
      toast.error("Failed to fetch top donors");
      console.error("Error fetching top donors:", error);
    }
  };

  const fetchTopGroups = async () => {
    try {
      const res = await axios.get("/api/analytics/top-groups");
      setTopGroups(res.data);
    } catch (error) {
      toast.error("Failed to fetch top groups");
      console.error("Error fetching top groups:", error);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await axios.get<{ data: Group[] }>(
        "/api/admin/groups/get-all-groups"
      );
      setGroups(res.data.data);
    } catch (error) {
      toast.error("Failed to fetch groups");
      console.error("Error fetching groups:", error);
    }
  };

  const fetchGrades = async () => {
    try {
      const res = await axios.get<Grade[]>("/api/analytics/grades");
      setGrades(res.data);
    } catch (error) {
      toast.error("Failed to fetch grades");
      console.error("Error fetching grades:", error);
    }
  };

  const fetchGroupDonations = async (groupId: string) => {
    try {
      const res = await axios.get<GroupDonationStat>(
        `/api/analytics/group-donations?groupId=${groupId}`
      );
      setGroupDonationStat(res.data);
    } catch (error) {
      toast.error("Failed to fetch group donations");
      console.error("Error fetching group donations:", error);
    }
  };

  const fetchClassDonations = async (gradeName: string, className: string) => {
    try {
      const res = await axios.get<ClassDonationStat>(
        `/api/analytics/class-donations?gradeName=${gradeName}&className=${className}`
      );
      setClassDonationStat(res.data);
    } catch (error) {
      toast.error("Failed to fetch class donations");
      console.error("Error fetching class donations:", error);
    }
  };

  // Handle selection changes
  const handleGradeChange = (value: string) => {
    setSelectedGrade(value);
    setSelectedClass(""); // Reset class when grade changes
    setClassDonationStat(null); // Reset class donation stats
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Leaderboard Section */}
      <section>
        <h2 className="text-2xl font-semibold mb-3">Leaderboards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Donor Card */}
          <Card className="shadow-md overflow-hidden py-0">
            <CardHeader className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-t-lg flex flex-row items-center justify-between p-4">
              <div>
                <CardTitle className="text-lg">Top Donors</CardTitle>
                <CardDescription>
                  Student who raised the most overall
                </CardDescription>
              </div>
              <Trophy className="h-10 w-10 text-yellow-500" />
            </CardHeader>
            <CardContent className="p-4">
              {topDonors.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                      <Medal className="h-6 w-6 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-xl font-bold">{topDonors[0].name}</p>
                      <p className="text-sm text-gray-500">
                        {topDonors[0].gradeName} - {topDonors[0].className}
                      </p>
                    </div>
                    <p className="ml-auto text-2xl font-bold text-green-600">
                      ${topDonors[0].totalDonated.toLocaleString()}
                    </p>
                  </div>

                  <ul className="space-y-2 mt-4">
                    {topDonors.slice(1, 5).map((donor, index) => (
                      <li key={donor.id} className="flex items-center gap-3">
                        <span className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-medium">
                          {index + 2}
                        </span>
                        <span className="font-medium">{donor.name}</span>
                        <span className="text-gray-500 text-sm ml-2">
                          {donor.gradeName} - {donor.className}
                        </span>
                        <span className="ml-auto font-semibold">
                          ${donor.totalDonated.toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">
                  No donor data available
                </p>
              )}
            </CardContent>
          </Card>

          {/* Top Group Card */}
          <Card className="shadow-md overflow-hidden py-0">
            <CardHeader className="bg-gradient-to-r from-green-100 to-teal-100 rounded-t-lg flex flex-row items-center justify-between p-4">
              <div>
                <CardTitle className="text-lg">Top Groups</CardTitle>
                <CardDescription>
                  Group with the highest total donations
                </CardDescription>
              </div>
              <Trophy className="h-10 w-10 text-teal-500" />
            </CardHeader>
            <CardContent className="p-4">
              {topGroups.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center">
                      <Medal className="h-6 w-6 text-teal-500" />
                    </div>
                    <div>
                      <p className="text-xl font-bold">{topGroups[0].name}</p>
                    </div>
                    <p className="ml-auto text-2xl font-bold text-green-600">
                      ${topGroups[0].totalDonated.toLocaleString()}
                    </p>
                  </div>

                  <ul className="space-y-2 mt-4">
                    {topGroups.slice(1, 5).map((group, index) => (
                      <li key={group.id} className="flex items-center gap-3">
                        <span className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-medium">
                          {index + 2}
                        </span>
                        <span className="font-medium">{group.name}</span>
                        <span className="ml-auto font-semibold">
                          ${group.totalDonated.toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">
                  No group data available
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Filter Section */}
      <section>
        <h2 className="text-2xl font-semibold mb-3">Donation Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Group Filter Card */}
          <Card className="shadow-md overflow-hidden py-0">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-t-lg p-4">
              <CardTitle className="text-lg">Group Donations</CardTitle>
              <CardDescription>
                Total money collected for selected group
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="group-select">Select Group</Label>
                  <Select
                    value={selectedGroup}
                    onValueChange={setSelectedGroup}
                  >
                    <SelectTrigger id="group-select">
                      <SelectValue placeholder="Select a group" />
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

                {selectedGroup && groupDonationStat && (
                  <div className="mt-4 rounded-lg bg-amber-50 p-4 text-center">
                    <div className="text-gray-600 mb-1">Total Donations</div>
                    <div className="text-3xl font-bold text-amber-600">
                      ${groupDonationStat.totalAmount.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Grade and Class Filter Card */}
          <Card className="shadow-md overflow-hidden py-0">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-t-lg p-4">
              <CardTitle className="text-lg">Class Donations</CardTitle>
              <CardDescription>
                Donation statistics by grade and class
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="grade-select">Select Grade</Label>
                  <Select
                    value={selectedGrade}
                    onValueChange={handleGradeChange}
                  >
                    <SelectTrigger id="grade-select">
                      <SelectValue placeholder="Select a grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {grades.map((grade) => (
                        <SelectItem key={grade.name} value={grade.name}>
                          {grade.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedGrade && (
                  <div>
                    <Label htmlFor="class-select">Select Class</Label>
                    <Select
                      value={selectedClass}
                      onValueChange={setSelectedClass}
                      disabled={!selectedGrade}
                    >
                      <SelectTrigger id="class-select">
                        <SelectValue placeholder="Select a class" />
                      </SelectTrigger>
                      <SelectContent>
                        {grades
                          .find((g) => g.name === selectedGrade)
                          ?.classes.map((className) => (
                            <SelectItem key={className} value={className}>
                              {className}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedGrade && selectedClass && classDonationStat && (
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-blue-50 p-4 text-center">
                      <div className="text-gray-600 mb-1">Total Donations</div>
                      <div className="text-2xl font-bold text-blue-600">
                        ${classDonationStat.totalAmount.toLocaleString()}
                      </div>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-4 text-center">
                      <div className="text-gray-600 mb-1">Students Donated</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {classDonationStat.donorCount}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
