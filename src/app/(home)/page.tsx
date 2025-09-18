// src/app/(home)/page.tsx
"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import PublicHeader from "@/components/publicHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type GradeStats = {
  grade: string;
  totalRaised: number;
  topDonor: {
    name: string;
    className: string;
    amount: number;
  } | null;
  groupStats: {
    groupName: string;
    amount: number;
  }[];
};

export default function HomePage() {
  const [gradeStats, setGradeStats] = useState<GradeStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGradeStats = async () => {
      try {
        const response = await axios.get<{ data: GradeStats[] }>(
          "/api/public/grade-stats"
        );
        setGradeStats(response.data.data);
      } catch (error) {
        console.error("Failed to fetch grade stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGradeStats();
  }, []);

  if (loading) {
    return (
      <div className="relative min-h-screen">
        <PublicHeader showAdminLogin />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Header */}
      <PublicHeader showAdminLogin />

      {/* MEDIA LAYER */}

      {/* Mobile: <640px */}
      <div className="absolute inset-0 sm:hidden">
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src="/assets/homepage/hero_video_mobile.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
      </div>

      {/* Tablet / Small laptops: 640px–1279px */}
      <div className="absolute inset-0 hidden sm:block xl:hidden">
        {/* Landscape (4:3) */}
        <video
          className="hidden landscape:block absolute inset-0 w-full h-full object-cover"
          src="/assets/homepage/hero_video_ipad_4x3.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/assets/homepage/home_bg.jpeg"
        />
        {/* Portrait (3:4) */}
        <video
          className="hidden portrait:block absolute inset-0 w-full h-full object-cover"
          src="/assets/homepage/hero_video_ipad_3x4.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/assets/homepage/home_bg.jpeg"
        />
      </div>

      {/* Large laptops / 4K monitors: ≥1280px */}
      <div className="absolute inset-0 hidden xl:block">
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src="/assets/homepage/hero_video_laptop.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/assets/homepage/home_bg.jpeg"
        />
      </div>

      {/* Dim overlay for readability */}
      <div className="absolute inset-0 bg-black/40" />

      {/* CONTENT */}
      <main className="relative z-10 pt-20 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
              BAIS SHAINDEL CHESSED
            </h1>
            <p className="text-xl md:text-2xl text-white/90">
              Donation Statistics by Grade
            </p>
          </div>

          {/* 4 Quadrants Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {gradeStats.map((grade) => (
              <Card
                key={grade.grade}
                className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl"
              >
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-3xl font-bold text-gray-800">
                    Grade {grade.grade}
                  </CardTitle>
                  <div className="text-2xl font-semibold text-green-600">
                    Total Raised: ${grade.totalRaised.toLocaleString()}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Top Donor */}
                  {grade.topDonor && (
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <h3 className="font-semibold text-gray-800 mb-2">
                        🏆 TOP CHESSED MASTER
                      </h3>
                      <div className="text-lg font-medium text-gray-700">
                        {grade.topDonor.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        Class {grade.topDonor.className} • $
                        {grade.topDonor.amount.toLocaleString()}
                      </div>
                    </div>
                  )}

                  {/* Group Statistics */}
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">
                      Funds Raised by Program
                    </h3>
                    <div className="space-y-2">
                      {grade.groupStats.map((group) => (
                        <div
                          key={group.groupName}
                          className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded"
                        >
                          <span className="text-sm font-medium text-gray-700">
                            {group.groupName}
                          </span>
                          <span className="text-sm font-semibold text-green-600">
                            ${group.amount.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
