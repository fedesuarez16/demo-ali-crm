import { Fragment } from 'react';
import { cn } from '@/lib/utils';

const PIPELINE_STEPS = [200, 1, 2, 3, 4, 5, 6, 7, 8] as const;

type StepState = 'done' | 'actual' | 'next';

type SeguimientoPipelineProps = {
  count: number | null | undefined;
  className?: string;
};

function coerceCount(raw: number | string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
}

function getStepState(stepValue: number, count: number | null): StepState {
  if (count === null) return 'next';
  const currentIndex = PIPELINE_STEPS.findIndex((v) => v === count);
  if (currentIndex === -1) return 'next';
  const stepIndex = PIPELINE_STEPS.findIndex((v) => v === stepValue);
  if (stepIndex < currentIndex) return 'done';
  if (stepIndex === currentIndex) return 'actual';
  return 'next';
}

function getEdgeCaseMessage(count: number | null): string | null {
  if (count === null) return `Lead fuera del pipeline frío (count actual: sin valor)`;
  if (PIPELINE_STEPS.findIndex((v) => v === count) !== -1) return null;
  return `Lead fuera del pipeline frío (count actual: ${count})`;
}

function stateLabel(state: StepState): string {
  if (state === 'done') return 'enviado';
  if (state === 'actual') return 'actual';
  return 'próximo';
}

function stepAriaLabel(value: number, state: StepState): string {
  const stateText = stateLabel(state);
  if (value === 200) return `Inicial (200), ${stateText}`;
  return `Toque ${value}, ${stateText}`;
}

function StepNode({ value, state }: { value: number; state: StepState }) {
  const stateClass =
    state === 'done'
      ? 'bg-emerald-600 text-white'
      : state === 'actual'
      ? 'bg-amber-500 text-white ring-2 ring-amber-700 ring-offset-2'
      : 'bg-transparent text-slate-500 border border-slate-300';

  return (
    <li
      className={cn(
        'h-9 w-9 rounded-full inline-flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors',
        stateClass,
      )}
      aria-current={state === 'actual' ? 'step' : undefined}
      aria-label={stepAriaLabel(value, state)}
    >
      {value}
    </li>
  );
}

export function SeguimientoPipeline({ count, className }: SeguimientoPipelineProps) {
  const coerced = coerceCount(count);
  const edgeMsg = getEdgeCaseMessage(coerced);

  return (
    <div
      className={cn('flex flex-col gap-2', className)}
      role="group"
      aria-label="Pipeline de seguimientos"
    >
      {/* Leyenda */}
      <div className="flex items-center gap-3 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" aria-hidden />
          enviado
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500 ring-1 ring-amber-700" aria-hidden />
          actual
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full border border-slate-300" aria-hidden />
          próximo
        </span>
      </div>

      {/* Stepper */}
      <ol
        role="list"
        className="flex items-center overflow-x-auto pb-1"
        title={edgeMsg ?? undefined}
      >
        {PIPELINE_STEPS.map((stepValue, i) => (
          <Fragment key={stepValue}>
            <StepNode value={stepValue} state={getStepState(stepValue, coerced)} />
            {i < PIPELINE_STEPS.length - 1 && (
              <span aria-hidden className="h-px w-4 sm:w-5 bg-slate-200 flex-shrink-0" />
            )}
          </Fragment>
        ))}
      </ol>

      {edgeMsg && <p className="text-xs text-slate-500 italic">{edgeMsg}</p>}
    </div>
  );
}
