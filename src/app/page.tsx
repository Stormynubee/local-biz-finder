"use client";

import { useMemo, useState, useEffect } from "react";
import { Search, MapPin, Globe, Phone, Building2, Download, Filter, ExternalLink, Loader2, CheckCircle2, Navigation, Zap, Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import { searchBusinesses, type BusinessData } from "@/lib/api";

const contactedStorageKey = "contactedBusinesses";

function getSavedContactedIds() {
  if (typeof window === "undefined") {
    return new Set<number>();
  }

  const saved = window.localStorage.getItem(contactedStorageKey);
  if (!saved) {
    return new Set<number>();
  }

  try {
    const parsed = JSON.parse(saved);
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === "number") : []);
  } catch {
    return new Set<number>();
  }
}

function escapeCsvCell(value: string | number | boolean | undefined) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

type DataSource = "google" | "osm";

export default function Home() {
  const [location, setLocation] = useState("");
  const [businessType, setBusinessType] = useState("all");
  const [dataSource, setDataSource] = useState<DataSource>("osm");
  const [isLoading, setIsLoading] = useState(false);
  const [businesses, setBusinesses] = useState<BusinessData[]>([]);
  const [filter, setFilter] = useState<"all" | "no-website" | "has-website">("all");
  const [error, setError] = useState<string | null>(null);

  const [contactedIds, setContactedIds] = useState<Set<number>>(new Set());

  // Use useEffect for hydration safety
  useEffect(() => {
    setContactedIds(getSavedContactedIds());
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedLocation = location.trim();
    if (!trimmedLocation) return;

    setIsLoading(true);
    setError(null);
    setBusinesses([]);
    setFilter("all");

    try {
      if (dataSource === "osm") {
        // Run client-side to avoid Vercel 10s Serverless timeouts!
        const data = await searchBusinesses(trimmedLocation, businessType);
        setBusinesses(data);
      } else {
        // Google Maps Scrape via API (will likely timeout on Vercel, works locally)
        const response = await fetch("/api/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ location: trimmedLocation, businessType })
        });
        
        if (!response.ok) {
          const text = await response.text();
          try {
             const data = JSON.parse(text);
             throw new Error(data.error || "Failed to run the Google Maps Bot");
          } catch {
             throw new Error(`Server Error (${response.status}): Vercel likely timed out. Please use OpenStreetMap instead.`);
          }
        }
        
        const data = await response.json();
        setBusinesses(data.businesses ?? []);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while fetching data.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleContacted = (id: number) => {
    setContactedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      window.localStorage.setItem(contactedStorageKey, JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const filteredBusinesses = useMemo(() => businesses.filter((biz) => {
    if (filter === "no-website") return !biz.hasWebsite;
    if (filter === "has-website") return biz.hasWebsite;
    return true;
  }), [businesses, filter]);

  const exportToCSV = () => {
    if (filteredBusinesses.length === 0) return;

    const headers = ["Name", "Type", "Address", "Phone", "Website", "Status", "Source"];
    const csvContent = [
      headers.join(","),
      ...filteredBusinesses.map((b) => 
        [
          escapeCsvCell(b.name),
          escapeCsvCell(b.type),
          escapeCsvCell(b.address),
          escapeCsvCell(b.phone),
          escapeCsvCell(b.website),
          escapeCsvCell(contactedIds.has(b.id) ? "Contacted" : "Pending"),
          escapeCsvCell(b.source === "google" ? "Google Maps" : "OpenStreetMap")
        ].join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `businesses_${location.trim().replace(/\s+/g, "_").toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
  };

  return (
    <main className="min-h-screen text-foreground p-4 md:p-12 max-w-7xl mx-auto overflow-hidden">
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="text-center mb-10 mt-6 md:mt-8"
      >
        <div className="inline-flex items-center justify-center px-4 py-2 mb-6 rounded-full bg-surface border border-border shadow-lg backdrop-blur-md">
          <Zap className="w-6 h-6 text-primary mr-2" />
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
            BusinessCatch
          </h1>
          <span className="ml-2 text-sm text-gray-500 font-medium tracking-widest uppercase">by Hansraj</span>
        </div>
        <p className="text-base md:text-xl text-gray-400 max-w-2xl mx-auto font-light px-4">
          Discover local businesses, analyze their online presence, and track your outreach seamlessly.
        </p>
      </motion.div>

      {/* Search Form */}
      <motion.form 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        onSubmit={handleSearch} 
        className="max-w-4xl mx-auto mb-10 bg-surface p-5 md:p-8 rounded-[2rem] border border-border shadow-2xl backdrop-blur-sm"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          {/* Data Source Selector */}
          <div className="md:col-span-2 flex justify-center mb-2 overflow-x-auto pb-2 -mx-2 px-2 md:overflow-visible md:pb-0 md:mx-0 md:px-0">
            <div className="bg-[rgba(0,0,0,0.3)] p-1.5 rounded-2xl border border-border inline-flex flex-nowrap whitespace-nowrap">
              <button
                type="button"
                onClick={() => setDataSource("osm")}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                  dataSource === "osm"
                    ? "bg-primary text-white shadow-lg scale-[1.02]"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Globe className="w-4 h-4" /> OpenStreetMap <span className="hidden sm:inline">(Vercel-Ready)</span>
              </button>
              <button
                type="button"
                onClick={() => setDataSource("google")}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                  dataSource === "google"
                    ? "bg-accent text-white shadow-lg scale-[1.02]"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Bot className="w-4 h-4" /> Google Maps Bot <span className="hidden sm:inline">(Local Only)</span>
              </button>
            </div>
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-400 mb-2 ml-1">Location (City, Area)</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="e.g. Dharamgarh"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-4 bg-[rgba(0,0,0,0.3)] border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-white placeholder-gray-600 shadow-inner"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2 ml-1">Business Type</label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-[rgba(0,0,0,0.3)] border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-white appearance-none cursor-pointer shadow-inner"
              >
                <option value="all" className="bg-background text-white">All Businesses</option>
                <option value="shop" className="bg-background text-white">Shops & Retail</option>
                <option value="food" className="bg-background text-white">Restaurants & Cafes</option>
                <option value="health" className="bg-background text-white">Healthcare (Clinics, etc)</option>
                <option value="office" className="bg-background text-white">Offices & Services</option>
              </select>
            </div>
          </div>
        </div>
        <div>
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-4 text-white rounded-2xl font-bold text-lg transition-all duration-300 shadow-lg flex items-center justify-center gap-2 ${
              dataSource === "google" ? "bg-accent hover:bg-accent-hover hover:shadow-accent/25" : "bg-primary hover:bg-primary-hover hover:shadow-primary/25"
            } disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]`}
          >
            {isLoading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Catching Info...</>
            ) : (
              <><Search className="w-5 h-5" /> Catch Businesses</>
            )}
          </button>
        </div>
      </motion.form>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-4xl mx-auto mb-8 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-center font-medium backdrop-blur-md"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Section */}
      {businesses.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 px-2">
            <div className="flex items-center gap-1.5 p-1.5 bg-surface border border-border rounded-2xl overflow-x-auto w-full sm:w-auto">
              <Filter className="w-4 h-4 text-gray-400 ml-2 shrink-0" />
              {(["all", "no-website", "has-website"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
                    filter === f 
                      ? "bg-[rgba(255,255,255,0.1)] text-white shadow-sm" 
                      : "text-gray-500 hover:text-white"
                  }`}
                >
                  {f === "all" ? "All" : f === "no-website" ? "No Website" : "Has Website"}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between w-full sm:w-auto gap-4">
              <span className="text-gray-400 text-sm font-medium">
                {filteredBusinesses.length} results
              </span>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-5 py-2.5 bg-surface hover:bg-surface-hover border border-border rounded-xl text-white text-sm font-semibold transition-all duration-300 hover:shadow-lg active:scale-95"
              >
                <Download className="w-4 h-4" /> Export CSV
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {filteredBusinesses.map((biz) => {
                const isContacted = contactedIds.has(biz.id);

                return (
                  <motion.div
                    key={biz.id}
                    layout
                    variants={itemVariants}
                    animate={{ 
                      opacity: isContacted ? 0.5 : 1, 
                      backgroundColor: isContacted ? "rgba(255, 255, 255, 0.005)" : "rgba(255, 255, 255, 0.02)"
                    }}
                    className={`border rounded-3xl p-6 transition-colors duration-500 group flex flex-col h-full relative overflow-hidden ${
                      isContacted ? "border-green-500/10" : "border-border/50 hover:border-border hover:bg-surface"
                    }`}
                  >
                    {/* Mark as Contacted Button */}
                    <button 
                      onClick={() => toggleContacted(biz.id)}
                      className={`absolute top-5 right-5 z-10 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${
                        isContacted 
                          ? "bg-green-500/20 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]" 
                          : "bg-surface border border-border text-gray-500 hover:text-green-400 hover:border-green-500/50"
                      }`}
                      title={isContacted ? "Mark as Pending" : "Mark as Contacted"}
                    >
                      <motion.div
                        initial={false}
                        animate={{ scale: isContacted ? 1.1 : 1, rotate: isContacted ? [0, -10, 10, 0] : 0 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <CheckCircle2 className="w-6 h-6" />
                      </motion.div>
                    </button>

                    <div className="flex justify-between items-start mb-5 pr-14">
                      <div>
                        <span className="inline-block px-3 py-1 bg-[rgba(255,255,255,0.03)] border border-border/50 text-xs font-semibold tracking-wide text-gray-400 rounded-full mb-3 uppercase">
                          {biz.type}
                        </span>
                        <motion.h3 
                          animate={{ 
                            color: isContacted ? "#6b7280" : "#f3f4f6" 
                          }}
                          className="text-xl font-bold leading-tight mb-1 transition-colors duration-300 relative inline-block"
                        >
                          {biz.name}
                          {isContacted && (
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: "100%" }}
                              transition={{ duration: 0.3 }}
                              className="absolute top-1/2 left-0 h-[2px] bg-gray-500 rounded-full"
                            />
                          )}
                        </motion.h3>
                      </div>
                    </div>

                    <div className="space-y-4 flex-grow mt-2 text-sm text-gray-400 font-medium">
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-gray-500" />
                        <span className={`line-clamp-2 transition-all duration-300 ${isContacted ? "opacity-50" : ""}`}>
                          {biz.address}
                        </span>
                      </div>
                      {biz.phone && (
                        <div className={`flex items-center gap-3 transition-all duration-300 ${isContacted ? "opacity-50" : "text-gray-300"}`}>
                          <Phone className="w-4 h-4 shrink-0 text-gray-500" />
                          <span>{biz.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 pt-5 border-t border-border/50 flex items-center justify-between gap-3">
                      <a
                        href={biz.mapsUrl || (biz.lat && biz.lon ? `https://www.google.com/maps/search/?api=1&query=${biz.lat},${biz.lon}` : biz.website)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-white transition-all duration-300 py-2 px-4 rounded-xl hover:bg-[rgba(255,255,255,0.05)]"
                      >
                        <Navigation className="w-4 h-4" /> Map
                      </a>

                      {biz.hasWebsite ? (
                        <a 
                          href={biz.website} 
                          target="_blank" 
                          rel="noreferrer"
                          className={`font-semibold text-sm flex items-center gap-2 transition-all duration-300 py-2 px-4 rounded-xl ${
                            isContacted ? "text-primary/50" : "text-primary hover:bg-primary/10"
                          }`}
                        >
                          Visit <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-accent text-xs font-bold px-3 py-2 bg-accent/10 rounded-xl whitespace-nowrap tracking-wide uppercase">
                          No Website
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filteredBusinesses.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="col-span-full py-20 text-center text-gray-500 font-medium"
              >
                No businesses match your current filter. Try adjusting your search.
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div className="bg-[rgba(255,255,255,0.02)] border border-border/50 rounded-3xl p-6 h-[260px] flex flex-col items-center justify-center relative overflow-hidden" key={i}>
              <div className="absolute inset-0 animate-shimmer" />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
