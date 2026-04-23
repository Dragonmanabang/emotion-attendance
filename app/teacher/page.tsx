"use client";

import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Student = {
  id: string;
  name: string;
  is_active: boolean;
};

type EmotionLog = {
  id: string;
  emotion: string;
  note: string | null;
  recorded_at: string;
  student_id: string;
  students: {
    name: string;
  } | null;
};

type RawEmotionLog = Omit<EmotionLog, "students"> & {
  students:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
};

const EMOTION_ORDER = ["happy", "okay", "sad", "angry", "tired", "worried"] as const;

const emotionLabels: Record<string, string> = {
  happy: "😀 행복해요",
  okay: "🙂 보통이에요",
  sad: "😢 슬퍼요",
  angry: "😡 화나요",
  tired: "😴 피곤해요",
  worried: "😟 걱정돼요",
};

const emotionBars: Record<string, string> = {
  happy: "bg-yellow-400",
  okay: "bg-green-500",
  sad: "bg-blue-500",
  angry: "bg-red-500",
  tired: "bg-purple-500",
  worried: "bg-orange-500",
};

const emotionBadgeStyles: Record<string, string> = {
  happy: "bg-yellow-100 text-yellow-900",
  okay: "bg-green-100 text-green-900",
  sad: "bg-blue-100 text-blue-900",
  angry: "bg-red-100 text-red-900",
  tired: "bg-purple-100 text-purple-900",
  worried: "bg-orange-100 text-orange-900",
};

const CAUTION_EMOTIONS = new Set(["sad", "angry", "tired", "worried"]);
const TEACHER_NOTE_FLAG = "선생님께 말하고 싶어요";
const EMOTION_FLOW_SCORES: Record<string, number> = {
  angry: 1,
  sad: 2,
  worried: 3,
  tired: 4,
  okay: 5,
  happy: 6,
};
const DISMISSED_RISK_ALERT_STORAGE_KEY = "emotion-attendance.dismissed-risk-alert-key";
const EXTRA_EMOTION_ORDER = [
  "excited",
  "proud",
  "calm",
  "surprised",
  "sleepy",
  "bored",
  "lonely",
  "scared",
  "embarrassed",
  "frustrated",
] as const;
const ALL_EMOTION_ORDER = [...EMOTION_ORDER, ...EXTRA_EMOTION_ORDER];

const ALL_EMOTION_LABELS: Record<string, string> = {
  ...emotionLabels,
  excited: "🤩 신나요",
  proud: "😎 뿌듯해요",
  calm: "😌 편안해요",
  surprised: "😮 놀랐어요",
  sleepy: "😪 졸려요",
  bored: "😐 심심해요",
  lonely: "🥺 외로워요",
  scared: "😨 무서워요",
  embarrassed: "😳 부끄러워요",
  frustrated: "😣 속상해요",
};

const ALL_EMOTION_BARS: Record<string, string> = {
  ...emotionBars,
  excited: "bg-amber-400",
  proud: "bg-lime-500",
  calm: "bg-teal-500",
  surprised: "bg-cyan-500",
  sleepy: "bg-indigo-500",
  bored: "bg-slate-500",
  lonely: "bg-sky-500",
  scared: "bg-violet-500",
  embarrassed: "bg-pink-500",
  frustrated: "bg-rose-500",
};

const ALL_EMOTION_BADGE_STYLES: Record<string, string> = {
  ...emotionBadgeStyles,
  excited: "bg-amber-100 text-amber-900",
  proud: "bg-lime-100 text-lime-900",
  calm: "bg-teal-100 text-teal-900",
  surprised: "bg-cyan-100 text-cyan-900",
  sleepy: "bg-indigo-100 text-indigo-900",
  bored: "bg-slate-100 text-slate-900",
  lonely: "bg-sky-100 text-sky-900",
  scared: "bg-violet-100 text-violet-900",
  embarrassed: "bg-pink-100 text-pink-900",
  frustrated: "bg-rose-100 text-rose-900",
};

const ALL_CAUTION_EMOTIONS = new Set([
  ...Array.from(CAUTION_EMOTIONS),
  "lonely",
  "scared",
  "embarrassed",
  "frustrated",
]);

const ALL_EMOTION_FLOW_SCORES: Record<string, number> = {
  ...EMOTION_FLOW_SCORES,
  excited: 6,
  proud: 6,
  calm: 5,
  surprised: 4,
  sleepy: 4,
  bored: 3,
  lonely: 2,
  scared: 2,
  embarrassed: 2,
  frustrated: 1,
};

function getTodayString() {
  return formatLocalDateString(new Date());
}

function getDateOffsetString(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);

  return formatLocalDateString(date);
}

function formatLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeEmotionLogs(logs: RawEmotionLog[]): EmotionLog[] {
  return logs.map((log) => ({
    ...log,
    students: Array.isArray(log.students) ? (log.students[0] ?? null) : log.students,
  }));
}

function getDateTimeRange(startDateString: string, endDateString: string) {
  const start = new Date(`${startDateString}T00:00:00`);
  const end = new Date(`${endDateString}T23:59:59.999`);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function getDaysInclusive(startDateString: string, endDateString: string) {
  const start = new Date(`${startDateString}T00:00:00`);
  const end = new Date(`${endDateString}T00:00:00`);
  const diff = end.getTime() - start.getTime();

  if (Number.isNaN(diff) || diff < 0) {
    return 0;
  }

  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

function formatPeriodLabel(startDateString: string, endDateString: string) {
  if (startDateString === endDateString) {
    return `${startDateString} 하루`;
  }

  return `${startDateString} ~ ${endDateString}`;
}

function getDateRangeStrings(startDateString: string, endDateString: string) {
  const days = getDaysInclusive(startDateString, endDateString);

  if (days === 0) {
    return [];
  }

  const start = new Date(`${startDateString}T00:00:00`);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    return formatLocalDateString(date);
  });
}

function buildEmotionCounts(logs: EmotionLog[]) {
  const counts: Record<string, number> = {};

  ALL_EMOTION_ORDER.forEach((emotion) => {
    counts[emotion] = 0;
  });

  logs.forEach((log) => {
    counts[log.emotion] = (counts[log.emotion] || 0) + 1;
  });

  return counts;
}

function getTopEmotion(logs: EmotionLog[]) {
  const counts = buildEmotionCounts(logs);
  let topEmotion: string | null = null;
  let topCount = 0;

  ALL_EMOTION_ORDER.forEach((emotion) => {
    if (counts[emotion] > topCount) {
      topEmotion = emotion;
      topCount = counts[emotion];
    }
  });

  return topEmotion ? ALL_EMOTION_LABELS[topEmotion] ?? topEmotion : null;
}

function EmotionBarChart({
  logs,
  emptyMessage,
}: {
  logs: EmotionLog[];
  emptyMessage: string;
}) {
  const counts = useMemo(() => buildEmotionCounts(logs), [logs]);
  const totalCount = logs.length;

  const chartItems = useMemo(() => {
    return ALL_EMOTION_ORDER.map((emotion) => {
      const count = counts[emotion] || 0;
      const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;

      return {
        emotion,
        count,
        percentage,
      };
    }).filter((item) => item.count > 0);
  }, [counts, totalCount]);

  const maxValue = Math.max(...chartItems.map((item) => item.count), 1);

  if (logs.length === 0) {
    return <p className="text-gray-500">{emptyMessage}</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {chartItems.map((item) => {
        const width = item.count > 0 ? Math.max((item.count / maxValue) * 100, 8) : 0;

        return (
          <div key={item.emotion} className="rounded-2xl bg-slate-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 truncate text-sm font-bold text-slate-800">
                {ALL_EMOTION_LABELS[item.emotion] ?? item.emotion}
              </div>
              <div className="shrink-0 text-sm font-black text-slate-700">
                {item.count}건
              </div>
            </div>

            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full ${ALL_EMOTION_BARS[item.emotion] ?? "bg-slate-500"}`}
                style={{ width: `${width}%` }}
              />
            </div>

            <div className="mt-1 text-right text-xs font-semibold text-slate-500">
              {item.percentage}%
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmotionFlowLineChart({
  logs,
  startDateString,
  endDateString,
}: {
  logs: EmotionLog[];
  startDateString: string;
  endDateString: string;
}) {
  const dateLabels = useMemo(
    () => getDateRangeStrings(startDateString, endDateString),
    [endDateString, startDateString]
  );

  const logsByDate = useMemo(() => {
    const map = new Map<string, EmotionLog>();

    logs.forEach((log) => {
      const key = formatLocalDateString(new Date(log.recorded_at));
      if (!map.has(key)) {
        map.set(key, log);
      }
    });

    return map;
  }, [logs]);

  const chartMinWidth = Math.max(dateLabels.length * 58, 560);

  const points = useMemo(() => {
    const topPadding = 6;
    const bottomPadding = 6;
    const chartHeight = 100 - topPadding - bottomPadding;

    return dateLabels.map((date, index) => {
      const log = logsByDate.get(date) ?? null;
      const score = log ? ALL_EMOTION_FLOW_SCORES[log.emotion] ?? null : null;
      const x = ((index + 0.5) / dateLabels.length) * 100;
      const y = score === null ? null : topPadding + ((6 - score) / 5) * chartHeight;

      return {
        date,
        log,
        score,
        x,
        y,
      };
    });
  }, [dateLabels, logsByDate]);

  const segments = useMemo(() => {
    const result: string[] = [];
    let current: string[] = [];

    points.forEach((point) => {
      if (point.y === null) {
        if (current.length > 1) {
          result.push(current.join(" "));
        }
        current = [];
        return;
      }

      current.push(`${point.x},${point.y}`);
    });

    if (current.length > 1) {
      result.push(current.join(" "));
    }

    return result;
  }, [points]);

  const axisLabels = [
    { score: 6, label: "좋음", examples: "행복·신남·뿌듯" },
    { score: 5, label: "안정", examples: "보통·편안" },
    { score: 4, label: "변화", examples: "놀람·피곤·졸림" },
    { score: 3, label: "낮음", examples: "걱정·심심" },
    { score: 2, label: "주의", examples: "슬픔·외로움·무서움·부끄러움" },
    { score: 1, label: "위험", examples: "화남·속상함" },
  ];

  if (dateLabels.length === 0) {
    return <p className="text-gray-500">그래프를 보려면 올바른 기간을 선택해 주세요.</p>;
  }

  if (logs.length === 0) {
    return (
      <p className="text-gray-500">
        선택한 기간({formatPeriodLabel(startDateString, endDateString)})에 해당 학생의 감정 기록이 없습니다.
      </p>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 p-4">
      <div className="grid gap-4 lg:grid-cols-[180px_1fr]">
        <div className="hidden lg:flex lg:flex-col lg:justify-between lg:py-2">
          {axisLabels.map((item) => (
            <div key={item.score} className="text-xs text-slate-500">
              <div className="font-bold text-slate-700">{item.label}</div>
              <div className="mt-0.5 leading-snug">{item.examples}</div>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto pb-2">
          <div style={{ minWidth: `${chartMinWidth}px` }}>
            <div className="relative h-64 overflow-hidden rounded-2xl bg-slate-50 p-4">
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="h-full w-full overflow-visible"
            >
              {[6, 23.6, 41.2, 58.8, 76.4, 94].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={y}
                  x2="100"
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="0.6"
                  vectorEffect="non-scaling-stroke"
                />
              ))}

              {segments.map((segment, index) => (
                <polyline
                  key={index}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={segment}
                  vectorEffect="non-scaling-stroke"
                />
              ))}

              {points.map((point) =>
                point.y === null ? null : (
                  <circle
                    key={point.date}
                    cx={point.x}
                    cy={point.y}
                    r="1.35"
                    fill="#2563eb"
                    stroke="#ffffff"
                    strokeWidth="0.65"
                    vectorEffect="non-scaling-stroke"
                  />
                )
              )}
            </svg>
            </div>

            <div
              className="mt-3 grid gap-2 text-xs text-slate-500"
              style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}
            >
            {points.map((point) => (
              <div key={point.date} className="rounded-xl bg-slate-50 px-1 py-2 text-center">
                <div className="font-semibold text-slate-700">{point.date.slice(5)}</div>
                <div className="mt-1">
                  {point.log ? ALL_EMOTION_LABELS[point.log.emotion] ?? point.log.emotion : "기록 없음"}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600 lg:hidden">
            <span className="font-bold text-slate-800">그래프 단계 안내: </span>
            좋음(행복·신남·뿌듯), 안정(보통·편안), 변화(놀람·피곤·졸림), 낮음(걱정·심심),
            주의(슬픔·외로움·무서움·부끄러움), 위험(화남·속상함)
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

export default function TeacherPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [periodLogs, setPeriodLogs] = useState<EmotionLog[]>([]);
  const [todayLogs, setTodayLogs] = useState<EmotionLog[]>([]);
  const [riskLogs, setRiskLogs] = useState<EmotionLog[]>([]);
  const [bulkNames, setBulkNames] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState("");
  const [editingStudentName, setEditingStudentName] = useState("");
  const [savingStudentId, setSavingStudentId] = useState("");
  const [deletingStudentId, setDeletingStudentId] = useState("");
  const [dismissedRiskAlertKey, setDismissedRiskAlertKey] = useState("");
  const [dismissedRiskAlertDate, setDismissedRiskAlertDate] = useState("");
  const [hasLoadedRiskAlertPreference, setHasLoadedRiskAlertPreference] = useState(false);

  const [periodStartDate, setPeriodStartDate] = useState(getDateOffsetString(6));
  const [periodEndDate, setPeriodEndDate] = useState(getTodayString());
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const todayString = getTodayString();

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from("students")
      .select("id, name, is_active")
      .eq("is_active", true)
      .order("name");

    if (!error && data) {
      setStudents(data);
    }
  };

  const fetchTodayLogs = async () => {
    const today = getTodayString();
    const { start, end } = getDateTimeRange(today, today);

    const { data, error } = await supabase
      .from("emotion_logs")
      .select("id, emotion, note, recorded_at, student_id, students(name)")
      .gte("recorded_at", start)
      .lte("recorded_at", end)
      .order("recorded_at", { ascending: false });

    if (!error && data) {
      setTodayLogs(normalizeEmotionLogs(data));
    }
  };

  const fetchPeriodLogs = async (startDateString: string, endDateString: string) => {
    const { start, end } = getDateTimeRange(startDateString, endDateString);

    const { data, error } = await supabase
      .from("emotion_logs")
      .select("id, emotion, note, recorded_at, student_id, students(name)")
      .gte("recorded_at", start)
      .lte("recorded_at", end)
      .order("recorded_at", { ascending: false });

    if (!error && data) {
      setPeriodLogs(normalizeEmotionLogs(data));
    }
  };

  const fetchRiskLogs = async () => {
    const startDateString = getDateOffsetString(4);
    const endDateString = getTodayString();
    const { start, end } = getDateTimeRange(startDateString, endDateString);

    const { data, error } = await supabase
      .from("emotion_logs")
      .select("id, emotion, note, recorded_at, student_id, students(name)")
      .gte("recorded_at", start)
      .lte("recorded_at", end)
      .in("emotion", Array.from(ALL_CAUTION_EMOTIONS))
      .order("recorded_at", { ascending: false });

    if (!error && data) {
      setRiskLogs(normalizeEmotionLogs(data));
    }
  };

  const syncStudents = useEffectEvent(() => {
    void fetchStudents();
  });

  const syncTodayLogs = useEffectEvent(() => {
    void fetchTodayLogs();
  });

  const syncPeriodLogs = useEffectEvent((startDateString: string, endDateString: string) => {
    void fetchPeriodLogs(startDateString, endDateString);
  });

  const syncRiskLogs = useEffectEvent(() => {
    void fetchRiskLogs();
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    syncStudents();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    syncTodayLogs();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    syncRiskLogs();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const savedRiskAlertPreference =
      window.localStorage.getItem(DISMISSED_RISK_ALERT_STORAGE_KEY) ?? "";
    let savedRiskAlertKey = "";
    let savedRiskAlertDate = "";

    if (savedRiskAlertPreference) {
      try {
        const parsedPreference = JSON.parse(savedRiskAlertPreference) as {
          dismissedDate?: string;
          riskAlertKey?: string;
        };

        savedRiskAlertKey = parsedPreference.riskAlertKey ?? "";
        savedRiskAlertDate = parsedPreference.dismissedDate ?? "";
      } catch {
        savedRiskAlertKey = savedRiskAlertPreference;
        savedRiskAlertDate = todayString;
      }
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissedRiskAlertKey(savedRiskAlertKey);
    setDismissedRiskAlertDate(savedRiskAlertDate);
    setHasLoadedRiskAlertPreference(true);
  }, [todayString]);

  useEffect(() => {
    if (!hasLoadedRiskAlertPreference || typeof window === "undefined") {
      return;
    }

    if (dismissedRiskAlertKey && dismissedRiskAlertDate) {
      window.localStorage.setItem(
        DISMISSED_RISK_ALERT_STORAGE_KEY,
        JSON.stringify({
          dismissedDate: dismissedRiskAlertDate,
          riskAlertKey: dismissedRiskAlertKey,
        })
      );
      return;
    }

    window.localStorage.removeItem(DISMISSED_RISK_ALERT_STORAGE_KEY);
  }, [dismissedRiskAlertDate, dismissedRiskAlertKey, hasLoadedRiskAlertPreference]);

  const periodError =
    periodStartDate > periodEndDate ? "시작 날짜가 종료 날짜보다 늦을 수 없어요." : "";

  useEffect(() => {
    if (!periodError) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      syncPeriodLogs(periodStartDate, periodEndDate);
    }
  }, [periodEndDate, periodError, periodStartDate]);

  const handleBulkInsert = async () => {
    setMessage("");

    const names = bulkNames
      .split("\n")
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    if (names.length === 0) {
      setMessage("학생 이름을 한 줄에 한 명씩 입력해 주세요.");
      return;
    }

    const uniqueNames = [...new Set(names)];
    const existingNameSet = new Set(students.map((student) => student.name.trim()));

    const newStudents = uniqueNames
      .filter((name) => !existingNameSet.has(name))
      .map((name) => ({
        name,
        is_active: true,
      }));

    if (newStudents.length === 0) {
      setMessage("이미 등록된 학생들입니다.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("students").insert(newStudents);

    setLoading(false);

    if (error) {
      setMessage("학생 등록에 실패했습니다.");
      return;
    }

    setMessage(`${newStudents.length}명의 학생이 등록되었습니다.`);
    setBulkNames("");
    setIsBulkModalOpen(false);
    fetchStudents();
  };

  const handleStartEditStudent = (student: Student) => {
    setEditingStudentId(student.id);
    setEditingStudentName(student.name);
  };

  const handleCancelEditStudent = () => {
    setEditingStudentId("");
    setEditingStudentName("");
  };

  const refreshDashboardData = async () => {
    await Promise.all([
      fetchStudents(),
      fetchTodayLogs(),
      fetchPeriodLogs(periodStartDate, periodEndDate),
      fetchRiskLogs(),
    ]);
  };

  const handleSaveStudentName = async (studentId: string) => {
    const trimmedName = editingStudentName.trim();

    if (!trimmedName) {
      setMessage("학생 이름을 입력해 주세요.");
      return;
    }

    setSavingStudentId(studentId);
    setMessage("");

    const { error } = await supabase
      .from("students")
      .update({ name: trimmedName })
      .eq("id", studentId);

    setSavingStudentId("");

    if (error) {
      setMessage("학생 이름 수정에 실패했습니다.");
      return;
    }

    setMessage("학생 이름을 수정했습니다.");
    setEditingStudentId("");
    setEditingStudentName("");
    await refreshDashboardData();
  };

  const handleDeleteStudent = async (student: Student) => {
    const ok = window.confirm(`${student.name} 학생을 삭제할까요?\n기존 기록은 남기고 명단에서만 숨깁니다.`);
    if (!ok) {
      return;
    }

    setDeletingStudentId(student.id);
    setMessage("");

    const { error } = await supabase
      .from("students")
      .update({ is_active: false })
      .eq("id", student.id);

    setDeletingStudentId("");

    if (error) {
      setMessage("학생 삭제에 실패했습니다.");
      return;
    }

    if (selectedStudentId === student.id) {
      setSelectedStudentId("");
    }

    setEditingStudentId("");
    setEditingStudentName("");
    setMessage("학생을 삭제했습니다.");
    await refreshDashboardData();
  };

  const focusStudentPeriodStats = (studentId: string) => {
    setSelectedStudentId(studentId);

    if (typeof document !== "undefined") {
      window.setTimeout(() => {
        document.getElementById("period-stats")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 0);
    }
  };

  const todayLogByStudentId = useMemo(() => {
    const logMap = new Map<string, EmotionLog>();

    todayLogs.forEach((log) => {
      if (!logMap.has(log.student_id)) {
        logMap.set(log.student_id, log);
      }
    });

    return logMap;
  }, [todayLogs]);

  const todayStudentStatuses = useMemo(() => {
    return students.map((student) => {
      const todayLog = todayLogByStudentId.get(student.id) ?? null;
      const needsAttention =
        !!todayLog &&
        (ALL_CAUTION_EMOTIONS.has(todayLog.emotion) || todayLog.note?.trim() === TEACHER_NOTE_FLAG);

      return {
        student,
        todayLog,
        needsAttention,
      };
    });
  }, [students, todayLogByStudentId]);

  const riskAlertStudents = useMemo(() => {
    const counts = new Map<string, { name: string; count: number; latestAt: string }>();

    riskLogs.forEach((log) => {
      const current =
        counts.get(log.student_id) ?? {
          name: log.students?.name ?? "이름 없음",
          count: 0,
          latestAt: log.recorded_at,
        };

      current.count += 1;
      current.latestAt =
        new Date(current.latestAt).getTime() > new Date(log.recorded_at).getTime()
          ? current.latestAt
          : log.recorded_at;

      counts.set(log.student_id, current);
    });

    return Array.from(counts.entries())
      .filter(([, value]) => value.count >= 3)
      .map(([studentId, value]) => ({
        studentId,
        name: value.name,
        count: value.count,
        latestAt: value.latestAt,
      }))
      .sort((a, b) => b.count - a.count);
  }, [riskLogs]);

  const riskAlertKey = useMemo(() => {
    return riskAlertStudents
      .map((student) => `${student.studentId}:${student.count}:${student.latestAt}`)
      .join("|");
  }, [riskAlertStudents]);

  const isRiskAlertHidden =
    riskAlertStudents.length > 0 &&
    riskAlertKey !== "" &&
    dismissedRiskAlertDate === todayString &&
    dismissedRiskAlertKey === riskAlertKey;

  const selectedStudentName = useMemo(() => {
    return students.find((student) => student.id === selectedStudentId)?.name ?? "";
  }, [selectedStudentId, students]);

  const filteredPeriodLogs = useMemo(() => {
    if (!selectedStudentId) {
      return periodLogs;
    }

    return periodLogs.filter((log) => log.student_id === selectedStudentId);
  }, [periodLogs, selectedStudentId]);

  const activeStudentCount = useMemo(() => {
    return new Set(filteredPeriodLogs.map((log) => log.student_id)).size;
  }, [filteredPeriodLogs]);

  const totalStudentCountInPeriod = useMemo(() => {
    return new Set(periodLogs.map((log) => log.student_id)).size;
  }, [periodLogs]);

  const periodDays = useMemo(() => {
    return getDaysInclusive(periodStartDate, periodEndDate);
  }, [periodEndDate, periodStartDate]);

  const periodTopEmotion = useMemo(() => {
    return getTopEmotion(filteredPeriodLogs);
  }, [filteredPeriodLogs]);

  const periodAverageLogsPerStudent = useMemo(() => {
    if (activeStudentCount === 0) {
      return 0;
    }

    return filteredPeriodLogs.length / activeStudentCount;
  }, [activeStudentCount, filteredPeriodLogs.length]);

  const periodLabel = useMemo(() => {
    return formatPeriodLabel(periodStartDate, periodEndDate);
  }, [periodEndDate, periodStartDate]);

  return (
    <main className="teacher-market min-h-screen bg-slate-50 p-6">
      <div className="teacher-market__shell mx-auto max-w-6xl">
        <h1 className="mb-6 text-3xl font-bold">교사용 감정 출석부</h1>

        {riskAlertStudents.length > 0 && hasLoadedRiskAlertPreference && !isRiskAlertHidden && (
          <section className="mb-8 rounded-3xl border border-red-200 bg-red-50 p-6 shadow">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-red-900">위험 신호 누적 알림</h2>
                <p className="mt-2 text-sm text-red-800">
                  최근 5일 동안 부정 감정을 3회 이상 기록한 학생이 있어요. 빠른 확인이 필요합니다.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-red-700">
                  자동 감지 {riskAlertStudents.length}명
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDismissedRiskAlertKey(riskAlertKey);
                    setDismissedRiskAlertDate(todayString);
                  }}
                  className="rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                >
                  확인하고 숨기기
                </button>
            </div>

            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {riskAlertStudents.map((student) => (
                <button
                  key={student.studentId}
                  type="button"
                  onClick={() => focusStudentPeriodStats(student.studentId)}
                  className="rounded-2xl border border-red-200 bg-white p-4 text-left"
                >
                  <div className="font-bold text-red-900">{student.name}</div>
                  <div className="mt-2 text-sm font-semibold text-red-700">
                    최근 5일 부정 감정 {student.count}회
                  </div>
                  <div className="mt-1 text-sm text-red-800">
                    최근 기록 {new Date(student.latestAt).toLocaleDateString("ko-KR")}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {riskAlertStudents.length > 0 && hasLoadedRiskAlertPreference && isRiskAlertHidden && (
          <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-4 shadow">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm font-medium text-slate-600">
                위험 신호 누적 알림을 숨겨 두었습니다. 현재 {riskAlertStudents.length}명의 학생이 감지되어 있어요.
              </p>
              <button
                type="button"
                onClick={() => {
                  setDismissedRiskAlertKey("");
                  setDismissedRiskAlertDate("");
                }}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                알림 다시 보기
              </button>
            </div>
          </section>
        )}

        <section className="mb-8 rounded-3xl bg-white p-6 shadow">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold">학생 관리와 오늘 기록</h2>
              <p className="text-sm text-gray-600">
                학생 이름을 관리하고, 오늘 제출한 감정과 메모를 함께 확인할 수 있어요.
              </p>
            </div>
            <div className="flex flex-col gap-2 md:items-end">
              <div className="text-sm font-semibold text-slate-500">
                제출 {todayLogs.length}건 / 학생 {students.length}명
              </div>
              <button
                type="button"
                onClick={() => {
                  setMessage("");
                  setIsBulkModalOpen(true);
                }}
                className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
              >
                학생 일괄 등록
              </button>
            </div>
          </div>

          {message && !isBulkModalOpen && (
            <p className="mb-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              {message}
            </p>
          )}

          {students.length === 0 ? (
            <p className="text-gray-500">등록된 학생이 없습니다.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {todayStudentStatuses.map(({ student, todayLog, needsAttention }) => {
                const isEditing = editingStudentId === student.id;

                return (
                  <div
                    key={student.id}
                    className="flex min-h-48 flex-col justify-between gap-4 rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {isEditing ? (
                            <input
                              value={editingStudentName}
                              onChange={(e) => setEditingStudentName(e.target.value)}
                              className="w-full rounded-xl border px-3 py-2 text-base font-semibold"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => focusStudentPeriodStats(student.id)}
                              className="block max-w-full truncate text-left text-lg font-bold text-slate-900 underline decoration-transparent underline-offset-4 transition hover:decoration-slate-400"
                            >
                              {student.name}
                            </button>
                          )}
                        </div>
                        {needsAttention && (
                          <span
                            className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full bg-red-500"
                            aria-label="주의 표시"
                            title="주의가 필요한 오늘 기록"
                          />
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={
                            "rounded-full px-3 py-1 text-xs font-bold " +
                            (todayLog
                              ? ALL_EMOTION_BADGE_STYLES[todayLog.emotion] ?? "bg-slate-100 text-slate-700"
                              : "bg-slate-100 text-slate-600")
                          }
                        >
                          {todayLog ? ALL_EMOTION_LABELS[todayLog.emotion] ?? todayLog.emotion : "미제출"}
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                          {todayLog ? new Date(todayLog.recorded_at).toLocaleTimeString("ko-KR") : "오늘 미제출"}
                        </span>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-3">
                        <div className="text-xs font-semibold text-slate-500">오늘 기록</div>
                        <div className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-slate-700">
                          {todayLog?.note?.trim()
                            ? todayLog.note
                            : todayLog
                              ? "메모 없음"
                              : "아직 제출하지 않았어요."}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSaveStudentName(student.id)}
                            disabled={savingStudentId === student.id}
                            className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                          >
                            {savingStudentId === student.id ? "저장 중..." : "저장"}
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEditStudent}
                            className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700"
                          >
                            취소
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartEditStudent(student)}
                          className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700"
                        >
                          이름 수정
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteStudent(student)}
                        disabled={deletingStudentId === student.id}
                        className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-60"
                      >
                        {deletingStudentId === student.id ? "삭제 중..." : "학생 삭제"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section id="period-stats" className="mb-8 rounded-3xl bg-white p-6 shadow">
          <div className="mb-4 flex flex-col gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-bold">기간 선택 감정 통계</h2>
                <p className="text-sm text-gray-600">
                  시작일과 종료일을 직접 선택해 기간 통계를 보고, 학생 이름을 누르면 해당 학생 기준으로 바로 좁혀서 볼 수 있어요.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold">시작 날짜</label>
                <input
                  type="date"
                  value={periodStartDate}
                  onChange={(e) => setPeriodStartDate(e.target.value)}
                  className="w-full rounded-xl border p-3"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold">종료 날짜</label>
                <input
                  type="date"
                  value={periodEndDate}
                  onChange={(e) => setPeriodEndDate(e.target.value)}
                  className="w-full rounded-xl border p-3"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-slate-500">
                같은 날짜를 시작일과 종료일로 선택하면 하루 통계를 볼 수 있어요.
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedStudentId}
                  onChange={(e) => {
                    setSelectedStudentId(e.target.value);
                  }}
                  className="rounded-xl border px-3 py-2 text-sm"
                >
                  <option value="">전체 학생 보기</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                    </option>
                  ))}
                </select>

              </div>
            </div>
          </div>

          {periodError ? (
            <p className="rounded-2xl bg-red-50 p-4 font-medium text-red-700">{periodError}</p>
          ) : periodLogs.length === 0 ? (
            <p className="text-gray-500">선택한 기간에 기록이 없습니다.</p>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-slate-100 p-4">
                  <div className="text-sm text-slate-500">선택 기간</div>
                  <div className="mt-1 text-xl font-extrabold text-slate-800">{periodLabel}</div>
                  <div className="mt-1 text-sm text-slate-500">{periodDays}일</div>
                </div>

                <div className="rounded-2xl bg-slate-100 p-4">
                  <div className="text-sm text-slate-500">대상 학생</div>
                  <div className="mt-1 text-xl font-extrabold text-slate-800">
                    {selectedStudentId
                      ? selectedStudentName || "선택한 학생"
                      : totalStudentCountInPeriod + "명"}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {selectedStudentId ? "선택 학생 기준 통계" : "기간 내 응답 학생 수"}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-100 p-4">
                  <div className="text-sm text-slate-500">전체 기록 수</div>
                  <div className="mt-1 text-xl font-extrabold text-slate-800">
                    {filteredPeriodLogs.length}건
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    학생 1명당 평균 {periodAverageLogsPerStudent.toFixed(1)}건
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-100 p-4">
                  <div className="text-sm text-slate-500">가장 많은 감정</div>
                  <div className="mt-1 text-xl font-extrabold text-slate-800">
                    {periodTopEmotion ?? "기록 없음"}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    응답이 있는 감정만 요약합니다.
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-slate-200 p-5">
                <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">감정 막대그래프</h3>
                    <p className="text-sm text-slate-500">
                      {selectedStudentId
                        ? (selectedStudentName || "선택한 학생") + "의 기간 통계"
                        : "전체 학생 기간 통계"}
                      {" · 응답 없는 감정은 숨김"}
                    </p>
                  </div>
                  <div className="text-sm font-semibold text-slate-500">
                    집계 학생 수 {activeStudentCount}명
                  </div>
                </div>

                <EmotionBarChart
                  logs={filteredPeriodLogs}
                  emptyMessage="선택한 조건에 맞는 기간 기록이 없습니다."
                />
              </div>

              {selectedStudentId && (
                <div className="mt-6 rounded-3xl border border-slate-200 p-5">
                  <h3 className="text-lg font-bold text-slate-900">학생이 입력한 하고 싶은 말</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    선택한 기간 동안 {selectedStudentName || "선택한 학생"} 학생이 남긴 메모입니다.
                  </p>

                  {filteredPeriodLogs.some((log) => log.note?.trim()) ? (
                    <div className="mt-4 space-y-3">
                      {filteredPeriodLogs
                        .filter((log) => log.note?.trim())
                        .map((log) => (
                          <div key={log.id} className="rounded-2xl bg-slate-50 p-4">
                            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                              <div className="font-bold text-slate-800">
                                {ALL_EMOTION_LABELS[log.emotion] ?? log.emotion}
                              </div>
                              <div className="text-sm text-slate-500">
                                {new Date(log.recorded_at).toLocaleString("ko-KR")}
                              </div>
                            </div>
                            <p className="mt-2 text-sm text-slate-700">{log.note}</p>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                      선택한 기간에 입력한 하고 싶은 말이 없습니다.
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {selectedStudentId && (
            <div className="mt-6 space-y-3">
              <div className="rounded-3xl border border-slate-200 p-5">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">감정 흐름 선 그래프</h3>
                    <p className="text-sm text-slate-500">
                      {selectedStudentName} 학생의 선택 기간 감정 변화를 선으로 보여줍니다.
                    </p>
                  </div>
                </div>

                <EmotionFlowLineChart
                  logs={filteredPeriodLogs}
                  startDateString={periodStartDate}
                  endDateString={periodEndDate}
                />
              </div>
            </div>
          )}
        </section>

        {isBulkModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-student-modal-title"
          >
            <div className="w-full max-w-xl rounded-[2rem] border border-white/70 bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 id="bulk-student-modal-title" className="text-2xl font-black text-slate-900">
                    학생 일괄 등록
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    학생 이름을 한 줄에 한 명씩 입력하세요.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  disabled={loading}
                  className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
                >
                  닫기
                </button>
              </div>

              <textarea
                value={bulkNames}
                onChange={(e) => setBulkNames(e.target.value)}
                rows={8}
                className="w-full rounded-2xl border p-4"
                placeholder={"김민준\n이서연\n박지호\n최유나"}
              />

              {message && (
                <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                  {message}
                </p>
              )}

              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  disabled={loading}
                  className="rounded-full bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleBulkInsert}
                  disabled={loading}
                  className="rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
                >
                  {loading ? "등록 중..." : "등록하기"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}

