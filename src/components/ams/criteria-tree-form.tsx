"use client";

export type Subtopic = { id: string; label: string; weight: number; order: number };
export type CriterionTopic = { id: string; label: string; order: number; subtopics: Subtopic[] };

export function CriteriaTreeForm({
  tree,
  ratings,
  setRatings,
  comments,
  setComments,
}: {
  tree: CriterionTopic[];
  ratings: Record<string, number>;
  setRatings: (fn: (p: Record<string, number>) => Record<string, number>) => void;
  comments: Record<string, string>;
  setComments: (fn: (p: Record<string, string>) => Record<string, string>) => void;
}) {
  if (tree.length === 0) {
    return <p className="text-sm text-gray-400">No criteria configured for this phase.</p>;
  }

  return (
    <div className="space-y-5">
      {tree.map((topic) => (
        <div key={topic.id} className="space-y-3">
          <p className="text-sm font-semibold text-gray-800 border-b border-gray-100 pb-1">{topic.label}</p>
          <div className="space-y-3 pl-2">
            {topic.subtopics.map((sub) => (
              <div key={sub.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{sub.label}</span>
                  <span className="text-indigo-700 font-semibold w-8 text-right">
                    {ratings[sub.id] ?? "—"}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={ratings[sub.id] ?? 1}
                  onChange={(e) => setRatings((p) => ({ ...p, [sub.id]: Number(e.target.value) }))}
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-gray-300 select-none">
                  <span>1</span><span>10</span>
                </div>
              </div>
            ))}
          </div>
          <textarea
            value={comments[topic.id] ?? ""}
            onChange={(e) => setComments((p) => ({ ...p, [topic.id]: e.target.value }))}
            placeholder={`Comments on "${topic.label}" (optional)`}
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
          />
        </div>
      ))}
    </div>
  );
}
