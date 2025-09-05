"use client";

import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DollarSign, ChartColumnBig } from "lucide-react";
import { usePageHeader } from "@/components/page-header-context";

// Types
type DashboardStats = {
  budget: number;
  spent: number;
  remaining: number;
  qrTotal: number;
  qrActive: number;
  donorTotal: number;
  groupTotal: number;
  totalDonations: number;
};

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const { setTitle } = usePageHeader();

  useEffect(() => {
    setTitle("Admin Dashboard");
  }, [setTitle]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get<{ data: DashboardStats }>(
        "/api/dashboard-stats"
      );
      setStats(res.data.data);
    } catch (err) {
      console.error("Failed to load dashboard stats", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "ADMIN") {
      router.push("/dashboard");
    } else {
      fetchStats();
      const iv = setInterval(fetchStats, 45_000);
      return () => clearInterval(iv);
    }
  }, [status, session, router, fetchStats]);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold"></h1>
        <Button
          onClick={fetchStats}
          disabled={loading}
          style={{ backgroundColor: "var(--card-colour-7)" }}
          className="text-white"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {/* Summary Cards */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">
          <DollarSign className="inline-block mr-2" /> Financial Summary
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card
            style={{ backgroundColor: "var(--card-colour-1)" }}
            className="text-white shadow-md"
          >
            <CardHeader>
              <CardTitle>Budget</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">
                ${stats?.budget.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card
            style={{ backgroundColor: "var(--card-colour-2)" }}
            className="text-white shadow-md"
          >
            <CardHeader>
              <CardTitle>Spent</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">
                ${stats?.spent.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card
            style={{ backgroundColor: "var(--card-colour-3)" }}
            className="text-white shadow-md"
          >
            <CardHeader>
              <CardTitle>Remaining</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">
                ${stats?.remaining.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Other Analytics */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">
          <ChartColumnBig className="inline-block mr-2" />
          Analytics
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card
            style={{ backgroundColor: "var(--card-colour-4)" }}
            className="text-white shadow-md"
          >
            <CardHeader>
              <CardTitle>Total QR Codes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{stats?.qrTotal}</p>
            </CardContent>
          </Card>
          <Card
            style={{ backgroundColor: "var(--card-colour-1)" }}
            className="text-white shadow-md"
          >
            <CardHeader>
              <CardTitle>Active QR Codes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{stats?.qrActive}</p>
            </CardContent>
          </Card>
          <Card
            style={{ backgroundColor: "var(--card-colour-2)" }}
            className="text-white shadow-md"
          >
            <CardHeader>
              <CardTitle>Total Students</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{stats?.donorTotal}</p>
            </CardContent>
          </Card>
          <Card
            style={{ backgroundColor: "var(--card-colour-3)" }}
            className="text-white shadow-md"
          >
            <CardHeader>
              <CardTitle>Total Groups</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{stats?.groupTotal}</p>
            </CardContent>
          </Card>
          <Card
            style={{ backgroundColor: "var(--card-colour-4)" }}
            className="text-white shadow-md"
          >
            <CardHeader>
              <CardTitle>Total Donations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">
                ${stats?.totalDonations.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
