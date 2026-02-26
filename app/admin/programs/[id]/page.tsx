"use client";

import {
  Award,
  Calendar,
  ChevronLeft,
  Clock,
  ExternalLink,
  FileText,
  Gift,
  History,
  Share2,
  Tag,
  TrendingUp,
  Tv,
  Users,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProgramDetail {
  id: string;
  name: string;
  nameEn?: string;
  station: string;
  schedule: string;
  scheduleDetail?: Array<{
    day: string;
    startTime: string;
    endTime: string;
    note?: string;
  }>;
  timeSlot?: string;
  officialUrl?: string;
  cast: string;
  regularCast?: string[];
  narrator?: string;
  announcer?: string;
  staff?: Array<{
    role: string;
    name: string;
    affiliation?: string;
  }>;
  chiefDirector?: string;
  producers?: string[];
  description: string;
  concept?: string;
  targetAudience?: string;
  corners?: Array<{
    name: string;
    description: string;
    popularity?: string;
  }>;
  format?: string;
  startDateText?: string;
  totalEpisodes?: string;
  broadcastHistory?: string;
  ratings?: Array<{
    period: string;
    average?: string;
    highest?: string;
    note?: string;
  }>;
  awards?: Array<{
    year: string;
    name: string;
    note?: string;
  }>;
  achievements?: string[];
  social?: Array<{
    platform: string;
    url: string;
    followers?: string;
  }>;
  twitter?: string;
  sponsors?: Array<{
    name: string;
    slot?: string;
  }>;
  productionCooperation?: string[];
  notes?: string;
  relatedPrograms?: string[];
  spinoffs?: string[];
  pastSpecials?: string[];
  tags?: string[];
  genre?: string;
  category?: string;
}

export default function ProgramDetailPage() {
  const router = useRouter();
  const params = useParams();
  const programId = params.id as string;

  const [program, setProgram] = useState<ProgramDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgram = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/programs?id=${programId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch program");
      }
      const data = await response.json();
      setProgram(data.program);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    fetchProgram();
  }, [fetchProgram]);

  const getStationColor = (station: string): string => {
    if (station.includes("TBS")) return "bg-blue-100 text-blue-800";
    if (station.includes("テレビ朝日")) return "bg-red-100 text-red-800";
    if (station.includes("フジテレビ")) return "bg-purple-100 text-purple-800";
    if (station.includes("テレビ東京")) return "bg-green-100 text-green-800";
    if (station.includes("NHK")) return "bg-orange-100 text-orange-800";
    if (station.includes("Netflix")) return "bg-black text-white";
    return "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-700" />
            <span className="ml-3 text-gray-500">読み込み中...</span>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !program) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error || "番組が見つかりません"}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/admin/programs")}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              一覧に戻る
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <span>管理画面</span>
          <ChevronLeft className="w-4 h-4 rotate-180" />
          <button type="button" onClick={() => router.push("/admin/programs")} className="hover:text-gray-900">
            番組情報管理
          </button>
          <ChevronLeft className="w-4 h-4 rotate-180" />
          <span className="text-gray-900">{program.name}</span>
        </div>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Tv className="w-7 h-7 text-amber-700" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-gray-900">{program.name}</h1>
                  {program.nameEn && (
                    <span className="text-sm text-gray-500">{program.nameEn}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={getStationColor(program.station)}>{program.station}</Badge>
                  {program.timeSlot && <Badge variant="outline">{program.timeSlot}</Badge>}
                  {program.genre && <Badge variant="secondary">{program.genre}</Badge>}
                  {program.tags?.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {program.officialUrl && (
                <Button
                  variant="outline"
                  onClick={() => window.open(program.officialUrl, "_blank")}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  公式サイト
                </Button>
              )}
              <Button onClick={() => router.push("/admin/programs")}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                一覧に戻る
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="bg-white border">
            <TabsTrigger value="basic">基本情報</TabsTrigger>
            <TabsTrigger value="cast">出演者・スタッフ</TabsTrigger>
            <TabsTrigger value="content">番組内容</TabsTrigger>
            <TabsTrigger value="history">放送歴・実績</TabsTrigger>
            <TabsTrigger value="related">関連情報</TabsTrigger>
          </TabsList>

          {/* Basic Info Tab */}
          <TabsContent value="basic" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    放送情報
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="text-sm text-gray-500 block">放送時間</span>
                    <p className="font-medium">{program.schedule}</p>
                  </div>
                  {program.scheduleDetail && program.scheduleDetail.length > 0 && (
                    <div>
                      <span className="text-sm text-gray-500 block">詳細スケジュール</span>
                      <div className="mt-2 space-y-2">
                        {program.scheduleDetail.map((s, i) => (
                          <div key={i} className="text-sm bg-gray-50 p-2 rounded">
                            <span className="font-medium">{s.day}</span> {s.startTime}〜{s.endTime}
                            {s.note && <span className="text-gray-500 ml-2">({s.note})</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {program.timeSlot && (
                    <div>
                      <span className="text-sm text-gray-500 block">放送枠</span>
                      <p>{program.timeSlot}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    番組概要
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="text-sm text-gray-500 block">番組内容</span>
                    <p className="mt-1">{program.description}</p>
                  </div>
                  {program.concept && (
                    <div>
                      <span className="text-sm text-gray-500 block">コンセプト</span>
                      <p className="mt-1">{program.concept}</p>
                    </div>
                  )}
                  {program.targetAudience && (
                    <div>
                      <span className="text-sm text-gray-500 block">ターゲット層</span>
                      <p className="mt-1">{program.targetAudience}</p>
                    </div>
                  )}
                  {program.format && (
                    <div>
                      <span className="text-sm text-gray-500 block">形式</span>
                      <p className="mt-1">{program.format}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Cast & Staff Tab */}
          <TabsContent value="cast" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    出演者
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="text-sm text-gray-500 block">MC/メイン</span>
                    <p className="font-medium">{program.cast}</p>
                  </div>
                  {program.regularCast && program.regularCast.length > 0 && (
                    <div>
                      <span className="text-sm text-gray-500 block">レギュラー出演者</span>
                      <ul className="mt-2 space-y-1">
                        {program.regularCast.map((cast, i) => (
                          <li key={i} className="text-sm">
                            • {cast}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {program.narrator && (
                    <div>
                      <span className="text-sm text-gray-500 block">ナレーター</span>
                      <p>{program.narrator}</p>
                    </div>
                  )}
                  {program.announcer && (
                    <div>
                      <span className="text-sm text-gray-500 block">進行アナウンサー</span>
                      <p>{program.announcer}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    スタッフ
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {program.chiefDirector && (
                    <div>
                      <span className="text-sm text-gray-500 block">総合演出</span>
                      <p className="font-medium">{program.chiefDirector}</p>
                    </div>
                  )}
                  {program.producers && program.producers.length > 0 && (
                    <div>
                      <span className="text-sm text-gray-500 block">プロデューサー</span>
                      <ul className="mt-2 space-y-1">
                        {program.producers.map((producer, i) => (
                          <li key={i} className="text-sm">
                            • {producer}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {program.staff && program.staff.length > 0 && (
                    <div>
                      <span className="text-sm text-gray-500 block">スタッフ</span>
                      <ul className="mt-2 space-y-1">
                        {program.staff.map((s, i) => (
                          <li key={i} className="text-sm">
                            • {s.role}: {s.name}
                            {s.affiliation && (
                              <span className="text-gray-500">（{s.affiliation}）</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-6">
            {program.corners && program.corners.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="w-5 h-5" />
                    主要コーナー
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {program.corners.map((corner, i) => (
                      <div key={i} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">{corner.name}</span>
                          {corner.popularity === "high" && (
                            <Badge className="bg-amber-100 text-amber-800">人気</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{corner.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    放送歴
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {program.startDateText && (
                    <div>
                      <span className="text-sm text-gray-500 block">開始</span>
                      <p className="font-medium">{program.startDateText}</p>
                    </div>
                  )}
                  {program.totalEpisodes && (
                    <div>
                      <span className="text-sm text-gray-500 block">累計放送回数</span>
                      <p className="font-medium">{program.totalEpisodes}</p>
                    </div>
                  )}
                  {program.broadcastHistory && (
                    <div>
                      <span className="text-sm text-gray-500 block">経緯</span>
                      <p className="mt-1">{program.broadcastHistory}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {program.ratings && program.ratings.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      視聴率
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {program.ratings.map((rating, i) => (
                        <div key={i} className="bg-gray-50 p-3 rounded">
                          <div className="font-medium">{rating.period}</div>
                          <div className="text-sm text-gray-600">
                            {rating.average && `平均: ${rating.average}`}
                            {rating.highest && ` / 最高: ${rating.highest}`}
                          </div>
                          {rating.note && (
                            <div className="text-xs text-gray-500 mt-1">{rating.note}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {program.awards && program.awards.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="w-5 h-5" />
                      受賞歴
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {program.awards.map((award, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <Badge variant="outline">{award.year}年</Badge>
                          <div>
                            <span className="font-medium">{award.name}</span>
                            {award.note && (
                              <span className="text-sm text-gray-500 ml-2">{award.note}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {program.achievements && program.achievements.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="w-5 h-5" />
                      主な実績
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {program.achievements.map((achievement, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-amber-500 mt-1">•</span>
                          <span>{achievement}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Related Tab */}
          <TabsContent value="related" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {program.social && program.social.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Share2 className="w-5 h-5" />
                      SNS・配信
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {program.social.map((s, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between bg-gray-50 p-3 rounded"
                        >
                          <span className="font-medium">{s.platform}</span>
                          <span className="text-sm text-gray-600">{s.url}</span>
                          {s.followers && <Badge variant="outline">{s.followers}</Badge>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {program.productionCooperation && program.productionCooperation.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      制作
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {program.productionCooperation.map((coop, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="text-gray-500">•</span>
                          {coop}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {program.relatedPrograms && program.relatedPrograms.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="w-5 h-5" />
                      関連番組
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {program.relatedPrograms.map((related, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="text-gray-500">•</span>
                          {related}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {program.spinoffs && program.spinoffs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gift className="w-5 h-5" />
                      派生コンテンツ
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {program.spinoffs.map((spinoff, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="text-gray-500">•</span>
                          {spinoff}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {program.pastSpecials && program.pastSpecials.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="w-5 h-5" />
                      過去のSP
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {program.pastSpecials.map((special, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="text-gray-500">•</span>
                          {special}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {program.notes && (
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      備考
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 whitespace-pre-wrap">{program.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
