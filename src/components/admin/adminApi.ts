import { supabase } from "@/lib/supabase";

/* =====================================================
   TYPES
===================================================== */

export type AdminStats = {
  users: number;
  fundedWallets: number;
  successfulTransactions: number;
  transactionVolume: number;
  estimatedProfit: number;
  pendingTransactions:
