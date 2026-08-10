import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { format as formatDate } from "date-fns";
import { useCurrency } from "@/hooks/useCurrency";
import type { PracticePatientBalanceRow } from "@/hooks/usePracticeBillingAggregate";

type SortKey = "recent" | "owedDesc" | "owedAsc" | "paidDesc" | "paidAsc";

interface Props {
  rows: PracticePatientBalanceRow[];
  doctors: { id: string; name: string }[];
  loading?: boolean;
}

export function PracticePatientBalances({ rows, doctors, loading }: Props) {
  const { t } = useTranslation("dashboard");
  const { t: tf } = useTranslation("finance");
  const { format: fmt } = useCurrency();

  const [search, setSearch] = useState("");
  const [doctorFilter, setDoctorFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const [onlyBalance, setOnlyBalance] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const visible = useMemo(() => {
    let list = rows.filter((r) => {
      if (doctorFilter !== "all" && r.doctorId !== doctorFilter) return false;
      if (onlyBalance && r.outstanding <= 0) return false;
      if (search && !(r.patientName || "").toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "owedDesc":
          return b.outstanding - a.outstanding;
        case "owedAsc":
          return a.outstanding - b.outstanding;
        case "paidDesc":
          return b.paid - a.paid;
        case "paidAsc":
          return a.paid - b.paid;
        default:
          return String(b.lastActivity || "").localeCompare(String(a.lastActivity || ""));
      }
    });
    return list;
  }, [rows, doctorFilter, onlyBalance, search, sort]);

  const totals = useMemo(
    () =>
      visible.reduce(
        (acc, r) => ({
          billed: acc.billed + r.billed,
          paid: acc.paid + r.paid,
          outstanding: acc.outstanding + r.outstanding,
        }),
        { billed: 0, paid: 0, outstanding: 0 },
      ),
    [visible],
  );

  const dt = (v?: string | null) => (v ? formatDate(new Date(v), "dd MMM yyyy") : "—");

  return (
    <Card className="rounded-xl mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("admin.bl.patientBalances")}</CardTitle>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder={t("admin.bl.searchByPatient")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={doctorFilter} onValueChange={setDoctorFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t("admin.bl.allDoctors")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.bl.allDoctors")}</SelectItem>
              {doctors.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-[210px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">{t("admin.bl.sortRecent")}</SelectItem>
              <SelectItem value="owedDesc">{t("admin.bl.sortOwedDesc")}</SelectItem>
              <SelectItem value="owedAsc">{t("admin.bl.sortOwedAsc")}</SelectItem>
              <SelectItem value="paidDesc">{t("admin.bl.sortPaidDesc")}</SelectItem>
              <SelectItem value="paidAsc">{t("admin.bl.sortPaidAsc")}</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Switch id="only-balance" checked={onlyBalance} onCheckedChange={setOnlyBalance} />
            <Label htmlFor="only-balance" className="text-sm text-muted-foreground">
              {t("admin.bl.onlyWithBalance")}
            </Label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>{tf("patient")}</TableHead>
                <TableHead>{tf("doctor")}</TableHead>
                <TableHead className="text-right">{tf("amountToBill")}</TableHead>
                <TableHead className="text-right">{tf("amountPaid")}</TableHead>
                <TableHead className="text-right">{tf("outstanding")}</TableHead>
                <TableHead>{t("admin.bl.lastActivity")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    {tf("loading")}
                  </TableCell>
                </TableRow>
              ) : visible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    {tf("noEntries")}
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((r) => (
                  <>
                    <TableRow
                      key={r.key}
                      className="cursor-pointer"
                      onClick={() => setExpanded(expanded === r.key ? null : r.key)}
                    >
                      <TableCell>
                        {expanded === r.key ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {r.patientName || t("admin.bl.unknownPatient")}
                        {!r.patientId && (
                          <Badge variant="outline" className="ml-2 text-[10px]">
                            {t("admin.bl.walkIn")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.doctorName || "—"}
                      </TableCell>
                      <TableCell className="text-right">{fmt(r.billed)}</TableCell>
                      <TableCell className="text-right text-emerald-600">
                        {fmt(r.paid)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold ${r.outstanding > 0 ? "text-destructive" : ""}`}
                      >
                        {fmt(r.outstanding)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {dt(r.lastActivity)}
                      </TableCell>
                    </TableRow>
                    {expanded === r.key && (
                      <TableRow key={`${r.key}-detail`}>
                        <TableCell colSpan={7} className="bg-muted/30">
                          <div className="grid gap-6 md:grid-cols-2 py-2">
                            <div>
                              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                                {tf("ledger.charge")}
                              </p>
                              {r.charges.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  {tf("noEntries")}
                                </p>
                              ) : (
                                <ul className="space-y-1">
                                  {r.charges.map((c: any) => (
                                    <li
                                      key={c.id}
                                      className="flex justify-between gap-4 text-sm"
                                    >
                                      <span className="truncate">
                                        {c.description || tf("procedure")}
                                        <span className="ml-2 text-xs text-muted-foreground">
                                          {dt(c.created_at)}
                                        </span>
                                      </span>
                                      <span
                                        className={
                                          c.transaction_type === "discount"
                                            ? "text-emerald-600"
                                            : ""
                                        }
                                      >
                                        {fmt(
                                          c.amount_cents != null
                                            ? Number(c.amount_cents) / 100
                                            : Number(c.amount) || 0,
                                        )}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                                {tf("ledger.payment")}
                              </p>
                              {r.payments.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  {tf("noTransactions")}
                                </p>
                              ) : (
                                <ul className="space-y-1">
                                  {r.payments.map((p: any) => (
                                    <li
                                      key={p.id}
                                      className="flex justify-between gap-4 text-sm"
                                    >
                                      <span className="truncate">
                                        {p.payment_method || p.provider || tf("payment" as any) || ""}
                                        <span className="ml-2 text-xs text-muted-foreground">
                                          {dt(p.paid_at || p.created_at)}
                                        </span>
                                      </span>
                                      <span className="text-emerald-600">
                                        {fmt(Number(p.amount) || 0)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {visible.length > 0 && (
          <div className="flex flex-wrap justify-end gap-6 border-t pt-3 mt-3 text-sm">
            <span className="text-muted-foreground">
              {tf("amountToBill")}: <span className="font-semibold text-foreground">{fmt(totals.billed)}</span>
            </span>
            <span className="text-muted-foreground">
              {tf("amountPaid")}: <span className="font-semibold text-emerald-600">{fmt(totals.paid)}</span>
            </span>
            <span className="text-muted-foreground">
              {tf("outstanding")}: <span className="font-semibold text-destructive">{fmt(totals.outstanding)}</span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
