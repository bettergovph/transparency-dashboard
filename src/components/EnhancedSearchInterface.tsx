import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "@dr.pogodin/react-helmet";
import {
  Search,
  Filter,
  FileText,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  X,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Autocomplete } from "@/components/ui/autocomplete";
import type { AutocompleteOption } from "@/components/ui/autocomplete";
import {
  searchDocuments,
  searchFilterOptions,
  filterIndices,
} from "@/lib/meilisearch";
import type { SearchDocument } from "@/types/search";
import SearchGuide from "./SearchGuide";
import Navigation from "./Navigation";
import Footer from "./Footer";
import { toSlug } from "@/lib/utils";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface EnhancedSearchInterfaceProps {
  filterType?: "awardee" | "organization" | "location" | "category";
  filterValue?: string;
  enableDeduplication?: boolean;
  limit?: number;
}

const EnhancedSearchInterface: React.FC<EnhancedSearchInterfaceProps> = ({
  filterType,
  filterValue,
  enableDeduplication = true,
  limit = 1000,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy] = useState<"date" | "amount" | "relevance">("relevance");
  const [resultsPerPage, setResultsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [tableSortField, setTableSortField] = useState<
    keyof SearchDocument | null
  >(null);
  const [tableSortDirection, setTableSortDirection] = useState<"asc" | "desc">(
    "asc",
  );
  const [strictMatch, setStrictMatch] = useState(false);
  const [showSearchGuide, setShowSearchGuide] = useState(false);
  const [, setDebugInfo] = useState<{
    query: string;
    filter?: string;
    sort?: string[];
    limit?: number;
  } | null>(null);
  const [precomputedStats, setPrecomputedStats] = useState<{
    count: number;
    total: number;
  } | null>(null);
  const [userDeduplication, setUserDeduplication] =
    useState(enableDeduplication);

  // Autocomplete filter states - now arrays for multi-select
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [selectedAwardees, setSelectedAwardees] = useState<string[]>([]);
  const [selectedOrganizations, setSelectedOrganizations] = useState<string[]>(
    [],
  );

  // Fetch precomputed stats for categories, locations, and organizations
  useEffect(() => {
    const fetchPrecomputedStats = async () => {
      if (!filterType || !filterValue) return;
      if (
        filterType !== "category" &&
        filterType !== "location" &&
        filterType !== "organization"
      )
        return;

      try {
        let index;

        if (filterType === "category") {
          index = filterIndices.business_categories;
        } else if (filterType === "location") {
          index = filterIndices.area;
        } else if (filterType === "organization") {
          index = filterIndices.organizations;
        }

        if (!index) return;

        // Search for the specific category/location/organization using query (not filter)
        // The filterValue is already the name
        const cleanValue = filterValue.replace(/^'|'$/g, ""); // Remove quotes if present
        const result = await index.search(cleanValue, {
          limit: 1,
          attributesToRetrieve: ["count", "total"],
        });

        if (result.hits.length > 0) {
          const hit: any = result.hits[0];
          setPrecomputedStats({
            count: hit.count || 0,
            total: hit.total || 0,
          });
        }
      } catch (error) {
        console.error("Error fetching precomputed stats:", error);
      }
    };

    fetchPrecomputedStats();
  }, [filterType, filterValue]);
  useEffect(() => {
    if (filterType && filterValue) {
      switch (filterType) {
        case "awardee":
          setSelectedAwardees([filterValue]);
          break;
        case "organization":
          setSelectedOrganizations([filterValue]);
          break;
        case "location":
          setSelectedAreas([filterValue]);
          break;
        case "category":
          setSelectedCategory(filterValue);
          break;
      }
    }
  }, [filterType, filterValue]);

  // Autocomplete options states
  const [areaOptions, setAreaOptions] = useState<AutocompleteOption[]>([]);
  const [awardeeOptions, setAwardeeOptions] = useState<AutocompleteOption[]>(
    [],
  );
  const [organizationOptions, setOrganizationOptions] = useState<
    AutocompleteOption[]
  >([]);

  // Autocomplete loading states
  const [areaLoading, setAreaLoading] = useState(false);
  const [awardeeLoading, setAwardeeLoading] = useState(false);
  const [organizationLoading, setOrganizationLoading] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      // Trigger search if there's a query OR if there are active filters
      if (
        query.trim() ||
        selectedAreas.length > 0 ||
        selectedAwardees.length > 0 ||
        selectedOrganizations.length > 0 ||
        selectedCategory !== "all"
      ) {
        performSearch();
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [
    query,
    selectedCategory,
    sortBy,
    strictMatch,
    selectedAreas,
    selectedAwardees,
    selectedOrganizations,
    userDeduplication,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, selectedCategory, sortBy, resultsPerPage]);

  // Memoized autocomplete search handlers
  const handleAreaSearch = useCallback(async (query: string) => {
    setAreaLoading(true);
    try {
      const options = await searchFilterOptions("area", query);
      setAreaOptions(options);
    } finally {
      setAreaLoading(false);
    }
  }, []);

  const handleAwardeeSearch = useCallback(async (query: string) => {
    setAwardeeLoading(true);
    try {
      const options = await searchFilterOptions("awardee", query);
      setAwardeeOptions(options);
    } finally {
      setAwardeeLoading(false);
    }
  }, []);

  const handleOrganizationSearch = useCallback(async (query: string) => {
    setOrganizationLoading(true);
    try {
      const options = await searchFilterOptions("organizations", query);
      setOrganizationOptions(options);
    } finally {
      setOrganizationLoading(false);
    }
  }, []);

  const performSearch = async () => {
    setLoading(true);

    // Parse the query to extract field-specific searches and build filters
    const { searchQuery, filters } = parseSearchQuery(
      query,
      strictMatch,
      selectedCategory,
    );

    const sortParam =
      sortBy === "date"
        ? ["award_date:desc"]
        : sortBy === "amount"
          ? ["contract_amount:desc"]
          : undefined;

    // Set debug info BEFORE the search (so it persists even on error)
    setDebugInfo({
      query: searchQuery || "*", // Use wildcard if no query
      filter: filters,
      sort: sortParam,
      limit: limit,
    });

    try {
      const searchResults = await searchDocuments({
        query: searchQuery || "", // Empty query returns all results
        filter: filters,
        sort: sortParam,
        limit: limit, // Use configurable limit
      });

      // Conditionally deduplicate results based on user preference
      const processedResults = userDeduplication
        ? deduplicateResults(searchResults.hits)
        : searchResults.hits;
      setResults(processedResults);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
      // Don't clear debugInfo on error - keep it visible for debugging
    } finally {
      setLoading(false);
    }
  };

  // Parse search query and convert to MeiliSearch format
  const parseSearchQuery = (
    inputQuery: string,
    isStrict: boolean,
    category: string,
  ) => {
    let searchQuery = inputQuery.trim();
    const filterParts: string[] = [];

    // Add category filter if selected
    if (category !== "all") {
      filterParts.push(`business_category = "${category}"`);
    }

    // Add autocomplete filters with OR logic for multiple selections
    if (selectedAreas.length > 0) {
      const areaFilters = selectedAreas
        .map((area) => `area_of_delivery = "${area}"`)
        .join(" OR ");
      filterParts.push(`(${areaFilters})`);
    }
    if (selectedAwardees.length > 0) {
      const awardeeFilters = selectedAwardees
        .map((awardee) => `awardee_name = "${awardee}"`)
        .join(" OR ");
      filterParts.push(`(${awardeeFilters})`);
    }
    if (selectedOrganizations.length > 0) {
      const orgFilters = selectedOrganizations
        .map((org) => `organization_name = "${org}"`)
        .join(" OR ");
      filterParts.push(`(${orgFilters})`);
    }

    // Extract field-specific searches (e.g., awardee:"ABC Corp")
    const fieldPatterns = [
      { pattern: /awardee:(?:"([^"]+)"|([^\s]+))/gi, field: "awardee_name" },
      {
        pattern: /organization:(?:"([^"]+)"|([^\s]+))/gi,
        field: "organization_name",
      },
      { pattern: /contract:(?:"([^"]+)"|([^\s]+))/gi, field: "contract_no" },
      { pattern: /reference:(?:"([^"]+)"|([^\s]+))/gi, field: "reference_id" },
      { pattern: /title:(?:"([^"]+)"|([^\s]+))/gi, field: "award_title" },
      {
        pattern: /category:(?:"([^"]+)"|([^\s]+))/gi,
        field: "business_category",
      },
      { pattern: /status:(?:"([^"]+)"|([^\s]+))/gi, field: "award_status" },
    ];

    fieldPatterns.forEach(({ pattern, field }) => {
      const matches = [...searchQuery.matchAll(pattern)];
      matches.forEach((match) => {
        const value = match[1] || match[2]; // quoted or unquoted value
        filterParts.push(`${field} = "${value}"`);
        // Remove the field-specific part from the search query
        searchQuery = searchQuery.replace(match[0], "").trim();
      });
    });

    // Handle AND/OR operators in remaining query
    // MeiliSearch doesn't support AND/OR in query, so we keep them in the search string
    // The search engine will find documents containing those terms
    // For proper AND/OR logic, users should use field-specific filters

    // Clean up the search query
    searchQuery = searchQuery.replace(/\s+/g, " ").trim();

    // Apply strict matching if enabled and no field-specific searches
    if (isStrict && searchQuery && !searchQuery.includes('"')) {
      searchQuery = `"${searchQuery}"`;
    }

    // Combine filters with AND logic
    const finalFilter =
      filterParts.length > 0 ? filterParts.join(" AND ") : undefined;

    return { searchQuery, filters: finalFilter };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Deduplicate results based on contract_amount, awardee_name, award_title, and contract_no
  const deduplicateResults = (results: SearchDocument[]): SearchDocument[] => {
    const seen = new Map<string, SearchDocument>();

    results.forEach((doc) => {
      // Create a unique key based on the duplicate conditions
      const key =
        `${doc.contract_amount}_${doc.awardee_name}_${doc.award_title}_${doc.contract_no}`.toLowerCase();

      // Keep the first occurrence of each unique combination
      if (!seen.has(key)) {
        seen.set(key, doc);
      }
    });

    return Array.from(seen.values());
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "awarded":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(results.length / resultsPerPage);
  const startIndex = (currentPage - 1) * resultsPerPage;
  const endIndex = startIndex + resultsPerPage;

  // Apply table sorting if active
  const sortedResults = tableSortField
    ? [...results].sort((a, b) => {
        const aValue = a[tableSortField];
        const bValue = b[tableSortField];

        // Special handling for contract_amount to ensure numeric sorting
        if (tableSortField === "contract_amount") {
          const aNum = parseFloat(String(aValue || 0));
          const bNum = parseFloat(String(bValue || 0));
          return tableSortDirection === "asc" ? aNum - bNum : bNum - aNum;
        }

        if (typeof aValue === "number" && typeof bValue === "number") {
          return tableSortDirection === "asc"
            ? aValue - bValue
            : bValue - aValue;
        }

        const aString = String(aValue || "").toLowerCase();
        const bString = String(bValue || "").toLowerCase();

        if (tableSortDirection === "asc") {
          return aString.localeCompare(bString);
        } else {
          return bString.localeCompare(aString);
        }
      })
    : results;

  const paginatedResults = sortedResults.slice(startIndex, endIndex);

  const totalContractAmount = precomputedStats
    ? precomputedStats.total
    : results.reduce((sum, doc) => {
        const amount = parseFloat(String(doc.contract_amount || 0));
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);

  const totalContractCount = precomputedStats
    ? precomputedStats.count
    : results.length;

  // Detailed statistics for detail pages
  const detailedStats = useMemo(() => {
    if (!filterType || !filterValue) return null;

    // Unique business categories
    const uniqueCategories = new Set(
      results.map((doc) => doc.business_category).filter(Boolean),
    );

    // Calculate annual totals
    const yearlyData: Record<string, number> = {};
    const monthlyData: Record<string, number> = {};

    results.forEach((doc) => {
      const amount = parseFloat(String(doc.contract_amount || 0));
      if (isNaN(amount)) return;

      const date = new Date(doc.award_date);
      const year = date.getFullYear();
      const monthKey = `${year}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      yearlyData[year] = (yearlyData[year] || 0) + amount;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + amount;
    });

    // Format monthly data for chart
    const monthlyChartData = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({
        month,
        amount,
        displayMonth: new Date(month + "-01").toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
        }),
      }));

    // Calculate top partners
    let topPartners: Array<{ name: string; amount: number; count: number }> =
      [];
    if (filterType === "organization") {
      // For organizations, show top awardees
      const awardeeStats: Record<string, { amount: number; count: number }> =
        {};
      results.forEach((doc) => {
        const amount = parseFloat(String(doc.contract_amount || 0));
        if (isNaN(amount)) return;
        if (!awardeeStats[doc.awardee_name]) {
          awardeeStats[doc.awardee_name] = { amount: 0, count: 0 };
        }
        awardeeStats[doc.awardee_name].amount += amount;
        awardeeStats[doc.awardee_name].count += 1;
      });
      topPartners = Object.entries(awardeeStats)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);
    } else if (filterType === "awardee") {
      // For awardees, show top organizations
      const orgStats: Record<string, { amount: number; count: number }> = {};
      results.forEach((doc) => {
        const amount = parseFloat(String(doc.contract_amount || 0));
        if (isNaN(amount)) return;
        if (!orgStats[doc.organization_name]) {
          orgStats[doc.organization_name] = { amount: 0, count: 0 };
        }
        orgStats[doc.organization_name].amount += amount;
        orgStats[doc.organization_name].count += 1;
      });
      topPartners = Object.entries(orgStats)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);
    }

    const averageCost =
      totalContractCount > 0 ? totalContractAmount / totalContractCount : 0;

    return {
      uniqueCategories: uniqueCategories.size,
      annualCost: Object.values(yearlyData).reduce((sum, val) => sum + val, 0),
      averageCost,
      monthlyChartData,
      topPartners,
      yearlyData: Object.entries(yearlyData)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([year, amount]) => ({ year, amount })),
    };
  }, [results, filterType, filterValue, totalContractAmount]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleTableSort = (field: keyof SearchDocument) => {
    if (tableSortField === field) {
      setTableSortDirection(tableSortDirection === "asc" ? "desc" : "asc");
    } else {
      setTableSortField(field);
      setTableSortDirection("asc");
    }
  };

  const getSortIcon = (field: keyof SearchDocument) => {
    if (tableSortField !== field) return null;
    return tableSortDirection === "asc" ? " ↑" : " ↓";
  };

  const downloadCSV = () => {
    // Prepare CSV headers
    const headers = [
      "Reference ID",
      "Contract No",
      "Award Title",
      "Awardee",
      "Organization",
      "Contract Amount",
      "Award Date",
      "Status",
      "Business Category",
      "Area of Delivery",
      "Notice Title",
    ];

    // Prepare CSV rows
    const rows = results.map((doc) => [
      doc.reference_id,
      doc.contract_no,
      `"${doc.award_title.replace(/"/g, '""')}"`, // Escape quotes
      `"${doc.awardee_name.replace(/"/g, '""')}"`,
      `"${doc.organization_name.replace(/"/g, '""')}"`,
      doc.contract_amount,
      doc.award_date,
      doc.award_status,
      doc.business_category,
      doc.area_of_delivery,
      doc.notice_title ? `"${doc.notice_title.replace(/"/g, '""')}"` : "",
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `philgeps-search-results-${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="max-w-full min-h-screen from-gray-50 to-white overflow-x-hidden flex flex-col">
      <Helmet>
        <title>
          {filterValue
            ? `${filterValue} - PhilGEPS Contract Browser`
            : "PhilGEPS Contract Browser - Search Government Procurement Records"}
        </title>
        <meta
          name="description"
          content={
            filterValue
              ? `View all government contracts for ${filterValue}. Browse detailed procurement records, contract amounts, and award information from PhilGEPS.`
              : "Search and browse Philippine government procurement records from PhilGEPS. Find contracts, awardees, organizations, and detailed procurement information."
          }
        />
        <meta
          name="keywords"
          content="PhilGEPS, government contracts, procurement, Philippines, contract search, awardees, bidding"
        />
        <meta
          property="og:title"
          content={
            filterValue
              ? `${filterValue} - PhilGEPS Contract Browser`
              : "PhilGEPS Contract Browser"
          }
        />
        <meta
          property="og:description"
          content={
            filterValue
              ? `Government contracts for ${filterValue}`
              : "Search Philippine government procurement records"
          }
        />
        <meta property="og:type" content="website" />
        <link
          rel="canonical"
          href={
            filterValue
              ? `https://philgeps.bettergov.ph/${filterType}s/${toSlug(filterValue)}`
              : "https://philgeps.bettergov.ph/"
          }
        />
      </Helmet>
      {/* Header Section */}
      <Navigation />

      {/* Main Grid Layout */}
      <div className="flex flex-1 overflow-x-hidden">
        {/* Main Content Column */}
        <div
          className={`transition-all duration-300 px-3 sm:px-4 lg:px-6 py-4 ${showSearchGuide ? "w-3/4" : "flex-1 mx-auto"} max-w-full overflow-x-hidden`}
        >
          {/* Search and Filters Section */}
          <div className="bg-white rounded-lg shadow p-2 mb-3 overflow-visible">
            {/* Row 1: Search Bar + Strict Match */}
            <div className="flex items-center gap-2 mb-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <Search className="h-3 w-3 text-gray-400" />
                </div>
                <Input
                  type="text"
                  placeholder="Search by reference ID, contract number, company name, or any keyword..."
                  value={query}
                  autoFocus
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-8! pr-2 py-1.5 text-xs border border-gray-800 rounded focus:border-black focus:ring-1 focus:ring-black"
                  style={{ paddingLeft: "2rem" }}
                />
              </div>
            </div>

            {/* Selected Filter Tags */}
            {(selectedAreas.length > 0 ||
              selectedAwardees.length > 0 ||
              selectedOrganizations.length > 0) && (
              <div className="flex flex-wrap gap-1 mb-2 px-1 overflow-x-auto">
                {selectedAreas.map((area) => (
                  <div
                    key={area}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] flex-shrink-0"
                  >
                    <span className="truncate max-w-[120px] sm:max-w-[150px]">
                      {area}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedAreas(
                          selectedAreas.filter((a) => a !== area),
                        )
                      }
                      className="hover:bg-blue-200 rounded-full p-0.5"
                    >
                      <X className="h-2 w-2" />
                    </button>
                  </div>
                ))}
                {selectedAwardees.map((awardee) => (
                  <div
                    key={awardee}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-[10px] flex-shrink-0"
                  >
                    <span className="truncate max-w-[120px] sm:max-w-[150px]">
                      {awardee}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedAwardees(
                          selectedAwardees.filter((a) => a !== awardee),
                        )
                      }
                      className="hover:bg-green-200 rounded-full p-0.5"
                    >
                      <X className="h-2 w-2" />
                    </button>
                  </div>
                ))}
                {selectedOrganizations.map((org) => (
                  <div
                    key={org}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] flex-shrink-0"
                  >
                    <span className="truncate max-w-[120px] sm:max-w-[150px]">
                      {org}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedOrganizations(
                          selectedOrganizations.filter((o) => o !== org),
                        )
                      }
                      className="hover:bg-purple-200 rounded-full p-0.5"
                    >
                      <X className="h-2 w-2" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Row 2: Filters + Controls */}
            <div className="flex flex-col items-center gap-2 overflow-visible w-full">
              {/* Filter Toggle */}
              <div className="flex flex-row gap-2 w-full items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="hover:bg-gray-100 rounded text-[10px] h-6 px-2 shrink-0"
                >
                  <Filter className="h-2.5 w-2.5 mr-1" />
                  {showFilters ? "Hide" : "Advanced Filters"}
                </Button>

                <label className="flex items-center cursor-pointer gap-1 shrink-0">
                  <input
                    type="checkbox"
                    checked={strictMatch}
                    onChange={(e) => setStrictMatch(e.target.checked)}
                    className="w-2.5 h-2.5 text-black border-gray-300 rounded focus:ring-1 focus:ring-black cursor-pointer"
                  />
                  <span className="text-[14px] font-bold text-gray-700 whitespace-nowrap">
                    Strict
                  </span>
                </label>

                <div className="flex items-center gap-2 ml-auto shrink-0">
                  <select
                    value={resultsPerPage}
                    onChange={(e) => setResultsPerPage(Number(e.target.value))}
                    className="text-[14px] font-bold border border-gray-300 rounded px-1.5 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-black"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {/* Filters when expanded */}
              <div className="flex flex-col w-full gap-2 lg:flex-row">
                {showFilters && (
                  <>
                    {/* Area Filter */}
                    <div className="flex-1 min-w-0">
                      <Autocomplete
                        options={areaOptions}
                        selectedValues={selectedAreas}
                        onChange={setSelectedAreas}
                        onSearchChange={handleAreaSearch}
                        placeholder="Area..."
                        loading={areaLoading}
                      />
                    </div>

                    {/* Awardee Filter */}
                    <div className="flex-1 min-w-0">
                      <Autocomplete
                        options={awardeeOptions}
                        selectedValues={selectedAwardees}
                        onChange={setSelectedAwardees}
                        onSearchChange={handleAwardeeSearch}
                        placeholder="Awardee..."
                        loading={awardeeLoading}
                      />
                    </div>

                    {/* Organization Filter */}
                    <div className="flex-1 min-w-0">
                      <Autocomplete
                        options={organizationOptions}
                        selectedValues={selectedOrganizations}
                        onChange={setSelectedOrganizations}
                        onSearchChange={handleOrganizationSearch}
                        placeholder="Organization..."
                        loading={organizationLoading}
                      />
                    </div>

                    {/* Clear Filters Button */}
                    {(selectedAreas.length > 0 ||
                      selectedAwardees.length > 0 ||
                      selectedOrganizations.length > 0) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAreas([]);
                          setSelectedAwardees([]);
                          setSelectedOrganizations([]);
                        }}
                        className="text-red-600 hover:text-red-800 border-red-600 hover:border-red-800 text-[10px] px-2 h-6 shrink-0"
                      >
                        <X className="h-2.5 w-2.5 mr-0.5" />
                        Clear
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Detail Page Title */}
          {filterType && filterValue && (
            <div className="">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {filterValue}
              </h1>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto -mx-3 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                          Ref ID
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                          Contract
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                          Title
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                          Awardee
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                          Organization
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {[...Array(10)].map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="h-3 bg-gray-200 rounded w-16"></div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="h-3 bg-gray-200 rounded w-20"></div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="h-3 bg-gray-200 rounded w-48"></div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="h-3 bg-gray-200 rounded w-32"></div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="h-3 bg-gray-200 rounded w-40"></div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="h-3 bg-gray-200 rounded w-24"></div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="h-3 bg-gray-200 rounded w-20"></div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="h-3 bg-gray-200 rounded w-24"></div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="h-5 bg-gray-200 rounded-full w-16"></div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Stats for Detail Pages */}
          {detailedStats && results.length > 0 && (
            <div className="space-y-4 mb-6">
              {/* Large Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs">
                      Unique Categories
                    </CardDescription>
                    <CardTitle className="text-3xl font-bold">
                      {detailedStats.uniqueCategories}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-gray-600">Business categories</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs">
                      Total Value
                    </CardDescription>
                    <CardTitle className="text-2xl font-bold">
                      {formatCurrency(totalContractAmount)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-gray-600">All contracts</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs">
                      Average Cost
                    </CardDescription>
                    <CardTitle className="text-2xl font-bold">
                      {formatCurrency(detailedStats.averageCost)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-gray-600">Per contract</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs">
                      Total Contracts
                    </CardDescription>
                    <CardTitle className="text-3xl font-bold">
                      {totalContractCount.toLocaleString()}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-gray-600">Awarded contracts</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Monthly Cost Trend */}
                {filterType !== "category" && filterType !== "location" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Monthly Cost Trend
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Contract amounts over time
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={detailedStats.monthlyChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="displayMonth"
                            tick={{ fontSize: 10 }}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis
                            tick={{ fontSize: 10 }}
                            tickFormatter={(value) =>
                              `₱${(value / 1000000).toFixed(1)}M`
                            }
                          />
                          <Tooltip
                            formatter={(value: number) => formatCurrency(value)}
                            contentStyle={{ fontSize: "12px" }}
                          />
                          <Line
                            type="monotone"
                            dataKey="amount"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Top Partners */}
                {detailedStats.topPartners.length > 0 &&
                  filterType !== "category" &&
                  filterType !== "location" && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Top 10{" "}
                          {filterType === "organization"
                            ? "Awardees"
                            : "Organizations"}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          By total contract value
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart
                            data={detailedStats.topPartners}
                            layout="vertical"
                            margin={{ left: 10, right: 10 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              type="number"
                              tick={{ fontSize: 10 }}
                              tickFormatter={(value) =>
                                `₱${(value / 1000000).toFixed(1)}M`
                              }
                            />
                            <YAxis
                              type="category"
                              dataKey="name"
                              tick={{ fontSize: 9 }}
                              width={150}
                            />
                            <Tooltip
                              formatter={(value: number) =>
                                formatCurrency(value)
                              }
                              contentStyle={{ fontSize: "12px" }}
                            />
                            <Bar dataKey="amount" fill="#10b981" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}
              </div>
            </div>
          )}

          {/* Results */}
          {!loading && results.length > 0 && (
            <div className="space-y-3">
              {/* Title and Stats Row - Mobile Responsive */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <h2 className="text-base font-semibold text-black">
                    Results {query && `for "${query}"`}
                  </h2>
                  {/* Inline Stats */}
                  <div className="flex items-center gap-2 text-[10px] text-gray-600 sm:border-l border-gray-300 sm:pl-3">
                    <span>
                      <strong>{results.length}</strong> results
                    </span>
                    <span>
                      <strong>{formatCurrency(totalContractAmount)}</strong>
                    </span>
                    <span>
                      <strong>
                        {new Set(results.map((r) => r.organization_name)).size}
                      </strong>{" "}
                      orgs
                    </span>
                  </div>
                  {/* Deduplication Checkbox */}
                  <div className="flex items-center gap-2">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={userDeduplication}
                        onChange={(e) => setUserDeduplication(e.target.checked)}
                        className="w-3.5 h-3.5 text-black border-gray-300 rounded focus:ring-1 focus:ring-black cursor-pointer"
                      />
                      <span className="ml-2 text-xs text-gray-700">
                        Remove duplicate contracts
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadCSV}
                    className="text-green-600 hover:text-green-800 border-green-600 hover:border-green-800 text-xs h-7 px-2"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">CSV</span>
                  </Button>
                  {/* Top Pagination - Hidden on mobile, shown on tablet+ */}
                  {totalPages > 1 && (
                    <div className="hidden md:flex items-center gap-2">
                      <p className="text-xs text-gray-600">
                        Showing {startIndex + 1}-
                        {Math.min(endIndex, results.length)} of {results.length}
                      </p>
                      <nav
                        className="inline-flex rounded-md shadow-sm"
                        aria-label="Pagination"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="rounded-r-none text-xs h-7 px-2"
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </Button>
                        {getPageNumbers().map((page, index) =>
                          page === "..." ? (
                            <span
                              key={`ellipsis-top-${index}`}
                              className="inline-flex items-center px-2 py-1 text-xs font-semibold text-gray-700 border border-gray-300 bg-white"
                            >
                              ...
                            </span>
                          ) : (
                            <Button
                              key={page}
                              variant={
                                currentPage === page ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => handlePageChange(page as number)}
                              className="rounded-none text-xs h-7 px-3 min-w-8"
                            >
                              {page}
                            </Button>
                          ),
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="rounded-l-none text-xs h-7 px-2"
                        >
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </nav>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto -mx-3 sm:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleTableSort("reference_id")}
                          >
                            Ref ID{getSortIcon("reference_id")}
                          </th>
                          <th
                            className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleTableSort("contract_no")}
                          >
                            Contract{getSortIcon("contract_no")}
                          </th>
                          <th
                            className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleTableSort("award_title")}
                          >
                            Title{getSortIcon("award_title")}
                          </th>
                          <th
                            className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleTableSort("awardee_name")}
                          >
                            Awardee{getSortIcon("awardee_name")}
                          </th>
                          <th
                            className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleTableSort("organization_name")}
                          >
                            Organization{getSortIcon("organization_name")}
                          </th>
                          <th
                            className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleTableSort("contract_amount")}
                          >
                            Amount{getSortIcon("contract_amount")}
                          </th>
                          <th
                            className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleTableSort("business_category")}
                          >
                            Category{getSortIcon("business_category")}
                          </th>
                          <th
                            className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleTableSort("award_date")}
                          >
                            Date{getSortIcon("award_date")}
                          </th>
                          <th
                            className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleTableSort("award_status")}
                          >
                            Status{getSortIcon("award_status")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedResults.map((doc) => (
                          <tr
                            key={doc.id}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-blue-600">
                              {doc.reference_id}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                              {doc.contract_no}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-900 max-w-xs">
                              <div className="truncate" title={doc.award_title}>
                                {doc.award_title}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-900 max-w-xs">
                              <Link
                                to={`/awardees/${toSlug(doc.awardee_name)}`}
                                className="truncate text-blue-600 hover:text-blue-800 underline text-left transition-colors cursor-pointer block"
                                title={doc.awardee_name}
                              >
                                {doc.awardee_name}
                              </Link>
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-900 max-w-xs">
                              <Link
                                to={`/organizations/${toSlug(doc.organization_name)}`}
                                className="truncate text-blue-600 hover:text-blue-800 underline text-left transition-colors cursor-pointer block"
                                title={doc.organization_name}
                              >
                                {doc.organization_name}
                              </Link>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs font-semibold text-gray-900">
                              {formatCurrency(doc.contract_amount)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700">
                              <Link
                                to={`/categories/${toSlug(doc.business_category)}`}
                                className="text-blue-600 hover:text-blue-800 underline transition-colors cursor-pointer"
                                title={doc.business_category}
                              >
                                {doc.business_category}
                              </Link>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                              {formatDate(doc.award_date)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(doc.award_status)}`}
                              >
                                {doc.award_status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-3 py-2 rounded-lg">
                  <div className="flex flex-1 justify-between sm:hidden">
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="text-xs h-7"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="text-xs h-7"
                    >
                      Next
                    </Button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs text-gray-700">
                        Showing{" "}
                        <span className="font-medium">{startIndex + 1}</span> to{" "}
                        <span className="font-medium">
                          {Math.min(endIndex, results.length)}
                        </span>{" "}
                        of <span className="font-medium">{results.length}</span>{" "}
                        results
                      </p>
                    </div>
                    <div>
                      <nav
                        className="inline-flex rounded-md shadow-sm"
                        aria-label="Pagination"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="rounded-r-none text-xs h-7 px-2"
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </Button>
                        {getPageNumbers().map((page, index) =>
                          page === "..." ? (
                            <span
                              key={`ellipsis-bottom-${index}`}
                              className="inline-flex items-center px-2 py-1 text-xs font-semibold text-gray-700 border border-gray-300 bg-white"
                            >
                              ...
                            </span>
                          ) : (
                            <Button
                              key={page}
                              variant={
                                currentPage === page ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => handlePageChange(page as number)}
                              className="rounded-none text-xs h-7 px-3 min-w-8"
                            >
                              {page}
                            </Button>
                          ),
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="rounded-l-none text-xs h-7 px-2"
                        >
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* No Results */}
          {!loading && query && results.length === 0 && (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <div className="bg-gray-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                  <Search className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No results found
                </h3>
                <p className="text-gray-600 mb-6">
                  Try adjusting your search terms or filters to find what you're
                  looking for.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery("");
                    setSelectedCategory("all");
                  }}
                >
                  Clear Search
                </Button>
              </div>
            </div>
          )}

          {/* Welcome State */}
          {!query && !loading && results.length === 0 && (
            <div className="text-center py-16">
              <div className="max-w-2xl mx-auto">
                <div className="bg-linear-to-r from-blue-50 to-purple-50 rounded-2xl p-8 mb-8">
                  <FileText className="h-16 w-16 text-blue-600 mx-auto mb-6" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    Welcome to BetterGov's Transparency Dashboard
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Search through millions of government procurement and budget
                    records. Find awarded contracts and procurement information
                    by reference ID, company name, or any keyword.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-white rounded-lg p-4">
                      <Search className="h-6 w-6 text-blue-600 mb-2 mx-auto" />
                      <p className="font-medium">Smart Search</p>
                      <p className="text-gray-600">
                        Find records across all fields
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <Filter className="h-6 w-6 text-green-600 mb-2 mx-auto" />
                      <p className="font-medium">Advanced Filters</p>
                      <p className="text-gray-600">
                        Filter by category and date
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <TrendingUp className="h-6 w-6 text-purple-600 mb-2 mx-auto" />
                      <p className="font-medium">Fast Results</p>
                      <p className="text-gray-600">
                        Instant search with analytics
                      </p>
                    </div>
                  </div>
                </div>

                {/* Data Disclaimer */}
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-left">
                  <p className="font-semibold text-yellow-800 mb-2">
                    ⚠️ Data Disclaimer:
                  </p>
                  <ul className="text-gray-700 space-y-1">
                    <li>
                      • Data coverage period: <strong>2000-2025</strong>
                    </li>
                    <li>
                      • Data is subject to change and may contain inaccuracies
                    </li>
                    <li>
                      • Some contracts may have duplicates; we've done our best
                      to clean the data
                    </li>
                    <li>
                      • This is an unofficial community resource for
                      transparency and research purposes
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Search Guide Column */}
        {showSearchGuide && (
          <div className="w-1/4 shrink-0">
            <SearchGuide
              isOpen={showSearchGuide}
              onClose={() => setShowSearchGuide(false)}
            />
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default EnhancedSearchInterface;

