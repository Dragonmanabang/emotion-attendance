"use client";

import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Student = {
  id: string;
  name: string;
};

type EmotionItem = {
  value: string;
  label: string;
  emoji: string;
  bg: string;
  border: string;
  text: string;
};

const EMOTIONS: EmotionItem[] = [
  {
    value: "happy",
    label: "행복해요",
    emoji: "😊",
    bg: "bg-yellow-100",
    border: "border-yellow-400",
    text: "text-yellow-700",
  },
  {
    value: "okay",
    label: "보통이에요",
    emoji: "😐",
    bg: "bg-green-100",
    border: "border-green-400",
    text: "text-green-700",
  },
  {
    value: "sad",
    label: "슬퍼요",
    emoji: "😢",
    bg: "bg-blue-100",
    border: "border-blue-400",
    text: "text-blue-700",
  },
  {
    value: "angry",
    label: "화나요",
    emoji: "😠",
    bg: "bg-red-100",
    border: "border-red-400",
    text: "text-red-700",
  },
  {
    value: "tired",
    label: "피곤해요",
    emoji: "😴",
    bg: "bg-purple-100",
    border: "border-purple-400",
    text: "text-purple-700",
  },
  {
    value: "worried",
    label: "걱정돼요",
    emoji: "😨",
    bg: "bg-orange-100",
    border: "border-orange-400",
    text: "text-orange-700",
  },
];

const EXTRA_EMOTIONS: EmotionItem[] = [
  {
    value: "excited",
    label: "신나요",
    emoji: "🤩",
    bg: "bg-amber-100",
    border: "border-amber-400",
    text: "text-amber-700",
  },
  {
    value: "proud",
    label: "뿌듯해요",
    emoji: "😎",
    bg: "bg-lime-100",
    border: "border-lime-400",
    text: "text-lime-700",
  },
  {
    value: "calm",
    label: "편안해요",
    emoji: "😌",
    bg: "bg-teal-100",
    border: "border-teal-400",
    text: "text-teal-700",
  },
  {
    value: "surprised",
    label: "놀랐어요",
    emoji: "😮",
    bg: "bg-cyan-100",
    border: "border-cyan-400",
    text: "text-cyan-700",
  },
  {
    value: "sleepy",
    label: "졸려요",
    emoji: "😪",
    bg: "bg-indigo-100",
    border: "border-indigo-400",
    text: "text-indigo-700",
  },
  {
    value: "bored",
    label: "심심해요",
    emoji: "😐",
    bg: "bg-slate-100",
    border: "border-slate-400",
    text: "text-slate-700",
  },
  {
    value: "lonely",
    label: "외로워요",
    emoji: "🥺",
    bg: "bg-sky-100",
    border: "border-sky-400",
    text: "text-sky-700",
  },
  {
    value: "scared",
    label: "무서워요",
    emoji: "😨",
    bg: "bg-violet-100",
    border: "border-violet-400",
    text: "text-violet-700",
  },
  {
    value: "embarrassed",
    label: "부끄러워요",
    emoji: "😳",
    bg: "bg-pink-100",
    border: "border-pink-400",
    text: "text-pink-700",
  },
  {
    value: "frustrated",
    label: "속상해요",
    emoji: "😣",
    bg: "bg-rose-100",
    border: "border-rose-400",
    text: "text-rose-700",
  },
];

const ALL_EMOTIONS = [...EMOTIONS, ...EXTRA_EMOTIONS];

const NOTE_OPTIONS_BY_EMOTION: Record<string, string[]> = {
  happy: ["친구와 재미있게 놀았어요", "칭찬을 받았어요", "기분 좋은 일이 있었어요"],
  okay: ["그냥 평범한 하루예요", "쉬는 시간이 즐거웠어요", "조금 심심했어요"],
  sad: ["속상한 일이 있었어요", "친구랑 마음이 상했어요", "부모님께 혼났어요", "선생님 도움이 필요해요"],
  angry: ["화나는 일이 있었어요", "마음이 진정이 안 돼요", "선생님 도움이 필요해요"],
  tired: ["어제 늦게 잤어요", "몸이 피곤해요", "쉬고 싶어요"],
  worried: ["걱정되는 일이 있어요", "도움이 필요해요", "선생님께 말하고 싶어요"],
};

const EXTRA_NOTE_OPTIONS_BY_EMOTION: Record<string, string[]> = {
  excited: ["재미있는 일이 생겼어요", "기다리던 시간이 다가와요", "얼른 하고 싶은 일이 있어요"],
  proud: ["내가 해낸 일이 있어요", "칭찬을 들어서 기뻐요", "열심히 해서 뿌듯해요"],
  calm: ["마음이 차분해졌어요", "편하게 쉬는 기분이에요", "지금은 괜찮고 안정돼요"],
  surprised: ["깜짝 놀란 일이 있었어요", "생각 못 한 일이 생겼어요", "갑자기 바뀐 일이 있어요"],
  sleepy: ["눈이 자꾸 감겨요", "조금 쉬고 싶어요", "몸이 노곤노곤해요"],
  bored: ["할 일이 없어서 심심해요", "시간이 천천히 가는 것 같아요", "재미있는 걸 하고 싶어요"],
  lonely: ["같이 놀 사람이 없다고 느꼈어요", "혼자 있는 기분이 들었어요", "누가 내 마음을 알아주면 좋겠어요"],
  scared: ["무서운 생각이 들어요", "깜짝 놀라서 무서웠어요", "도움이 필요해요"],
  embarrassed: ["실수해서 부끄러웠어요", "사람들이 나를 보는 것 같아요", "조금 숨고 싶은 기분이에요"],
  frustrated: ["생각처럼 잘 안 돼서 속상해요", "마음이 답답해요", "누가 내 마음을 알아주면 좋겠어요"],
};

const ALL_NOTE_OPTIONS_BY_EMOTION = {
  ...NOTE_OPTIONS_BY_EMOTION,
  ...EXTRA_NOTE_OPTIONS_BY_EMOTION,
};

const ALL_SUGGESTED_NOTES = new Set(Object.values(ALL_NOTE_OPTIONS_BY_EMOTION).flat());

function getTodayRange() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export default function StudentPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState("");
  const [emotion, setEmotion] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPraise, setShowPraise] = useState(false);
  const [savedStudentName, setSavedStudentName] = useState("");

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from("students")
      .select("id, name")
      .eq("is_active", true)
      .order("name");

    if (!error && data) {
      setStudents(data);
    }
  };

  const syncStudents = useEffectEvent(() => {
    void fetchStudents();
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    syncStudents();
  }, []);

  const selectedStudentName = useMemo(() => {
    return students.find((student) => student.id === studentId)?.name ?? savedStudentName;
  }, [savedStudentName, students, studentId]);

  const suggestedNoteOptions = useMemo(() => {
    return emotion ? ALL_NOTE_OPTIONS_BY_EMOTION[emotion] ?? [] : [];
  }, [emotion]);

  const customNoteValue = useMemo(() => {
    return suggestedNoteOptions.includes(note) ? "" : note;
  }, [note, suggestedNoteOptions]);

  const resetForm = () => {
    setStudentId("");
    setEmotion("");
    setNote("");

    if (typeof window !== "undefined") {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  const handleSubmit = async () => {
    setMessage("");

    if (!studentId) {
      setMessage("이름을 선택해 주세요.");
      return;
    }

    if (!emotion) {
      setMessage("오늘 기분을 선택해 주세요.");
      return;
    }

    setSubmitting(true);

    const { start, end } = getTodayRange();

    const { data: existingLog, error: selectError } = await supabase
      .from("emotion_logs")
      .select("id")
      .eq("student_id", studentId)
      .gte("recorded_at", start)
      .lte("recorded_at", end)
      .limit(1)
      .maybeSingle();

    if (selectError) {
      setSubmitting(false);
      setMessage("기록 확인 중 오류가 발생했어요.");
      return;
    }

    if (existingLog?.id) {
      const { error: updateError } = await supabase
        .from("emotion_logs")
        .update({
          emotion,
          note,
          recorded_at: new Date().toISOString(),
        })
        .eq("id", existingLog.id);

      setSubmitting(false);

      if (updateError) {
        setMessage("수정에 실패했어요.");
        return;
      }

      setSavedStudentName(selectedStudentName);
      setShowPraise(true);
      setMessage("오늘 기록을 수정했어요.");
      resetForm();
      return;
    }

    const { error: insertError } = await supabase.from("emotion_logs").insert({
      student_id: studentId,
      emotion,
      note,
      recorded_at: new Date().toISOString(),
    });

    setSubmitting(false);

    if (insertError) {
      setMessage("저장에 실패했어요.");
      return;
    }

    setSavedStudentName(selectedStudentName);
    setShowPraise(true);
    setMessage("오늘 기분이 저장되었어요.");
    resetForm();
  };

  return (
    <main className="min-h-screen bg-yellow-50 p-6">
      <div className="mx-auto max-w-2xl rounded-3xl bg-white p-6 shadow-lg">
        <h1 className="mb-6 text-3xl font-bold">감정 출석부</h1>

        <label className="mb-2 block text-lg font-bold">이름을 골라요</label>
        <select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="mb-3 w-full rounded-2xl border-2 border-gray-200 p-4 text-lg"
        >
          <option value="">이름을 선택하세요</option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.name}
            </option>
          ))}
        </select>

        <p className="mb-6 text-sm text-slate-500">이름을 고른 뒤 오늘 기분과 메모를 남겨요.</p>

        <label className="mb-3 block text-lg font-bold">오늘 기분은 어때요?</label>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {ALL_EMOTIONS.map((item) => {
            const isSelected = emotion === item.value;

            return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setEmotion(item.value);

                    if (
                      note &&
                      ALL_SUGGESTED_NOTES.has(note) &&
                      !(ALL_NOTE_OPTIONS_BY_EMOTION[item.value] ?? []).includes(note)
                    ) {
                      setNote("");
                    }
                  }}
                  className={`rounded-2xl border-2 p-4 text-center transition md:p-5 ${
                    item.bg
                  } ${item.text} ${
                  isSelected ? `${item.border} scale-[1.02] shadow-md` : "border-transparent"
                }`}
              >
                <div className="mb-2 text-4xl md:text-5xl">{item.emoji}</div>
                <div className="text-base font-bold md:text-lg">{item.label}</div>
              </button>
            );
          })}
        </div>

        <label className="mb-3 mt-6 block text-lg font-bold">하고 싶은 말이 있나요?</label>
        {!emotion ? (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
            먼저 오늘 기분을 고르면 그 감정에 맞는 하고 싶은 말 3가지를 보여줄게요.
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-slate-500">
              지금 마음과 가장 비슷한 말을 골라요. 없으면 아래에 직접 써도 괜찮아요.
            </p>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {suggestedNoteOptions.map((item) => {
                const isSelected = note === item;

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setNote(item)}
                    className={`rounded-2xl border-2 px-4 py-4 text-left text-base font-semibold transition ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-white text-gray-700"
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                직접 쓰기
              </label>
              <textarea
                value={customNoteValue}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full rounded-2xl border-2 border-gray-200 p-4 text-base"
                placeholder="하고 싶은 말이 없거나 다른 말이 있으면 여기에 직접 적어요."
              />
            </div>
          </>
        )}

        <div className="mt-4 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-gray-500">선택한 말</p>
          <p className="mt-1 text-base font-bold text-slate-700">
            {note || "선택하지 않았어요"}
          </p>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="mt-6 w-full rounded-2xl bg-blue-600 py-4 text-xl font-bold text-white disabled:opacity-60"
        >
          {submitting ? "저장 중..." : "저장하기"}
        </button>

        {message && (
          <p className="mt-4 text-center text-base font-semibold text-slate-700">{message}</p>
        )}
      </div>

      {showPraise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-6">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
            <div className="mb-4 text-6xl">🌟</div>
            <h2 className="mb-3 text-2xl font-bold">
              {selectedStudentName ? `${selectedStudentName}님,` : ""} 잘했어요!
            </h2>
            <p className="mb-6 text-lg text-gray-700">오늘 기분을 알려줘서 고마워요.</p>
            <button
              type="button"
              onClick={() => setShowPraise(false)}
              className="rounded-2xl bg-green-600 px-6 py-3 text-lg font-bold text-white"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
