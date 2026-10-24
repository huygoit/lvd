import { projectStageLabel } from "@/modules/customers/labels";

const stagePercent: Record<string, number> = {
  dang_khao_sat: 20,
  dang_bao_gia: 45,
  da_chot: 75,
  khong_trien_khai: 0,
};

export function stageProgress(stage: string) {
  const label = projectStageLabel[stage as keyof typeof projectStageLabel] ?? stage;
  return { label, percent: stagePercent[stage] ?? 0 };
}

export function ProjectProgress({ stage, large = false }: { stage: string; large?: boolean }) {
  const { label, percent } = stageProgress(stage);
  return (
    <div className={large ? "max-w-md" : "min-w-[180px]"}>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-ink">{label}</span>
        <span className="font-semibold text-primary">{percent}%</span>
      </div>
      <div
        className={large ? "h-2.5 overflow-hidden rounded-full bg-white/80" : "h-2 overflow-hidden rounded-full bg-soft"}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
