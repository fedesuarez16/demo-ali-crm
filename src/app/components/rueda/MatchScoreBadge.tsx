'use client';

import React from 'react';
import { scoreTono, type ScoreTono } from '../../utils/ruedaUi';

const CLASES: Record<ScoreTono, string> = {
  verde: 'bg-green-50 text-green-800 border-green-200',
  ambar: 'bg-amber-50 text-amber-800 border-amber-200',
  gris: 'bg-gray-50 text-gray-600 border-gray-200',
};

export function MatchScoreBadge({ score }: { score: number }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${CLASES[scoreTono(score)]}`}
      title={`Puntaje de coincidencia: ${score}/100`}
    >
      {score}% MATCH
    </span>
  );
}
