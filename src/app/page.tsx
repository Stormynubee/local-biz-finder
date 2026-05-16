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
  const [showSplash, setShowSplash] = useState(true);
  const [location, setLocation] = useState("");
  const [businessType, setBusinessType] = useState("all");
  const [dataSource, setDataSource] = useState<DataSource>("osm");
  const [isLoading, setIsLoading] = useState(false);
  const [businesses, setBusinesses] = useState<BusinessData[]>([]);
  const [filter, setFilter] = useState<"all" | "no-website" | "has-website">("all");
  const [error, setError] = useState<string | null>(null);

  const [contactedIds, setContactedIds] = useState<Set<number>>(new Set());

  // Splash screen and hydration effect
  useEffect(() => {
    setContactedIds(getSavedContactedIds());
    
    // Hide splash screen after 2.5 seconds
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    
    return () => clearTimeout(timer);
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
        const response = await fetch("/api/businesses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ location: trimmedLocation, businessType })
        });
        
        if (!response.ok) {
          const text = await response.text();
          try {
             const data = JSON.parse(text);
             throw new Error(data.error || "Failed to search OpenStreetMap.");
          } catch {
             throw new Error(`Server Error (${response.status}): Vercel encountered an issue.`);
          }
        }
        
        const data = await response.json();
        setBusinesses(data.businesses ?? []);
      } else {
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
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30, scale: 0.9 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: "spring", stiffness: 250, damping: 20 }
    },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
  };

  return (
    <>
      {/* Splash Screen */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -50, filter: "blur(10px)" }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background overflow-hidden"
          >
            {/* Animated background glows */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[100px] pointer-events-none animate-pulse-slow"></div>
            
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1, type: "spring", bounce: 0.5 }}
              className="relative z-10 flex flex-col items-center"
            >
              <motion.div 
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-24 h-24 bg-gradient-to-tr from-primary to-accent rounded-3xl flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(var(--primary-rgb),0.5)] border border-white/10"
              >
                <Zap className="w-12 h-12 text-white" />
              </motion.div>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-2">
                Business<span className="text-primary">Catch</span>
              </h1>
              <p className="text-gray-400 font-medium tracking-widest uppercase text-sm">By Hansraj Tiwari</p>
            </motion.div>
            
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: "200px" }}
              transition={{ duration: 1.5, delay: 0.5, ease: "circOut" }}
              className="absolute bottom-20 h-1 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <AnimatePresence>
        {!showSplash && (
          <motion.main 
            initial={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="min-h-screen text-foreground p-4 md:p-12 max-w-7xl mx-auto overflow-hidden relative z-0"
          >
            {/* Header Section */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-center mb-10 mt-6 md:mt-8"
            >
              <div className="inline-flex items-center justify-center px-5 py-2 mb-6 rounded-full bg-[rgba(255,255,255,0.03)] border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-xl hover:bg-[rgba(255,255,255,0.05)] transition-all cursor-default">
                <Zap className="w-5 h-5 text-primary mr-2" />
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                  Business<span className="text-primary">Catch</span>
                </h1>
              </div>
              <p className="text-base md:text-xl text-gray-400 max-w-2xl mx-auto font-light px-4">
                Discover local businesses, analyze their online presence, and track your outreach seamlessly.
              </p>
            </motion.div>

            {/* Search Form */}
            <motion.form 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              onSubmit={handleSearch} 
              className="max-w-4xl mx-auto mb-10 bg-[rgba(20,20,20,0.6)] p-6 md:p-10 rounded-[2.5rem] border border-white/5 shadow-2xl backdrop-blur-xl relative overflow-hidden"
            >
              {/* Form subtle glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none rounded-t-[2.5rem]" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 relative z-10">
                {/* Data Source Selector */}
                <div className="md:col-span-2 flex justify-center mb-2 overflow-x-auto pb-2 -mx-2 px-2 md:overflow-visible md:pb-0 md:mx-0 md:px-0 scrollbar-hide">
                  <div className="bg-[rgba(0,0,0,0.4)] p-1.5 rounded-2xl border border-white/5 inline-flex flex-nowrap whitespace-nowrap shadow-inner">
                    <button
                      type="button"
                      onClick={() => setDataSource("osm")}
                      className={`flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                        dataSource === "osm"
                          ? "bg-primary text-white shadow-[0_10px_20px_rgba(var(--primary-rgb),0.3)] scale-[1.02]"
                          : "text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Globe className="w-4 h-4" /> OpenStreetMap <span className="hidden sm:inline text-xs opacity-70 ml-1 font-normal">(Vercel-Ready)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDataSource("google")}
                      className={`flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                        dataSource === "google"
                          ? "bg-accent text-white shadow-[0_10px_20px_rgba(var(--accent-rgb),0.3)] scale-[1.02]"
                          : "text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Bot className="w-4 h-4" /> Google Maps Bot <span className="hidden sm:inline text-xs opacity-70 ml-1 font-normal">(Local Only)</span>
                    </button>
                  </div>
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-bold tracking-wider uppercase text-gray-500 mb-3 ml-2">Location Target</label>
                  <div className="relative group">
                    <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/70 group-focus-within:text-primary transition-colors" />
                    <input
                      type="text"
                      placeholder="e.g. Dharamgarh, Odisha"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      required
                      className="w-full pl-14 pr-5 py-4 bg-[rgba(0,0,0,0.5)] border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-white placeholder-gray-600 shadow-inner text-base"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold tracking-wider uppercase text-gray-500 mb-3 ml-2">Industry Type</label>
                  <div className="relative group">
                    <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/70 group-focus-within:text-primary transition-colors" />
                    <select
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className="w-full pl-14 pr-5 py-4 bg-[rgba(0,0,0,0.5)] border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-white appearance-none cursor-pointer shadow-inner text-base font-medium"
                    >
                      <option value="all" className="bg-[#0f0f13] text-white">All Businesses</option>
                      <option value="shop" className="bg-[#0f0f13] text-white">Shops & Retail</option>
                      <option value="food" className="bg-[#0f0f13] text-white">Restaurants & Cafes</option>
                      <option value="health" className="bg-[#0f0f13] text-white">Healthcare & Clinics</option>
                      <option value="office" className="bg-[#0f0f13] text-white">Offices & Services</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="relative z-10 mt-8">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-5 text-white rounded-2xl font-bold text-lg transition-all duration-300 shadow-[0_10px_30px_-10px_rgba(var(--primary-rgb),0.5)] flex items-center justify-center gap-3 overflow-hidden relative group ${
                    dataSource === "google" ? "bg-gradient-to-r from-accent to-[#7c3aed]" : "bg-gradient-to-r from-primary to-[#2563eb]"
                  } disabled:opacity-70 disabled:cursor-not-allowed transform hover:-translate-y-1 active:scale-[0.98]`}
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                  <span className="relative z-10 flex items-center gap-2">
                    {isLoading ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> {dataSource === "google" ? "Deploying Bot..." : "Scanning Area..."}</>
                    ) : (
                      <><Search className="w-5 h-5" /> Catch Businesses</>
                    )}
                  </span>
                </button>
              </div>
            </motion.form>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -20, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, scale: 0.95, height: 0 }}
                  className="max-w-4xl mx-auto mb-8 overflow-hidden"
                >
                  <div className="p-5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-center font-medium backdrop-blur-md flex items-center justify-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                      <span className="text-red-500 font-bold">!</span>
                    </div>
                    <p>{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Results Section */}
            {businesses.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              >
                {/* Controls */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-5 px-2">
                  <div className="flex items-center gap-1 p-1.5 bg-[rgba(0,0,0,0.4)] border border-white/10 rounded-2xl overflow-x-auto w-full sm:w-auto shadow-inner scrollbar-hide">
                    <Filter className="w-4 h-4 text-primary ml-3 shrink-0" />
                    {(["all", "no-website", "has-website"] as const).map((f) => (
                      <button
                        type="button"
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap ml-1 ${
                          filter === f 
                            ? "bg-primary text-white shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)] scale-[1.02]" 
                            : "text-gray-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        {f === "all" ? "All Results" : f === "no-website" ? "No Website" : "Has Website"}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between w-full sm:w-auto gap-5 bg-[rgba(0,0,0,0.3)] p-1.5 pl-5 border border-white/5 rounded-2xl backdrop-blur-sm">
                    <span className="text-primary font-bold text-sm tracking-wide">
                      {filteredBusinesses.length} FOUND
                    </span>
                    <button
                      onClick={exportToCSV}
                      className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-white text-sm font-bold transition-all duration-300 hover:shadow-lg active:scale-95"
                    >
                      <Download className="w-4 h-4" /> Export
                    </button>
                  </div>
                </div>

                {/* Cards Grid */}
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8"
                >
                  <AnimatePresence mode="popLayout">
                    {filteredBusinesses.map((biz) => {
                      const isContacted = contactedIds.has(biz.id);

                      return (
                        <motion.div
                          key={biz.id}
                          layout
                          variants={itemVariants}
                          whileHover={{ y: isContacted ? 0 : -8, scale: isContacted ? 1 : 1.01 }}
                          className={`relative border rounded-[2rem] p-7 transition-all duration-500 group flex flex-col h-full overflow-hidden bg-[rgba(20,20,20,0.6)] backdrop-blur-md ${
                            isContacted 
                              ? "border-green-500/20 opacity-60 grayscale-[50%]" 
                              : "border-white/5 hover:border-primary/50 shadow-xl hover:shadow-primary/10"
                          }`}
                        >
                          {/* Card background glow effect on hover */}
                          {!isContacted && (
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                          )}

                          {/* Mark as Contacted Button */}
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleContacted(biz.id);
                            }}
                            className={`absolute top-6 right-6 z-50 flex items-center justify-center w-12 h-12 rounded-full cursor-pointer transition-all duration-500 ${
                              isContacted 
                                ? "bg-green-500/20 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.4)]" 
                                : "bg-black/40 border border-white/10 text-gray-500 hover:text-green-400 hover:border-green-500/50 hover:bg-green-500/10 backdrop-blur-sm"
                            }`}
                            title={isContacted ? "Mark as Pending" : "Mark as Contacted"}
                          >
                            <motion.div
                              initial={false}
                              animate={{ scale: isContacted ? 1.2 : 1, rotate: isContacted ? 360 : 0 }}
                              transition={{ type: "spring", stiffness: 300, damping: 15 }}
                            >
                              <CheckCircle2 className={`w-6 h-6 ${isContacted ? 'fill-green-500/20' : ''}`} />
                            </motion.div>
                          </button>

                          <div className="flex justify-between items-start mb-6 pr-16 relative z-10">
                            <div>
                              <span className={`inline-block px-4 py-1.5 border text-xs font-bold tracking-wider rounded-full mb-4 uppercase transition-colors ${
                                isContacted ? "bg-transparent border-white/10 text-gray-500" : "bg-primary/10 border-primary/20 text-primary"
                              }`}>
                                {biz.type}
                              </span>
                              <h3 className="text-2xl font-black leading-tight text-white mb-1 relative inline-block">
                                {biz.name}
                                {isContacted && (
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: "100%" }}
                                    transition={{ duration: 0.4, ease: "easeOut" }}
                                    className="absolute top-1/2 left-0 h-[3px] bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                                  />
                                )}
                              </h3>
                            </div>
                          </div>

                          <div className="space-y-4 flex-grow mt-2 text-sm text-gray-400 font-medium relative z-10">
                            <div className="flex items-start gap-4">
                              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                                <MapPin className="w-4 h-4 text-gray-300" />
                              </div>
                              <span className={`line-clamp-2 mt-1.5 transition-all duration-300 ${isContacted ? "opacity-50" : "group-hover:text-gray-200"}`}>
                                {biz.address}
                              </span>
                            </div>
                            {biz.phone && (
                              <div className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                                  <Phone className="w-4 h-4 text-gray-300" />
                                </div>
                                <span className={`transition-all duration-300 ${isContacted ? "opacity-50" : "text-gray-300 group-hover:text-white"}`}>
                                  {biz.phone}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between gap-3 relative z-10">
                            <a
                              href={biz.mapsUrl || (biz.lat && biz.lon ? `https://www.google.com/maps/search/?api=1&query=${biz.lat},${biz.lon}` : biz.website)}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white transition-all duration-300 py-2.5 px-5 rounded-xl hover:bg-white/10 active:scale-95"
                            >
                              <Navigation className="w-4 h-4" /> Directions
                            </a>

                            {biz.hasWebsite ? (
                              <a 
                                href={biz.website} 
                                target="_blank" 
                                rel="noreferrer"
                                className={`font-bold text-sm flex items-center gap-2 transition-all duration-300 py-2.5 px-5 rounded-xl active:scale-95 ${
                                  isContacted 
                                    ? "text-primary/50" 
                                    : "bg-primary/10 text-primary hover:bg-primary hover:text-white hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)]"
                                }`}
                              >
                                Visit Site <ExternalLink className="w-4 h-4" />
                              </a>
                            ) : (
                              <span className="text-gray-500 text-xs font-bold px-4 py-2.5 bg-white/5 rounded-xl whitespace-nowrap tracking-wider uppercase border border-white/5">
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
                      className="col-span-full py-24 text-center text-gray-500 font-medium bg-[rgba(20,20,20,0.4)] rounded-[2.5rem] border border-white/5 backdrop-blur-sm"
                    >
                      <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 text-gray-600" />
                      </div>
                      <p className="text-xl">No businesses match your current filter.</p>
                      <p className="text-gray-600 text-sm mt-2">Try adjusting your search terms or filters.</p>
                    </motion.div>
                  )}
                </motion.div>
              </motion.div>
            )}

            {/* Loading Skeletons */}
            {isLoading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8 mt-12"
              >
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div className="bg-[rgba(20,20,20,0.5)] border border-white/5 rounded-[2rem] p-8 h-[300px] flex flex-col relative overflow-hidden backdrop-blur-sm" key={i}>
                    <div className="absolute inset-0 animate-shimmer" />
                    <div className="w-20 h-6 bg-white/10 rounded-full mb-6 relative z-10" />
                    <div className="w-3/4 h-8 bg-white/10 rounded-xl mb-6 relative z-10" />
                    <div className="w-full h-4 bg-white/5 rounded-lg mb-4 relative z-10" />
                    <div className="w-2/3 h-4 bg-white/5 rounded-lg mb-auto relative z-10" />
                    <div className="flex justify-between mt-8 pt-6 border-t border-white/5 relative z-10">
                      <div className="w-24 h-10 bg-white/5 rounded-xl" />
                      <div className="w-28 h-10 bg-primary/20 rounded-xl" />
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </motion.main>
        )}
      </AnimatePresence>
    </>
  );
}
