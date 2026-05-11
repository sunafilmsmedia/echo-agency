import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, DollarSign, Target, Users } from "lucide-react";

export function ROITab() {
  const [fee, setFee] = useState(2000);
  const [adSpend, setAdSpend] = useState(5000);
  const [leads, setLeads] = useState(50);
  const [closingRate, setClosingRate] = useState(20);
  const [avgValue, setAvgValue] = useState(3000);

  const clients = Math.round((leads * closingRate) / 100);
  const revenue = clients * avgValue;
  const totalInvestment = fee + adSpend;
  const profit = revenue - totalInvestment;
  const roi = totalInvestment > 0 ? ((profit / totalInvestment) * 100) : 0;
  const cpl = leads > 0 ? totalInvestment / leads : 0;
  const cpc = clients > 0 ? totalInvestment / clients : 0;

  const rating =
    roi > 300 ? { label: "Excellent", color: "text-emerald-400" } :
    roi > 150 ? { label: "Bon", color: "text-primary" } :
    roi > 50  ? { label: "Correct", color: "text-amber-400" } :
                { label: "À améliorer", color: "text-destructive" };

  const field = (label: string, value: number, setter: (v: number) => void, prefix = "$") => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{prefix}</span>
        <Input
          type="number"
          value={value}
          onChange={(e) => setter(Number(e.target.value))}
          className="pl-7"
        />
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Paramètres Client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {field("Honoraires mensuels", fee, setFee)}
            {field("Budget pub mensuel", adSpend, setAdSpend)}
            {field("Leads / mois", leads, setLeads, "#")}
            {field("Taux de closing (%)", closingRate, setClosingRate, "%")}
            {field("Valeur moyenne client ($)", avgValue, setAvgValue)}
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          <Card className="border-primary/20">
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground mb-1">ROI Client</p>
              <p className={`text-5xl font-bold ${rating.color}`}>{roi.toFixed(0)}%</p>
              <span className={`text-sm font-medium ${rating.color}`}>{rating.label}</span>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Investissement", value: formatCurrency(totalInvestment), icon: DollarSign },
              { label: "Revenus générés", value: formatCurrency(revenue), icon: TrendingUp },
              { label: "Profit net client", value: formatCurrency(profit), icon: Target },
              { label: "Clients acquis", value: `${clients}/mois`, icon: Users },
            ].map(({ label, value, icon: Icon }) => (
              <Card key={label}>
                <CardContent className="pt-4 pb-4">
                  <Icon className="w-4 h-4 text-primary mb-1" />
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-bold text-foreground">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Coût par lead</span>
                <span className="font-medium">{formatCurrency(cpl)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Coût par client</span>
                <span className="font-medium">{formatCurrency(cpc)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
