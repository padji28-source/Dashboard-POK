import React, { useEffect, useState, useMemo } from 'react';
import { fetchCSVData, CSVData } from '@/src/lib/csvService';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select as ShadcnSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  AlertCircle,
  Database,
  ArrowLeft,
  Loader2,
  FileSpreadsheet
} from 'lucide-react';

import * as XLSX from 'xlsx';
import Select from 'react-select';

interface DataAllProps {
  onBack: () => void;
  csvUrl: string;
}

export default function DataAll({ onBack, csvUrl }: DataAllProps) {
  const [data, setData] = useState<CSVData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [whGroupFilter, setWhGroupFilter] = useState<string[]>([]);
  const [areaFilter, setAreaFilter] = useState<string[]>([]);
  const [locatorFilter, setLocatorFilter] = useState<string[]>([]);

  // Search input terms for the multi-select dropdowns
  const [whGroupSearch, setWhGroupSearch] = useState('');
  const [areaSearch, setAreaSearch] = useState('');
  const [locatorSearch, setLocatorSearch] = useState('');

  // Sorting
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [columns, setColumns] = useState<string[]>([]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // range 2 to skip the first two title rows
      const result = await fetchCSVData(csvUrl, 'MTS2', 2);

      const filteredResult = result.filter(
        (row) => {
          const values = Object.values(row);
          if (values.every((v) => v === null || v === undefined || v === '')) {
            return false;
          }
          // Remove sub totals if any
          return !values.some((val) => {
            const s = String(val).toLowerCase().trim();
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
      if (filteredResult.length > 0) {
        const allKeys = Object.keys(filteredResult[0]);
        const targetCols = ['WH Group', 'WH Type', 'Area', 'Locator', 'Name', 'UOM', 'Last Qty'];
        
        const exactCols = targetCols.map(tc => {
            const found = allKeys.find(k => k.toLowerCase().replace(/\n/g, ' ') === tc.toLowerCase() || k.toLowerCase().replace(/\n/g, ' ').includes(tc.toLowerCase()));
            return found || tc;
        });

        // Filter out any that were not found (though they all should be if names are correct)
        setColumns(exactCols);
      }

      toast.success('MTS2 Data loaded successfully');
    } catch (err) {
      console.error(err);
      setError('Failed to fetch MTS2 data.');
      toast.error('Failed to load MTS2 data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [csvUrl]);

  // Derive unique options for filters
  const filterOptions = useMemo(() => {
    const whGroups = new Set<string>();
    const areas = new Set<string>();
    const locators = new Set<string>();

    // Helper to find actual column name safely
    const getCol = (search: string) => columns.find(c => c.toLowerCase().includes(search.toLowerCase())) || search;
    const whCol = getCol('wh group');
    const areaCol = getCol('area');
    const locCol = getCol('locator');

    data.forEach((row) => {
      if (row[whCol]) whGroups.add(String(row[whCol]).trim());
      if (row[areaCol]) areas.add(String(row[areaCol]).trim());
      if (row[locCol]) locators.add(String(row[locCol]).trim());
    });

    return {
      whGroups: Array.from(whGroups).filter(Boolean).sort(),
      areas: Array.from(areas).filter(Boolean).sort(),
      locators: Array.from(locators).filter(Boolean).sort(),
      whCol, areaCol, locCol
    };
  }, [data, columns]);

  const exportToExcel = () => {
    try {
      if (filteredData.length === 0) {
        toast.error('Tidak ada data untuk diexport');
        return;
      }

      const exportRows = filteredData.map((row) => {
        const obj: any = {};
        columns.forEach((col) => {
          obj[col] = row[col];
        });
        return obj;
      });

      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data All MTS2');

      XLSX.writeFile(workbook, 'Data_All_MTS2.xlsx');
      toast.success('Excel berhasil didownload');
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengunduh Excel');
    }
  };

  // WH Group custom option list and change handler
  const whGroupOptions = useMemo(() => {
    const baseOptions = filterOptions.whGroups.map(g => ({ value: g, label: g }));
    if (whGroupSearch.trim()) {
      const searchLower = whGroupSearch.toLowerCase();
      const matching = baseOptions.filter(o => o.label.toLowerCase().includes(searchLower));
      if (matching.length > 1) {
        return [
          { value: '__SELECT_ALL_MATCHING__', label: `✨ Pilih Semua Hasil Cocok "${whGroupSearch}" (${matching.length} item)` },
          ...baseOptions
        ];
      }
    }
    return baseOptions;
  }, [filterOptions.whGroups, whGroupSearch]);

  const handleWhGroupChange = (selected: any) => {
    if (selected && selected.some((s: any) => s.value === '__SELECT_ALL_MATCHING__')) {
      const searchLower = whGroupSearch.toLowerCase();
      const matching = filterOptions.whGroups.filter(g => g.toLowerCase().includes(searchLower));
      const combined = Array.from(new Set([...whGroupFilter, ...matching]));
      setWhGroupFilter(combined);
      setWhGroupSearch('');
    } else {
      setWhGroupFilter(selected ? selected.map((s: any) => s.value) : []);
    }
    setCurrentPage(1);
  };

  // Area custom option list and change handler
  const areaOptions = useMemo(() => {
    const baseOptions = filterOptions.areas.map(g => ({ value: g, label: g }));
    if (areaSearch.trim()) {
      const searchLower = areaSearch.toLowerCase();
      const matching = baseOptions.filter(o => o.label.toLowerCase().includes(searchLower));
      if (matching.length > 1) {
        return [
          { value: '__SELECT_ALL_MATCHING__', label: `✨ Pilih Semua Hasil Cocok "${areaSearch}" (${matching.length} item)` },
          ...baseOptions
        ];
      }
    }
    return baseOptions;
  }, [filterOptions.areas, areaSearch]);

  const handleAreaChange = (selected: any) => {
    if (selected && selected.some((s: any) => s.value === '__SELECT_ALL_MATCHING__')) {
      const searchLower = areaSearch.toLowerCase();
      const matching = filterOptions.areas.filter(g => g.toLowerCase().includes(searchLower));
      const combined = Array.from(new Set([...areaFilter, ...matching]));
      setAreaFilter(combined);
      setAreaSearch('');
    } else {
      setAreaFilter(selected ? selected.map((s: any) => s.value) : []);
    }
    setCurrentPage(1);
  };

  // Locator custom option list and change handler
  const locatorOptions = useMemo(() => {
    const baseOptions = filterOptions.locators.map(g => ({ value: g, label: g }));
    if (locatorSearch.trim()) {
      const searchLower = locatorSearch.toLowerCase();
      const matching = baseOptions.filter(o => o.label.toLowerCase().includes(searchLower));
      if (matching.length > 1) {
        return [
          { value: '__SELECT_ALL_MATCHING__', label: `✨ Pilih Semua Hasil Cocok "${locatorSearch}" (${matching.length} item)` },
          ...baseOptions
        ];
      }
    }
    return baseOptions;
  }, [filterOptions.locators, locatorSearch]);

  const handleLocatorChange = (selected: any) => {
    if (selected && selected.some((s: any) => s.value === '__SELECT_ALL_MATCHING__')) {
      const searchLower = locatorSearch.toLowerCase();
      const matching = filterOptions.locators.filter(g => g.toLowerCase().includes(searchLower));
      const combined = Array.from(new Set([...locatorFilter, ...matching]));
      setLocatorFilter(combined);
      setLocatorSearch('');
    } else {
      setLocatorFilter(selected ? selected.map((s: any) => s.value) : []);
    }
    setCurrentPage(1);
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const filteredData = useMemo(() => {
    let result = data;

    // Filters
    if (whGroupFilter.length > 0 && filterOptions.whCol) {
      result = result.filter(r => whGroupFilter.includes(String(r[filterOptions.whCol] || '').trim()));
    }
    if (areaFilter.length > 0 && filterOptions.areaCol) {
      result = result.filter(r => areaFilter.includes(String(r[filterOptions.areaCol] || '').trim()));
    }
    if (locatorFilter.length > 0 && filterOptions.locCol) {
      result = result.filter(r => locatorFilter.includes(String(r[filterOptions.locCol] || '').trim()));
    }

    // Search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((val) =>
          String(val).toLowerCase().includes(lowerSearch)
        )
      );
    }

    // Sort
    if (sortConfig !== null) {
      result = [...result].sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];

        if (valA === valB) return 0;

        // Try numeric
        const numA = Number(String(valA).replace(/,/g, ''));
        const numB = Number(String(valB).replace(/,/g, ''));

        if (!isNaN(numA) && !isNaN(numB) && valA !== null && valA !== undefined && valA !== "" && valB !== null && valB !== undefined && valB !== "") {
          return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
        }

        const strA = String(valA ?? '').toLowerCase();
        const strB = String(valB ?? '').toLowerCase();

        if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchTerm, whGroupFilter, areaFilter, locatorFilter, filterOptions, sortConfig]);

  // Calculate Totals
  const totals = useMemo(() => {
    // Total SKU can just be row count, or unique SKU (Search Key / Name) count
    // The requirement says "Header menampilkan Total SKU dan Total QTY"
    // I'll define Total SKU as the count of filtered items
    const totalSKU = filteredData.length;
    
    // Total Qty is sum of 'Last Qty' probably. or maybe we should use column name that includes "last qty"
    // Just looking for "qty" and maybe "last"
    const lastQtyCol = columns.find(c => c.toLowerCase().includes('last qty')) || '';
    
    let totalQty = 0;
    if (lastQtyCol) {
      totalQty = filteredData.reduce((acc, row) => {
        const val = Number(String(row[lastQtyCol] || 0).replace(/,/g, ''));
        return acc + (isNaN(val) ? 0 : val);
      }, 0);
    }

    return { totalSKU, totalQty };
  }, [filteredData, columns]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Loading Data All (MTS2)...</h2>
        <p className="text-slate-500 text-sm mt-2">Fetching comprehensive dataset, this might take a moment.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Card className="w-[400px]">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
            <h2 className="font-bold text-lg mb-2">Error</h2>
            <p className="text-slate-500 mb-4">{error}</p>
            <Button onClick={loadData}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      {/* HEADER TOP ROW */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="px-6 py-4 flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-slate-100 rounded-full h-10 w-10">
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </Button>
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Data All (MTS2)
              </h1>
              <p className="text-sm text-slate-500 font-medium">
                Comprehensive Master Data Viewer
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">Total SKU Focus</p>
              <p className="text-xl font-bold text-slate-900 leading-none mt-1">{totals.totalSKU.toLocaleString()}</p>
            </div>
            <div className="h-10 border-l border-slate-200"></div>
            <div className="flex flex-col items-end mr-4">
              <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">Total QTY Focus</p>
              <p className="text-xl font-bold text-emerald-600 leading-none mt-1">{totals.totalQty.toLocaleString()}</p>
            </div>
            <Button onClick={exportToExcel} className="h-10 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-medium transition-all">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Download Excel
            </Button>
            <Button onClick={loadData} variant="outline" className="h-10 px-4 rounded-lg bg-white shadow-sm border-slate-200 text-slate-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {/* FILTER & DATA BODY */}
      <main className="flex-1 px-6 py-6 overflow-hidden flex flex-col">
        <Card className="border border-slate-200 rounded-xl shadow-sm bg-white flex flex-col flex-1 h-full overflow-hidden">
          
          {/* CONTROL BAR */}
          <div className="border-b border-slate-200 bg-white px-6 py-5 shrink-0">
            <div className="flex flex-col xl:flex-row gap-4">
              
              {/* SEARCH */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  placeholder="Universal search (name, locator, type, etc)..."
                  className="pl-9 h-10 text-sm rounded-lg border-slate-200 bg-white w-full"
                />
              </div>

              {/* WH GROUP */}
              {filterOptions.whGroups.length > 0 && (
                <div className="min-w-[250px] flex-1 max-w-sm z-20 relative">
                  <Select
                    isMulti
                    options={whGroupOptions}
                    value={whGroupFilter.map(g => ({ value: g, label: g }))}
                    onChange={handleWhGroupChange}
                    inputValue={whGroupSearch}
                    onInputChange={(val) => setWhGroupSearch(val)}
                    className="text-sm"
                    classNamePrefix="rs"
                    placeholder="Semua WH Group..."
                    styles={{ control: (base) => ({ ...base, minHeight: '40px', borderRadius: '0.5rem', borderColor: '#e2e8f0' }) }}
                  />
                </div>
              )}

              {/* AREA */}
              {filterOptions.areas.length > 0 && (
                <div className="min-w-[200px] flex-1 max-w-sm z-20 relative">
                  <Select
                    isMulti
                    options={areaOptions}
                    value={areaFilter.map(g => ({ value: g, label: g }))}
                    onChange={handleAreaChange}
                    inputValue={areaSearch}
                    onInputChange={(val) => setAreaSearch(val)}
                    className="text-sm"
                    classNamePrefix="rs"
                    placeholder="Semua Area..."
                    styles={{ control: (base) => ({ ...base, minHeight: '40px', borderRadius: '0.5rem', borderColor: '#e2e8f0' }) }}
                  />
                </div>
              )}

              {/* LOCATOR */}
              {filterOptions.locators.length > 0 && (
                <div className="min-w-[250px] flex-1 max-w-sm z-20 relative">
                  <Select
                    isMulti
                    options={locatorOptions}
                    value={locatorFilter.map(g => ({ value: g, label: g }))}
                    onChange={handleLocatorChange}
                    inputValue={locatorSearch}
                    onInputChange={(val) => setLocatorSearch(val)}
                    className="text-sm"
                    classNamePrefix="rs"
                    placeholder="Semua Locator..."
                    styles={{ control: (base) => ({ ...base, minHeight: '40px', borderRadius: '0.5rem', borderColor: '#e2e8f0' }) }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* TABLE CONTAINER */}
          <div className="flex-1 overflow-auto bg-white min-h-[400px]">
             <Table>
                <TableHeader className="bg-slate-50/90 sticky top-0 z-10 shadow-sm">
                  <TableRow className="border-slate-200 hover:bg-transparent">
                    {columns.map((col) => (
                      <TableHead
                        key={col}
                        onClick={() => handleSort(col)}
                        className="h-10 text-xs font-semibold text-slate-600 uppercase tracking-tight whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors select-none group px-4 py-3"
                      >
                        <div className="flex items-center gap-1.5">
                          {col}
                          <span className="flex items-center">
                            {sortConfig?.key === col ? (
                              sortConfig.direction === 'asc' ? (
                                <ChevronUp className="w-3.5 h-3.5 text-indigo-600" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
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
                      className="border-slate-100 hover:bg-slate-50/80 transition-colors"
                    >
                      {columns.map((col) => {
                        const val = row[col];
                        return (
                          <TableCell key={col} className="py-2.5 px-4 text-sm text-slate-700 whitespace-nowrap">
                            {String(val ?? '-')}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                  {paginatedData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-32 text-center text-slate-500 font-medium">
                        Tidak ada data yang cocok dengan filter / pencarian.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
             </Table>
          </div>

          {/* PAGINATION FOOTER */}
          <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4 text-sm text-slate-600 font-medium">
              <div className="flex items-center gap-2">
                <span>View</span>
                <ShadcnSelect value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[80px] h-8 text-sm rounded bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </ShadcnSelect>
                <span>/ page</span>
              </div>
              <div className="h-4 border-l border-slate-300"></div>
              <span>Menampilkan <strong className="text-slate-900">{paginatedData.length}</strong> dari <strong className="text-slate-900">{filteredData.length}</strong></span>
            </div>

            <div className="flex items-center gap-2">
               <Button
                  variant="outline"
                  size="icon"
                  className="rounded-lg h-8 w-8 bg-white border-slate-200"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
               >
                 <ChevronLeft className="w-4 h-4" />
               </Button>
               <div className="px-4 py-1 rounded-md bg-white border border-slate-200 text-slate-900 text-sm font-semibold">
                  {currentPage} / {totalPages || 1}
               </div>
               <Button
                  variant="outline"
                  size="icon"
                  className="rounded-lg h-8 w-8 bg-white border-slate-200"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
               >
                 <ChevronRight className="w-4 h-4" />
               </Button>
            </div>
          </div>

        </Card>
      </main>
    </div>
  );
}
