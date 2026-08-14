export type Transaction = {
  id: string;
  user_id: string;
  type: "airtime" | "data";
  network: string;
  phone_number: string;
  amount: number;
  plan_name: string;
  provider_ref: string;
  status: "pending" | "success" | "failed";
  message: string;
  created_at: string;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  created_at: string;
};

export type Wallet = {
  id: string;
  user_id: string;
  balance: number;
  updated_at: string;
};

export type DataPlan = {
  bundle_id: number;
  network: string;
  name: string;
  price: number;
  validity: string;
};

export type NetworkProvider = {
  id: number;
  name: string;
  shortName: string;
  color: string;
};
