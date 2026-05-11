import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface StripeMonthData {
  month: string;
  revenue: number;
}

interface StripeCharge {
  id: string;
  amount: number;
  description: string;
  date: string;
}

export interface StripeRevenueData {
  mrr: number;
  activeCount: number;
  monthlyRevenue: StripeMonthData[];
  recentCharges: StripeCharge[];
}

export function useStripeRevenue() {
  return useQuery({
    queryKey: ["stripe-revenue"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("stripe-revenue");
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data as StripeRevenueData;
    },
    staleTime: 1000 * 60 * 5, // refresh every 5 minutes
  });
}
