import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
} from 'react';

import {
  fetchCSVData,
  CSVData,
} from '@/src/lib/csvService';

import * as XLSX from 'xlsx';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { Input } from '@/components/ui/input';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import {
  Search,
  RefreshCw,
  FileSpreadsheet,
  Download,
  Filter,
  LayoutDashboard,
  Table as TableIcon,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  ClipboardList,
  TrendingDown,
  TrendingUp,
  Minus,
  Sparkles,
  Bot,
  MessageSquare,
  X,
  Loader2
} from 'lucide-react';

import { Button } from '@/components/ui/button';

import { toast } from 'sonner';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSbvA_5FOxi2-nkfz8iJbptOhDfBCLM5LnTwrVLeJ4pf1hlGjSBywsTXQYYtEjuo0DY2M63wcJmc0tP/pub?gid=32687697&single=true&output=csv';

export default function Dashboard() {
  const [data, setData] =
    useState<CSVData[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] = useState<
    string | null
  >(null);

  const [searchTerm, setSearchTerm] =
    useState('');

  const [currentPage, setCurrentPage] =
    useState(1);

  const [pageSize, setPageSize] =
    useState(20);

  const [visibleColumns, setVisibleColumns] =
    useState<string[]>([]);

  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  const [selectedCabang, setSelectedCabang] =
    useState('all');

  const [lastSyncTime, setLastSyncTime] =
    useState<Date | null>(null);

  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [aiMode, setAiMode] = useState<"summary" | "discrepancy" | "all">("summary");

  const lastSyncTimeRef =
    useRef<Date | null>(null);

  // =============================
  // LOAD DATA
  // =============================

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const result =
        await fetchCSVData(CSV_URL);

      const filteredResult = result.filter(
        (row) => {
          const values = Object.values(row);

          if (
            values.every(
              (v) =>
                v === null ||
                v === undefined ||
                v === ''
            )
          ) {
            return false;
          }

          return !values.some((val) => {
            const s = String(val)
              .toLowerCase()
              .trim();

            return (
              s.includes('sub total') ||
              s.includes('subtotal') ||
              s.includes('grand total') ||
              s.includes('grandtotal') ||
              s === 'null'
            );
          });
        }
      );

      setData(filteredResult);

      if (
        filteredResult.length > 0 &&
        visibleColumns.length === 0
      ) {
        const allCols = Object.keys(
          filteredResult[0]
        );

        const getCol = (
          keyword: string
        ) =>
          allCols.find(
            (c) =>
              c.toLowerCase().replace(/\s+/g, '') ===
              keyword.replace(/\s+/g, '')
          );

        const orderedColumns = [
          getCol('cabang'),
          getCol('locator'),
          getCol('searchkey'),
          getCol('name'),
          getCol('uom'),
          getCol('startqty'),
          getCol('mr'),
          getCol('matto+'),
          getCol('prod+'),
          getCol('ship-'),
          getCol('matfrom-'),
          getCol('adj+'),
          getCol('lastqty'),
          getCol('moveqty'),
          getCol('selisih'),
          getCol('no.document'),
          getCol('movementdate'),
        ];

        setVisibleColumns(
          orderedColumns.filter(
            (col): col is string =>
              Boolean(col)
          )
        );
      }

      const now = new Date();

      setLastSyncTime(now);

      lastSyncTimeRef.current = now;

      toast.success(
        'Data loaded successfully'
      );
    } catch (err) {
      console.error(err);

      setError(
        'Failed to fetch data.'
      );

      toast.error(
        'Failed to load data'
      );
    } finally {
      setLoading(false);
    }
  };

  // =============================
  // AUTO REFRESH
  // =============================

  useEffect(() => {
    loadData();

    const intervalId = setInterval(() => {
      const now = new Date();

      if (
        now.getHours() === 6 &&
        now.getMinutes() === 0
      ) {
        const lastSync =
          lastSyncTimeRef.current;

        if (
          !lastSync ||
          lastSync.getDate() !==
            now.getDate() ||
          lastSync.getHours() !== 6
        ) {
          loadData();
        }
      }
    }, 30000);

    return () =>
      clearInterval(intervalId);
  }, []);

  // =============================
  // CABANG
  // =============================

  const cabangColumn = useMemo(() => {
    if (!data.length) return null;

    return Object.keys(data[0]).find(
      (col) =>
        col
          .toLowerCase()
          .includes('cabang')
    );
  }, [data]);

  const cabangList = useMemo(() => {
    if (!cabangColumn) return [];

    return [
      ...new Set(
        data.map((row) =>
          String(
            row[cabangColumn] || ''
          ).trim()
        )
      ),
    ].filter(Boolean);
  }, [data, cabangColumn]);

  // =============================
  // HANDLE SORT
  // =============================

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === 'asc'
    ) {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  // =============================
  // FILTER DATA
  // =============================

  const filteredData = useMemo(() => {
    let result = data;

    // SEARCH
    if (searchTerm) {
      result = result.filter((row) =>
        Object.values(row).some((val) =>
          String(val)
            .toLowerCase()
            .includes(
              searchTerm.toLowerCase()
            )
        )
      );
    }

    // CABANG FILTER
    if (
      selectedCabang !== 'all' &&
      cabangColumn
    ) {
      result = result.filter(
        (row) =>
          String(
            row[cabangColumn] || ''
          ).trim() === selectedCabang
      );
    }

    // SORTING
    if (sortConfig !== null) {
      result = [...result].sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];

        if (valA === valB) return 0;
        
        // Try numeric sort first
        const numA = Number(String(valA).replace(/,/g, ''));
        const numB = Number(String(valB).replace(/,/g, ''));
        
        if (!isNaN(numA) && !isNaN(numB) && valA !== null && valA !== undefined && valA !== "" && valB !== null && valB !== undefined && valB !== "") {
          return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
        }

        const strA = String(valA ?? '').toLowerCase();
        const strB = String(valB ?? '').toLowerCase();

        if (strA < strB) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (strA > strB) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [
    data,
    searchTerm,
    selectedCabang,
    cabangColumn,
    sortConfig,
  ]);

  // =============================
  // PAGINATION
  // =============================

  const paginatedData = useMemo(() => {
    const start =
      (currentPage - 1) * pageSize;

    return filteredData.slice(
      start,
      start + pageSize
    );
  }, [
    filteredData,
    currentPage,
    pageSize,
  ]);

  const totalPages = Math.ceil(
    filteredData.length / pageSize
  );

  // =============================
  // REPORT COLUMNS
  // =============================

  const reportColumns = useMemo(() => {
    if (!data.length) return [];

    const allCols = Object.keys(data[0]);

    const getCol = (
      keyword: string
    ) =>
      allCols.find(
        (col) =>
          col.toLowerCase().replace(/\s+/g, '') ===
          keyword.replace(/\s+/g, '')
      );

    return [
      getCol('cabang'),
      getCol('locator'),
      getCol('searchkey'),
      getCol('name'),
      getCol('uom'),
      getCol('startqty'),
      getCol('lastqty'),
      getCol('moveqty'),
      getCol('selisih'),
      getCol('no.document'),
      getCol('movementdate'),
    ].filter(
      (col): col is string =>
        Boolean(col)
    );
  }, [data]);

  // =============================
  // STOCK ANALYSIS
  // =============================

  const stockAnalysis = useMemo(() => {
    if (!filteredData.length) {
      return {
        plus: 0,
        minus: 0,
        balanced: 0,
        totalSelisih: 0,
      };
    }

    const selisihCol =
      reportColumns.find((c) =>
        c
          .toLowerCase()
          .includes('selisih')
      );

    if (!selisihCol) {
      return {
        plus: 0,
        minus: 0,
        balanced: 0,
        totalSelisih: 0,
      };
    }

    return filteredData.reduce(
      (acc, row) => {
        const val =
          Number(row[selisihCol]) || 0;

        if (val > 0) acc.plus++;
        else if (val < 0)
          acc.minus++;
        else acc.balanced++;

        acc.totalSelisih += val;

        return acc;
      },
      {
        plus: 0,
        minus: 0,
        balanced: 0,
        totalSelisih: 0,
      }
    );
  }, [filteredData, reportColumns]);

  // =============================
  // EXPORT EXCEL
  // =============================

  const exportToExcel = () => {
    try {
      const exportData =
        filteredData.map((row) => {
          const obj: any = {};

          reportColumns.forEach((col) => {
            obj[col] = row[col];
          });

          return obj;
        });

      const worksheet =
        XLSX.utils.json_to_sheet(
          exportData
        );

      const workbook =
        XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        'Laporan'
      );

      XLSX.writeFile(
        workbook,
        'Laporan_Stock.xlsx'
      );

      toast.success(
        'Excel berhasil didownload'
      );
    } catch (err) {
      toast.error('Export gagal');
    }
  };

  // =============================
  // LOADING
  // =============================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // =============================
  // ERROR
  // =============================

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-[400px]">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />

            <h2 className="font-bold text-lg mb-2">
              Error
            </h2>

            <p className="text-slate-500 mb-4">
              {error}
            </p>

            <Button onClick={loadData}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // =============================
  // PIE DATA
  // =============================

  const pieData = [
    {
      name: 'Plus',
      value: stockAnalysis.plus,
    },
    {
      name: 'Minus',
      value: stockAnalysis.minus,
    },
    {
      name: 'Balanced',
      value: stockAnalysis.balanced,
    },
  ];

  // =============================
  // ANALYTICS DATA
  // =============================

  const analyticsData = filteredData
    .map((row) => ({
      name: String(
        row[
          reportColumns.find((c) =>
            c
              .toLowerCase()
              .includes('name')
          ) || ''
        ] || 'Unknown'
      ).slice(0, 20),

      value:
        Number(
          row[
            reportColumns.find((c) =>
              c
                .toLowerCase()
                .includes('selisih')
            ) || ''
          ]
        ) || 0,
    }))
    .sort(
      (a, b) =>
        Math.abs(b.value) -
        Math.abs(a.value)
    )
    .slice(0, 8);

  const handleAskAI = async () => {
    if (aiGenerating) return;
    setAiGenerating(true);
    setAiResponse('');
    
    let payloadData: any;
    if (aiMode === "summary") {
      payloadData = {
        totalItem: filteredData.length,
        totalSelisihKuantitas: stockAnalysis.totalSelisih,
        totalItemPlus: stockAnalysis.plus,
        totalItemMinus: stockAnalysis.minus,
        totalItemBalanced: stockAnalysis.balanced,
        topSelisihItem: chartDataSelisih
      };
    } else if (aiMode === "discrepancy") {
      payloadData = filteredData.filter(d => {
        const selisihCol = Object.keys(d).find(k => k.toLowerCase().replace(/\s+/g, '') === 'selisih');
        return selisihCol ? Number(d[selisihCol]) !== 0 : false;
      });
    } else {
      payloadData = filteredData;
    }

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: payloadData,
          prompt: aiPrompt,
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Failed to analyze data");
      }

      setAiResponse(resData.text);
    } catch (e: any) {
      toast.error(e.message || "Gagal menghubungi AI Assistant");
    } finally {
      setAiGenerating(false);
    }
  };

  return (
  <div className="min-h-screen bg-slate-50 font-sans">
    {/* TOP HEADER */}
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
      <div className="px-6 py-4 flex flex-col xl:flex-row xl:items-center justify-between gap-5">
        
        {/* LEFT */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center shadow-sm">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Stock Analyzer
            </h1>

            <p className="text-sm text-slate-500 font-medium">
              Live Inventory Monitoring Dashboard
            </p>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex flex-wrap items-center gap-3">

          {/* LAST SYNC */}
          <div className="hidden lg:flex items-center gap-3 border border-slate-200 rounded-lg px-4 py-2 bg-slate-50">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Last Sync
              </p>
              <p className="text-xs font-semibold text-slate-700">
                {lastSyncTime
                  ? lastSyncTime.toLocaleString("id-ID")
                  : "-"}
              </p>
            </div>
          </div>

          {/* REFRESH */}
          <Button
            onClick={loadData}
            variant="outline"
            className="h-10 px-4 rounded-lg border-slate-200 text-slate-700 bg-white shadow-sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>

          {/* AI ANALYST */}
          <Button
            onClick={() => setShowAiModal(true)}
            className="h-10 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Ask AI Assistant
          </Button>

          {/* EXPORT */}
          <Button
            onClick={exportToExcel}
            className="h-10 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>
    </header>

    {/* MAIN */}
    <main className="px-6 py-6">

      {/* SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">


        {/* CARD */}
        <Card className="rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Selisih
                </p>

                <h2 className="text-3xl font-bold text-slate-900 mt-2 tracking-tight">
                  {stockAnalysis.totalSelisih.toLocaleString()}
                </h2>
              </div>

              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PLUS */}
        <Card className="rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Stock Plus
                </p>

                <h2 className="text-3xl font-bold text-emerald-600 mt-2 tracking-tight">
                  {stockAnalysis.plus}
                </h2>
              </div>

              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* MINUS */}
        <Card className="rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Stock Minus
                </p>

                <h2 className="text-3xl font-bold text-rose-600 mt-2 tracking-tight">
                  {stockAnalysis.minus}
                </h2>
              </div>

              <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* BALANCED */}
        <Card className="rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Balanced
                </p>

                <h2 className="text-3xl font-bold text-amber-500 mt-2 tracking-tight">
                  {stockAnalysis.balanced}
                </h2>
              </div>

              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <Minus className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TABS */}
      <Tabs defaultValue="table">

        {/* MENU */}
        <TabsList className="bg-slate-100/50 border border-slate-200 rounded-lg p-1 h-auto flex gap-1 shadow-none inline-flex mb-6 w-auto">

          <TabsTrigger
            value="table"
            className="rounded-md px-4 py-2 text-sm font-semibold text-slate-600 transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            <TableIcon className="w-4 h-4 mr-2" />
            Data Table
          </TabsTrigger>

          <TabsTrigger
            value="laporan"
            className="rounded-md px-4 py-2 text-sm font-semibold text-slate-600 transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            <ClipboardList className="w-4 h-4 mr-2" />
            Laporan
          </TabsTrigger>

          <TabsTrigger
            value="analytics"
            className="rounded-md px-4 py-2 text-sm font-semibold text-slate-600 transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            <Filter className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* TABLE */}
        <TabsContent value="table" className="mt-0">

          <Card className="border border-slate-200 rounded-xl shadow-sm overflow-hidden bg-white">

            {/* TABLE HEADER */}
            <div className="border-b border-slate-200 bg-white px-6 py-5">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">

                {/* TITLE */}
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                    Data Table
                  </h2>

                  <p className="text-sm text-slate-500 mt-1">
                    Monitoring seluruh data stock secara realtime
                  </p>
                </div>

                {/* FILTER */}
                <div className="flex flex-wrap gap-2">

                  {/* SEARCH */}
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />

                    <Input
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Cari barang, locator..."
                      className="pl-9 w-[280px] h-10 text-sm rounded-lg border-slate-200 bg-white"
                    />
                  </div>

                  {/* CABANG */}
                  {cabangList.length > 0 && (
                    <Select
                      value={selectedCabang}
                      onValueChange={(val) => {
                        setSelectedCabang(val);
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[180px] h-10 text-sm rounded-lg border-slate-200 bg-white">
                        <SelectValue placeholder="Semua Cabang" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="all">
                          Semua Cabang
                        </SelectItem>

                        {cabangList.map((cabang) => (
                          <SelectItem
                            key={cabang}
                            value={cabang}
                          >
                            {cabang}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* PAGE */}
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(val) => {
                      setPageSize(Number(val));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[110px] h-10 text-sm rounded-lg border-slate-200 bg-white">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="10">10 / page</SelectItem>
                      <SelectItem value="20">20 / page</SelectItem>
                      <SelectItem value="50">50 / page</SelectItem>
                      <SelectItem value="100">100 / page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* TABLE */}
            <div className="overflow-auto border-t border-slate-200">

              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="border-slate-200 hover:bg-transparent">
                    {visibleColumns.map((col) => (
                      <TableHead
                        key={col}
                        onClick={() => handleSort(col)}
                        className="h-10 text-xs font-semibold text-slate-500 uppercase tracking-tight whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                      >
                        <div className="flex items-center gap-1">
                          {col}
                          <span className="flex items-center">
                            {sortConfig?.key === col ? (
                              sortConfig.direction === 'asc' ? (
                                <ChevronUp className="w-3.5 h-3.5 text-slate-700" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-700" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </span>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {paginatedData.map((row, i) => (
                    <TableRow
                      key={i}
                      className="border-slate-200 hover:bg-slate-50/80 transition-colors"
                    >
                      {visibleColumns.map((col) => {
                        const isSelisih =
                          col.toLowerCase().includes("selisih");
                        const value = row[col];

                        return (
                          <TableCell
                            key={col}
                            className={`py-3 text-sm whitespace-nowrap ${
                              isSelisih
                                ? Number(value) < 0
                                  ? "text-red-600 font-medium bg-red-50/50"
                                  : Number(value) > 0
                                  ? "text-emerald-600 font-medium bg-emerald-50/50"
                                  : "text-slate-500"
                                : "text-slate-700 font-medium"
                            }`}
                          >
                            {String(value ?? "-")}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

      {/* ========================= */}
{/* LAPORAN */}
{/* ========================= */}

<TabsContent value="laporan" className="mt-0">
  <Card className="border border-slate-200 rounded-xl shadow-sm overflow-hidden bg-white">

    {/* HEADER */}
    <div className="border-b border-slate-200 bg-white px-6 py-5">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Laporan Stock
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Detail laporan inventory stock
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* SEARCH */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari barang, locator..."
              className="pl-9 w-[280px] h-10 text-sm rounded-lg border-slate-200 bg-white"
            />
          </div>

          {/* CABANG */}
          {cabangList.length > 0 && (
            <Select
              value={selectedCabang}
              onValueChange={(val) => {
                setSelectedCabang(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[180px] h-10 text-sm rounded-lg border-slate-200 bg-white">
                <SelectValue placeholder="Semua Cabang" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">Semua Cabang</SelectItem>
                {cabangList.map((cabang) => (
                  <SelectItem key={cabang} value={cabang}>
                    {cabang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* PAGE */}
          <Select
            value={pageSize.toString()}
            onValueChange={(val) => {
              setPageSize(Number(val));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[110px] h-10 text-sm rounded-lg border-slate-200 bg-white">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="10">10 / page</SelectItem>
              <SelectItem value="20">20 / page</SelectItem>
              <SelectItem value="50">50 / page</SelectItem>
              <SelectItem value="100">100 / page</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={exportToExcel}
            className="h-10 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white shadow-sm ml-2"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Excel
          </Button>
        </div>
      </div>
    </div>

    {/* TABLE */}
    <div className="overflow-auto">
      <Table>
        <TableHeader className="bg-slate-50/80">
          <TableRow className="border-slate-200 hover:bg-transparent">
            {reportColumns.map((col) => (
              <TableHead
                key={col}
                onClick={() => handleSort(col)}
                className="h-10 text-xs font-semibold text-slate-500 uppercase tracking-tight whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors select-none group"
              >
                <div className="flex items-center gap-1">
                  {col}
                  <span className="flex items-center">
                    {sortConfig?.key === col ? (
                      sortConfig.direction === 'asc' ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-700" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-700" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </span>
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {paginatedData.map((row, i) => (
            <TableRow
              key={i}
              className="border-slate-200 hover:bg-slate-50/80 transition-colors"
            >
              {reportColumns.map((col) => {
                const value = row[col];

                const isSelisih =
                  col.toLowerCase().includes("selisih");

                return (
                  <TableCell
                    key={col}
                    className={`py-3 text-sm whitespace-nowrap ${
                      isSelisih
                        ? Number(value) < 0
                          ? "text-red-600 font-medium bg-red-50/50"
                          : Number(value) > 0
                          ? "text-emerald-600 font-medium bg-emerald-50/50"
                          : "text-slate-500"
                        : "text-slate-700 font-medium"
                    }`}
                  >
                    {String(value ?? "-")}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </Card>
</TabsContent>

{/* ========================= */}
{/* ANALYTICS */}
{/* ========================= */}

<TabsContent value="analytics" className="mt-0">
  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

    {/* BAR CHART */}
    <Card className="border border-slate-200 rounded-xl shadow-sm bg-white overflow-hidden">

      <div className="border-b border-slate-200 bg-white px-6 py-5">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          Top Selisih Stock
        </h2>

        <p className="text-sm text-slate-500 mt-1">
          Item dengan selisih terbesar
        </p>
      </div>

      <CardContent className="h-[420px] p-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={analyticsData}
            layout="vertical"
            margin={{
              top: 10,
              right: 20,
              left: 20,
              bottom: 10,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e2e8f0"
            />

            <XAxis type="number" />

            <YAxis
              type="category"
              dataKey="name"
              width={150}
              tick={{
                fill: "#475569",
                fontSize: 12,
              }}
            />

            <Tooltip />

            <Bar
              dataKey="value"
              radius={[0, 10, 10, 0]}
            >
              {analyticsData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={
                    entry.value < 0
                      ? "#ef4444"
                      : "#10b981"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>

    {/* PIE CHART */}
    <Card className="border border-slate-200 rounded-xl shadow-sm bg-white overflow-hidden">

      <div className="border-b border-slate-200 bg-white px-6 py-5">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          Proporsi Stock
        </h2>

        <p className="text-sm text-slate-500 mt-1">
          Distribusi stock plus, minus, dan balanced
        </p>
      </div>

      <CardContent className="h-[420px] p-6">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              innerRadius={80}
              outerRadius={120}
              paddingAngle={4}
            >
              <Cell fill="#10b981" />
              <Cell fill="#ef4444" />
              <Cell fill="#3b82f6" />
            </Pie>

            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  </div>
</TabsContent>
      </Tabs>

      {/* PAGINATION */}
      <div className="mt-4 bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">

        <div className="text-sm text-slate-500 font-medium">
          Menampilkan{" "}
          <span className="font-bold text-slate-900">
            {paginatedData.length}
          </span>{" "}
          dari{" "}
          <span className="font-bold text-slate-900">
            {filteredData.length}
          </span>{" "}
          data
        </div>

        <div className="flex items-center gap-2">

          <Button
            variant="outline"
            size="icon"
            className="rounded-lg h-9 w-9 border-slate-200 shadow-sm"
            disabled={currentPage === 1}
            onClick={() =>
              setCurrentPage((p) => Math.max(1, p - 1))
            }
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="px-4 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-900 text-sm font-semibold shadow-sm">
            {currentPage} / {totalPages}
          </div>

          <Button
            variant="outline"
            size="icon"
            className="rounded-lg h-9 w-9 border-slate-200 shadow-sm"
            disabled={currentPage >= totalPages}
            onClick={() =>
              setCurrentPage((p) =>
                Math.min(totalPages, p + 1)
              )
            }
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </main>

    {/* AI MODAL */}
    {showAiModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
          
          {/* MODAL HEADER */}
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Bot className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">AI Inventory Analyst</h3>
                <p className="text-xs text-slate-500 font-medium">Berdasarkan data stock realtime</p>
              </div>
            </div>
            <button
              onClick={() => setShowAiModal(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* MODAL BODY */}
          <div className="flex-1 overflow-auto p-6 bg-slate-50/30">
            {/* INSTRUCTIONS */}
            <div className="mb-6 bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 flex gap-3">
              <MessageSquare className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div className="text-sm text-indigo-900 w-full">
                <p className="font-semibold mb-1">Mode Analisis (Opsi Hemat Token AI)</p>
                <div className="flex flex-col gap-2 mb-4 mt-2">
                  <label className="flex items-start gap-3 cursor-pointer p-2 rounded-lg hover:bg-indigo-100/50 border border-transparent hover:border-indigo-200 transition-all">
                    <input type="radio" className="mt-1 accent-indigo-600" name="aiMode" value="summary" checked={aiMode === "summary"} onChange={() => setAiMode("summary")} />
                    <div>
                      <span className="font-semibold block">Ringkasan Eksekutif (Sangat Hemat Token)</span>
                      <span className="text-xs opacity-80">Hanya mengirim metrics dan top items selisih tanpa data mentah.</span>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer p-2 rounded-lg hover:bg-indigo-100/50 border border-transparent hover:border-indigo-200 transition-all">
                    <input type="radio" className="mt-1 accent-indigo-600" name="aiMode" value="discrepancy" checked={aiMode === "discrepancy"} onChange={() => setAiMode("discrepancy")} />
                    <div>
                      <span className="font-semibold block">Fokus Data Selisih</span>
                      <span className="text-xs opacity-80">Hanya mengirim list item yang mengalami selisih (maks 50 items).</span>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer p-2 rounded-lg hover:bg-indigo-100/50 border border-transparent hover:border-indigo-200 transition-all">
                    <input type="radio" className="mt-1 accent-indigo-600" name="aiMode" value="all" checked={aiMode === "all"} onChange={() => setAiMode("all")} />
                    <div>
                      <span className="font-semibold block">Semua Data Filtered</span>
                      <span className="text-xs opacity-80">Mengirim seluruh data stock berdasar filter (maks 50 items).</span>
                    </div>
                  </label>
                </div>
                <p className="font-semibold mb-1 mt-2 border-t border-indigo-200/50 pt-3">Tanyakan soal permasalahan stock</p>
                <p className="text-indigo-700">Contoh: "Item apa yang memiliki selisih terbesar?", "Berikan rekomendasi perbaikan atas data ini."</p>
              </div>
            </div>

            {/* RESPONSE */}
            {aiResponse && (
              <div className="bg-white border text-sm text-slate-700 border-slate-200 rounded-xl p-5 shadow-sm whitespace-pre-wrap leading-relaxed">
                {aiResponse}
              </div>
            )}
            
            {/* LOADING */}
            {aiGenerating && (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
                <p className="text-sm font-medium text-slate-500">Menganalisis data...</p>
              </div>
            )}
          </div>

          {/* MODAL FOOTER */}
          <div className="p-4 border-t border-slate-200 bg-white">
            <div className="flex gap-3">
              <Input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Tulis pertanyaan Anda di sini..."
                className="flex-1 rounded-xl h-12"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAskAI();
                }}
              />
              <Button
                onClick={handleAskAI}
                disabled={aiGenerating}
                className="h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              >
                {aiGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                ASK AI
              </Button>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
);
}