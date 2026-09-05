import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

import { getWalletBalance, getTransactions, initializeWalletFunding, verifyWalletFunding } from "@/lib/api";
import { formatNaira } from "@/lib/dataPlans";
import type { Transaction } from "@/types";
import { Zap, LayoutDashboard, Smartphone, Wifi, Receipt, LogOut, Wallet as WalletIcon, Loader2, TrendingUp, CheckCircle2, XCircle, Clock, Plus, CreditCard, AlertCircle, RefreshCw } from "lucide-react";
import AirtimePurchase from "./AirtimePurchase";
import DataPurchase from "./DataPurchase";

// This placeholder prevents accidental contact details from being restored.
export default function AppShell(props: any) { return null; }
