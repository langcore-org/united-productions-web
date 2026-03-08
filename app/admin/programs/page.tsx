"use client";

import { ChevronRight, ExternalLink, Search, Tv } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface Program {
  id: string;
  name: string;
  station: string;
  schedule: string;
  timeSlot?: string;
  cast: string;
  genre?: string;
  startDateText?: string;
  totalEpisodes?: string;
  officialUrl?: string;
}

export default function ProgramsAdminPage() {
  const router = useRouter();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [filteredPrograms, setFilteredPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [stationFilter, setStationFilter] = useState<string>("all");

  const fetchPrograms = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/programs");
      if (!response.ok) {
        throw new Error("Failed to fetch programs");
      }
      const data = await response.json();
      setPrograms(data.programs || []);
      setFilteredPrograms(data.programs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const filterPrograms = useCallback(() => {
    let filtered = [...programs];

    // 検索フィルタ
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.station.toLowerCase().includes(query) ||
          p.cast.toLowerCase().includes(query),
      );
    }

    // 放送局フィルタ
    if (stationFilter !== "all") {
      filtered = filtered.filter((p) => p.station.includes(stationFilter));
    }

    setFilteredPrograms(filtered);
  }, [programs, searchQuery, stationFilter]);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  useEffect(() => {
    filterPrograms();
  }, [filterPrograms]);

  const getStationColor = (station: string): string => {
    if (station.includes("TBS")) return "bg-blue-100 text-blue-800";
    if (station.includes("テレビ朝日")) return "bg-red-100 text-red-800";
    if (station.includes("フジテレビ")) return "bg-purple-100 text-purple-800";
    if (station.includes("テレビ東京")) return "bg-green-100 text-green-800";
    if (station.includes("NHK")) return "bg-orange-100 text-orange-800";
    if (station.includes("Netflix")) return "bg-black text-white";
    return "bg-gray-100 text-gray-800";
  };

  const getGenreColor = (genre?: string): string => {
    if (!genre) return "bg-gray-100 text-gray-800";
    if (genre.includes("トーク")) return "bg-pink-100 text-pink-800";
    if (genre.includes("ゲーム")) return "bg-yellow-100 text-yellow-800";
    if (genre.includes("教養")) return "bg-indigo-100 text-indigo-800";
    if (genre.includes("ドキュメント")) return "bg-teal-100 text-teal-800";
    return "bg-gray-100 text-gray-800";
  };

  // 放送局一覧を取得
  const stations = Array.from(new Set(programs.map((p) => p.station.split("（")[0].trim()))).sort();

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <span>管理画面</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900">番組情報管理</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Tv className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">番組情報管理</h1>
                <p className="text-sm text-gray-500">
                  United Productions制作レギュラー番組（{programs.length}本）
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="番組名、放送局、出演者で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-[200px]">
              <Select value={stationFilter} onValueChange={setStationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="放送局でフィルタ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべての放送局</SelectItem>
                  {stations.map((station) => (
                    <SelectItem key={station} value={station}>
                      {station}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Loading */}
        {isLoading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-700" />
              <span className="ml-3 text-gray-500">読み込み中...</span>
            </div>
          </div>
        ) : (
          /* Table */
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>番組名</TableHead>
                  <TableHead>放送局</TableHead>
                  <TableHead>放送時間</TableHead>
                  <TableHead>放送枠</TableHead>
                  <TableHead>MC/出演者</TableHead>
                  <TableHead>ジャンル</TableHead>
                  <TableHead>開始</TableHead>
                  <TableHead>累計回数</TableHead>
                  <TableHead className="w-[100px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPrograms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-gray-500">
                      該当する番組がありません
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPrograms.map((program, index) => (
                    <TableRow
                      key={program.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => router.push(`/admin/programs/${program.id}`)}
                    >
                      <TableCell className="text-gray-500">{index + 1}</TableCell>
                      <TableCell>
                        <div className="font-medium text-gray-900">{program.name}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStationColor(program.station)}>
                          {program.station}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{program.schedule}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {program.timeSlot || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 max-w-[200px] truncate">
                        {program.cast}
                      </TableCell>
                      <TableCell>
                        {program.genre && (
                          <Badge className={getGenreColor(program.genre)}>{program.genre}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {program.startDateText || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {program.totalEpisodes || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {program.officialUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(program.officialUrl, "_blank");
                              }}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/admin/programs/${program.id}`);
                            }}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Summary */}
        {!isLoading && !error && (
          <div className="mt-4 text-sm text-gray-500">
            表示: {filteredPrograms.length} / 全{programs.length}件
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
