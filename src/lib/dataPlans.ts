import type { DataPlan, NetworkProvider } from "@/types";

export const NETWORKS: NetworkProvider[] = [
  { id: 1, name: "MTN", shortName: "MTN", color: "#FFCC00" },
  { id: 2, name: "GLO", shortName: "Glo", color: "#00B950" },
  { id: 3, name: "AIRTEL", shortName: "Airtel", color: "#E40000" },
  { id: 4, name: "9MOBILE", shortName: "9mobile", color: "#00A0DC" },
];

export const DATA_PLANS: DataPlan[] = [
  // AIRTEL
  { bundle_id: 70, network: "AIRTEL", name: "1GB (Social Bundle) Gifting (3 Days)", price: 295, validity: "3 Days" },
  { bundle_id: 13, network: "AIRTEL", name: "500MB Gifting (7 days)", price: 490, validity: "7 Days" },
  { bundle_id: 69, network: "AIRTEL", name: "1.5GB Gifting (1 Day)", price: 500, validity: "1 Day" },
  { bundle_id: 66, network: "AIRTEL", name: "1.5GB Gifting (2 Days)", price: 599, validity: "2 Days" },
  { bundle_id: 15, network: "AIRTEL", name: "1GB Gifting (7 Days)", price: 800, validity: "7 Days" },
  { bundle_id: 17, network: "AIRTEL", name: "2GB Gifting (30 Days)", price: 1490, validity: "30 Days" },
  { bundle_id: 52, network: "AIRTEL", name: "5GB Gifting (7 Days)", price: 1570, validity: "7 Days" },
  { bundle_id: 18, network: "AIRTEL", name: "3GB Gifting (30 Days)", price: 1960, validity: "30 Days" },
  { bundle_id: 22, network: "AIRTEL", name: "6GB SME (7 Days)", price: 2455, validity: "7 Days" },
  { bundle_id: 19, network: "AIRTEL", name: "4GB Gifting (30 Days)", price: 2570, validity: "30 Days" },
  { bundle_id: 20, network: "AIRTEL", name: "8GB Gifting (30 Days)", price: 2999, validity: "30 Days" },
  { bundle_id: 21, network: "AIRTEL", name: "10GB Gifting (30 Days)", price: 4070, validity: "30 Days" },

  // GLO
  { bundle_id: 42, network: "GLO", name: "200MB Corporate Gifting (1 Day)", price: 92, validity: "1 Day" },
  { bundle_id: 35, network: "GLO", name: "500MB Corporate Gifting (30 Days)", price: 225, validity: "30 Days" },
  { bundle_id: 68, network: "GLO", name: "1GB Corporate Gifting (3 Days)", price: 300, validity: "3 Days" },
  { bundle_id: 36, network: "GLO", name: "1GB Corporate Gifting (30 Days)", price: 425, validity: "30 Days" },
  { bundle_id: 41, network: "GLO", name: "1GB Gifting (14 Days)", price: 485, validity: "14 Days" },
  { bundle_id: 40, network: "GLO", name: "2GB Corporate Gifting (30 Days)", price: 850, validity: "30 Days" },
  { bundle_id: 37, network: "GLO", name: "3GB Corporate Gifting (30 Days)", price: 1300, validity: "30 Days" },
  { bundle_id: 54, network: "GLO", name: "5GB Corporate Gifting (7 Days)", price: 1699, validity: "7 Days" },
  { bundle_id: 38, network: "GLO", name: "5GB Corporate Gifting (30 Days)", price: 2250, validity: "30 Days" },
  { bundle_id: 39, network: "GLO", name: "10GB Corporate Gifting (30 Days)", price: 4390, validity: "30 Days" },
  { bundle_id: 59, network: "GLO", name: "20.5GB Gifting (30 Days)", price: 5300, validity: "30 Days" },
  { bundle_id: 58, network: "GLO", name: "107GB Gifting (30 Days)", price: 19300, validity: "30 Days" },

  // MTN
  { bundle_id: 43, network: "MTN", name: "110MB Gifting (1 Day)", price: 99, validity: "1 Day" },
  { bundle_id: 74, network: "MTN", name: "230MB Gifting (1 Day)", price: 200, validity: "1 Day" },
  { bundle_id: 76, network: "MTN", name: "500MB SME (2 Days)", price: 250, validity: "2 Days" },
  { bundle_id: 78, network: "MTN", name: "1GB SME (1 Day)", price: 270, validity: "1 Day" },
  { bundle_id: 81, network: "MTN", name: "1GB Corporate Gifting (30 Days)", price: 280, validity: "30 Days" },
  { bundle_id: 44, network: "MTN", name: "500MB SME (30 Days)", price: 300, validity: "30 Days" },
  { bundle_id: 77, network: "MTN", name: "1GB SME (2 Days)", price: 399, validity: "2 Days" },
  { bundle_id: 45, network: "MTN", name: "1GB SME (7 Days)", price: 450, validity: "7 Days" },
  { bundle_id: 46, network: "MTN", name: "1GB SME (30 Days)", price: 570, validity: "30 Days" },
  { bundle_id: 79, network: "MTN", name: "2.5GB SME (1 Day)", price: 600, validity: "1 Day" },
  { bundle_id: 27, network: "MTN", name: "2.5GB Gifting (2 Days)", price: 900, validity: "2 Days" },
  { bundle_id: 71, network: "MTN", name: "2GB Gifting (7 Days)", price: 900, validity: "7 Days" },
  { bundle_id: 47, network: "MTN", name: "2GB SME (7 Days)", price: 930, validity: "7 Days" },
  { bundle_id: 60, network: "MTN", name: "4.5GB Gifting (1 Day)", price: 1050, validity: "1 Day" },
  { bundle_id: 48, network: "MTN", name: "2GB SME (30 Days)", price: 1150, validity: "30 Days" },
  { bundle_id: 61, network: "MTN", name: "4GB Gifting (2 Days)", price: 1175, validity: "2 Days" },
  { bundle_id: 80, network: "MTN", name: "5GB Corporate Gifting (14 Days)", price: 1299, validity: "14 Days" },
  { bundle_id: 82, network: "MTN", name: "5GB SME (30 Days)", price: 1299, validity: "30 Days" },
  { bundle_id: 49, network: "MTN", name: "3GB SME (30 Days)", price: 1370, validity: "30 Days" },
  { bundle_id: 50, network: "MTN", name: "5GB SME (30 Days)", price: 2050, validity: "30 Days" },
  { bundle_id: 53, network: "MTN", name: "6GB Gifting (7 Days)", price: 2495, validity: "7 Days" },
  { bundle_id: 33, network: "MTN", name: "7GB Gifting (30 Days)", price: 3600, validity: "30 Days" },
  { bundle_id: 55, network: "MTN", name: "11GB Gifting (7 Days)", price: 3550, validity: "7 Days" },
  { bundle_id: 67, network: "MTN", name: "10GB Gifting (30 Days)", price: 4800, validity: "30 Days" },
  { bundle_id: 57, network: "MTN", name: "36GB Gifting (30 Days)", price: 10900, validity: "30 Days" },
  { bundle_id: 51, network: "MTN", name: "75GB SME (30 Days)", price: 17990, validity: "30 Days" },
];

export const AIRTIME_PRESETS = [100, 200, 500, 1000, 2000, 5000];

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function getNetworkByProviderId(id: number): NetworkProvider | undefined {
  return NETWORKS.find((n) => n.id === id);
}
