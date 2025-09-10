// src/app/(withSidebar)/admin/finance/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePageHeader } from "@/components/page-header-context";
import { DollarSign, Landmark, Receipt, Scale } from "lucide-react";

// Types
type Group = { id: string; name: string; type: "FUND" | "VOLUNTEER" };
type Budget = {
  id: string;
  amount: number;
  groupId?: string;
};
type Expense = {
  id: string;
  amount: number;
  description?: string;
  groupId?: string;
  date: string;
  fundingSource?: "BUDGET" | "DONATION" | "EXTERNAL";
};

export default function FinancePage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [amount, setAmount] = useState("");
  const [groupId, setGroupId] = useState("");
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [budgetToDelete, setBudgetToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [fundingSource, setFundingSource] = useState<string>("");

  const { setTitle } = usePageHeader();

  useEffect(() => {
    setTitle("Finances");
  }, [setTitle]);

  useEffect(() => {
    fetchGroups();
    fetchBudgets();
    fetchExpenses();
  }, []);

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

  const fetchBudgets = async () => {
    try {
      const res = await axios.get<{ data: Budget[] }>("/api/admin/budgets");
      setBudgets(res.data.data);
    } catch {
      toast.error("Failed to fetch budgets");
    }
  };

  const fetchExpenses = async () => {
    try {
      const res = await axios.get<{ data: Expense[] }>("/api/admin/expenses");
      setExpenses(res.data.data);
    } catch {
      toast.error("Failed to fetch expenses");
    }
  };

  const handleAddBudget = async () => {
    if (!groupId) {
      toast.error("Please select a group");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      if (editingBudget) {
        // Update existing budget
        await axios.post("/api/admin/budgets", {
          amount: parseFloat(amount),
          groupId,
        });
        toast.success("Budget updated");
      } else {
        // Create new budget
        await axios.post("/api/admin/budgets", {
          amount: parseFloat(amount),
          groupId,
        });
        toast.success("Budget added");
      }

      fetchBudgets();

      // Reset form fields
      setAmount("");
      setGroupId("");
      setEditingBudget(null);
    } catch (error) {
      const axiosError = error as AxiosError<{ error: string }>;
      toast.error(axiosError.response?.data?.error || "Error saving budget");
    }
  };

  const handleEditBudget = (budget: Budget) => {
    const group = groups.find((g) => g.id === budget.groupId);
    if (group) {
      setGroupId(group.id);
      setAmount(budget.amount.toString());
      setEditingBudget(budget);
    }
  };

  const openDeleteDialog = (budgetId: string) => {
    setBudgetToDelete(budgetId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteBudget = async () => {
    if (!budgetToDelete) return;

    try {
      await axios.delete(`/api/admin/budgets?id=${budgetToDelete}`);
      toast.success("Budget deleted");
      fetchBudgets();
      setBudgetToDelete(null);
    } catch (error) {
      const axiosError = error as AxiosError<{ error: string }>;
      toast.error(axiosError.response?.data?.error || "Error deleting budget");
    }
  };

  const handleAddExpense = async () => {
    if (!expenseAmount || parseFloat(expenseAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!expenseDesc) {
      toast.error("Please enter a description");
      return;
    }

    if (!groupId) {
      toast.error("Please select a group");
      return;
    }

    if (!fundingSource) {
      toast.error("Please select a funding source");
      return;
    }

    try {
      await axios.post("/api/admin/expenses", {
        amount: parseFloat(expenseAmount),
        description: expenseDesc,
        groupId,
        fundingSource,
        date: new Date().toISOString(),
      });
      toast.success("Expense added");
      fetchExpenses();

      // Reset form fields
      setExpenseAmount("");
      setExpenseDesc("");
      setGroupId("");
      setFundingSource("");
    } catch (error) {
      const axiosError = error as AxiosError<{ error: string }>;
      toast.error(axiosError.response?.data?.error || "Error adding expense");
    }
  };

  // Simple calculations
  const totalBudget = budgets.reduce((acc, b) => acc + Number(b.amount), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount), 0);
  const balance = totalBudget - totalExpenses;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* ✨ Make the Tabs component the main container card */}
      <Tabs
        defaultValue="budgets"
        className="w-full bg-white rounded-xl shadow-lg border"
      >
        {/* ✨ Redesigned TabsList for a modern underline style */}
        <TabsList className="w-full grid grid-cols-3 h-auto rounded-t-xl bg-slate-50 p-0 border-b">
          <TabsTrigger
            value="budgets"
            className="text-slate-600 font-medium py-4 rounded-tl-xl data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-none"
          >
            Budgets
          </TabsTrigger>
          <TabsTrigger
            value="expenses"
            className="text-slate-600 font-medium py-4 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-none"
          >
            Expenses
          </TabsTrigger>
          <TabsTrigger
            value="calculations"
            className="text-slate-600 font-medium py-4 rounded-tr-xl data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-none"
          >
            Summary
          </TabsTrigger>
        </TabsList>

        {/* Budgets Tab */}
        <TabsContent value="budgets" className="p-6">
          {/* ✨ Removed the inner Card component, using this as the content area directly */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Manage Budgets
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-end p-4 bg-slate-50 rounded-lg border">
              <div className="space-y-1.5">
                <Label>Group</Label>
                <Select onValueChange={setGroupId} value={groupId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name} ({g.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Amount</Label>
                <div className="relative">
                  <DollarSign
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={16}
                  />
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <Button
                onClick={handleAddBudget}
                disabled={!groupId || !amount}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium w-full"
              >
                {editingBudget ? "Update Budget" : "Add Budget"}
              </Button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              Existing Budgets
            </h3>
            <div className="rounded-lg overflow-hidden border">
              {budgets.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No budgets found
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {budgets.map((b) => (
                    <li
                      key={b.id}
                      className="p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-gray-900">
                            {groups.find((g) => g.id === b.groupId)?.name ||
                              "General"}
                          </div>
                          <div className="text-sm text-gray-500">
                            {groups.find((g) => g.id === b.groupId)?.type || ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-xl font-bold text-green-600">
                            ${Number(b.amount).toLocaleString()}
                          </div>
                          <div className="h-6 w-px bg-gray-200 mx-1"></div>
                          <div className="flex items-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-500 hover:text-blue-700 h-8"
                              onClick={() => handleEditBudget(b)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 h-8"
                              onClick={() => openDeleteDialog(b.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="p-6">
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Manage Expenses
            </h2>
            <div className="grid gap-4 md:grid-cols-2 p-4 bg-slate-50 rounded-lg border">
              <div className="space-y-1.5">
                <Label>Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">
                    <DollarSign size={16} />
                  </span>
                  <Input
                    type="number"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="pl-8 h-10 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  placeholder="Enter expense description"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Group</Label>
                <Select onValueChange={setGroupId} value={groupId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select group" />
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

              <div className="space-y-1.5">
                <Label>Funding Source</Label>
                <Select onValueChange={setFundingSource} value={fundingSource}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select funding source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUDGET">Budget</SelectItem>
                    <SelectItem value="DONATION">Donation</SelectItem>
                    <SelectItem value="EXTERNAL">External</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Button
                  onClick={handleAddExpense}
                  disabled={
                    !expenseAmount || !expenseDesc || !fundingSource || !groupId
                  }
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Add Expense
                </Button>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              Recent Expenses
            </h3>
            <div className="rounded-lg overflow-hidden border">
              {expenses.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No expenses found
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {expenses.map((e) => (
                    <li
                      key={e.id}
                      className="p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                        <div>
                          <div className="font-medium text-gray-900">
                            {e.description}
                          </div>
                          <div className="text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1 mt-1">
                            <span>
                              Group:{" "}
                              {groups.find((g) => g.id === e.groupId)?.name ||
                                "None"}
                            </span>
                            <span>Source: {e.fundingSource || "Unknown"}</span>
                            <span>
                              Date: {new Date(e.date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="text-xl font-bold text-red-600">
                          -${Number(e.amount).toLocaleString()}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Calculations Tab */}
        <TabsContent value="calculations" className="p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">
            Financial Summary
          </h2>
          {/* ✨ Revamped summary cards with icons */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Total Budget
                </CardTitle>
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                  <Landmark className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  ${totalBudget.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Total Expenses
                </CardTitle>
                <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                  <Receipt className="h-4 w-4 text-red-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  ${totalExpenses.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Remaining Balance
                </CardTitle>
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Scale className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-3xl font-bold ${
                    balance >= 0 ? "text-blue-600" : "text-red-600"
                  }`}
                >
                  ${balance.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              Financial Overview
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-600">Total number of budgets:</span>
                <span className="font-medium">{budgets.length}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-600">Total number of expenses:</span>
                <span className="font-medium">{expenses.length}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-600">Average expense amount:</span>
                <span className="font-medium">
                  $
                  {expenses.length
                    ? (totalExpenses / expenses.length).toFixed(2)
                    : "0.00"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600">Budget utilization:</span>
                <span className="font-medium">
                  {totalBudget
                    ? `${Math.round((totalExpenses / totalBudget) * 100)}%`
                    : "0%"}
                </span>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              budget entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBudget}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
