import React from 'react';
import { QuestionVisual } from '../types/game';
import { MathText } from './MathText';

export const QuestionVisualView: React.FC<{ visual: QuestionVisual }> = ({ visual }) => {
  if (visual.type === 'table') {
    return (
      <div className="bg-slate-950/70 border border-slate-700/80 rounded-xl p-3 overflow-x-auto">
        {visual.title && (
          <div className="text-xs font-medium text-slate-300 mb-2">
            <MathText text={visual.title} />
          </div>
        )}
        <table className="w-full text-xs sm:text-sm text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-700 text-slate-300">
              {visual.headers.map((h, idx) => (
                <th key={idx} className="py-1.5 px-2.5 font-semibold whitespace-nowrap">
                  <MathText text={h} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visual.rows.map((row, rIdx) => (
              <tr key={rIdx} className="border-b border-slate-800/80 last:border-b-0">
                {row.map((cell, cIdx) => (
                  <td
                    key={cIdx}
                    className="py-1.5 px-2.5 text-slate-100 font-mono-num whitespace-nowrap"
                  >
                    <MathText text={String(cell)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (visual.type === 'steps') {
    return (
      <div className="bg-slate-950/70 border border-slate-700/80 rounded-xl p-3.5 space-y-2">
        <div className="text-xs font-semibold text-amber-400 mb-1">
          <MathText text={visual.title} />
        </div>
        {visual.steps.map((step, i) => (
          <div key={i} className="text-xs sm:text-sm font-mono-num text-slate-100 leading-relaxed">
            <MathText text={step} />
          </div>
        ))}
      </div>
    );
  }

  if (visual.type === 'boxPlot') {
    const W = 420;
    const padL = 68;
    const padR = 20;
    const rowH = 34;
    const H = 36 + visual.plots.length * rowH;
    const span = visual.maxAxis - visual.minAxis || 1;
    const toX = (v: number) => padL + ((v - visual.minAxis) / span) * (W - padL - padR);
    const ticks: number[] = [];
    for (let t = visual.minAxis; t <= visual.maxAxis; t += visual.step) {
      ticks.push(t);
    }

    return (
      <div className="bg-slate-950/70 border border-slate-700/80 rounded-xl p-3">
        {visual.title && (
          <div className="text-xs font-medium text-slate-300 mb-1">{visual.title}</div>
        )}
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto max-h-44">
          {ticks.map((t) => {
            const x = toX(t);
            return (
              <g key={t}>
                <line x1={x} y1={8} x2={x} y2={H - 22} stroke="#334155" strokeDasharray="3 3" />
                <text x={x} y={H - 6} textAnchor="middle" fill="#94a3b8" fontSize="10">
                  {t}
                </text>
              </g>
            );
          })}
          <line x1={padL} y1={H - 22} x2={W - padR} y2={H - 22} stroke="#64748b" />
          {visual.plots.map((p, idx) => {
            const cy = 22 + idx * rowH;
            const xMin = toX(p.min);
            const xQ1 = toX(p.q1);
            const xMed = toX(p.median);
            const xQ3 = toX(p.q3);
            const xMax = toX(p.max);
            return (
              <g key={p.label}>
                <text x={4} y={cy + 4} fill="#cbd5e1" fontSize="11" fontWeight="600">
                  {p.label}
                </text>
                <line x1={xMin} y1={cy} x2={xQ1} y2={cy} stroke="#38bdf8" strokeWidth="2" />
                <line x1={xQ3} y1={cy} x2={xMax} y2={cy} stroke="#38bdf8" strokeWidth="2" />
                <line x1={xMin} y1={cy - 6} x2={xMin} y2={cy + 6} stroke="#38bdf8" strokeWidth="2" />
                <line x1={xMax} y1={cy - 6} x2={xMax} y2={cy + 6} stroke="#38bdf8" strokeWidth="2" />
                <rect
                  x={xQ1}
                  y={cy - 10}
                  width={Math.max(2, xQ3 - xQ1)}
                  height={20}
                  fill="#0ea5e9"
                  fillOpacity="0.28"
                  stroke="#38bdf8"
                  strokeWidth="2"
                  rx="2"
                />
                <line x1={xMed} y1={cy - 10} x2={xMed} y2={cy + 10} stroke="#facc15" strokeWidth="2.5" />
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  if (visual.type === 'dotPlot') {
    const W = 420;
    const padL = 74;
    const padR = 20;
    const plotH = 54;
    const H = 26 + visual.plots.length * plotH;
    const span = visual.maxAxis - visual.minAxis || 1;
    const toX = (v: number) => padL + ((v - visual.minAxis) / span) * (W - padL - padR);
    const ticks: number[] = [];
    for (let t = visual.minAxis; t <= visual.maxAxis; t += 1) ticks.push(t);

    return (
      <div className="bg-slate-950/70 border border-slate-700/80 rounded-xl p-3">
        {visual.title && (
          <div className="text-xs font-medium text-slate-300 mb-1">{visual.title}</div>
        )}
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto max-h-40">
          {visual.plots.map((p, idx) => {
            const baseY = 44 + idx * plotH;
            return (
              <g key={p.label}>
                <text x={4} y={baseY - 12} fill="#cbd5e1" fontSize="11" fontWeight="600">
                  {p.label}
                </text>
                <line x1={padL - 8} y1={baseY} x2={W - padR + 8} y2={baseY} stroke="#64748b" />
                {p.values.map((pt) =>
                  Array.from({ length: pt.count }).map((_, cIdx) => (
                    <circle
                      key={`${pt.x}-${cIdx}`}
                      cx={toX(pt.x)}
                      cy={baseY - 7 - cIdx * 10}
                      r={4}
                      fill={idx === 0 ? '#38bdf8' : '#f59e0b'}
                    />
                  )),
                )}
              </g>
            );
          })}
          {ticks.map((t) => (
            <text key={t} x={toX(t)} y={H - 6} textAnchor="middle" fill="#94a3b8" fontSize="10">
              {t}
            </text>
          ))}
        </svg>
      </div>
    );
  }

  if (visual.type === 'scatter') {
    const W = 380;
    const H = 190;
    const padL = 42;
    const padR = 16;
    const padT = 14;
    const padB = 30;
    const toX = (x: number) => padL + (x / visual.maxX) * (W - padL - padR);
    const toY = (y: number) => H - padB - (y / visual.maxY) * (H - padT - padB);
    return (
      <div className="bg-slate-950/70 border border-slate-700/80 rounded-xl p-3">
        {visual.title && (
          <div className="text-xs font-medium text-slate-300 mb-1">{visual.title}</div>
        )}
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto max-h-44">
          <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="#64748b" />
          <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="#64748b" />
          {visual.line && (
            <line
              x1={toX(0)}
              y1={toY(visual.line.b)}
              x2={toX(visual.maxX)}
              y2={toY(visual.line.m * visual.maxX + visual.line.b)}
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="5 4"
            />
          )}
          {visual.points.map(([px, py], idx) => (
            <circle key={idx} cx={toX(px)} cy={toY(py)} r={4} fill="#38bdf8" />
          ))}
          <text x={(padL + W - padR) / 2} y={H - 6} textAnchor="middle" fill="#94a3b8" fontSize="10">
            {visual.xLabel}
          </text>
          <text x={8} y={padT + 10} fill="#94a3b8" fontSize="10">
            {visual.yLabel}
          </text>
        </svg>
      </div>
    );
  }

  if (visual.type === 'lineGraph') {
    const xMin = visual.xMin ?? -4;
    const xMax = visual.xMax ?? 6;
    const yMin = visual.yMin ?? -6;
    const yMax = visual.yMax ?? 6;
    const W = 360;
    const H = 190;
    const pad = 22;
    const toX = (x: number) => pad + ((x - xMin) / (xMax - xMin)) * (W - 2 * pad);
    const toY = (y: number) => H - pad - ((y - yMin) / (yMax - yMin)) * (H - 2 * pad);

    return (
      <div className="bg-slate-950/70 border border-slate-700/80 rounded-xl p-3">
        {visual.title && (
          <div className="text-xs font-medium text-slate-300 mb-1">
            <MathText text={visual.title} />
          </div>
        )}
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto max-h-44">
          <line x1={pad} y1={toY(0)} x2={W - pad} y2={toY(0)} stroke="#64748b" strokeWidth="1.5" />
          <line x1={toX(0)} y1={pad} x2={toX(0)} y2={H - pad} stroke="#64748b" strokeWidth="1.5" />
          <line
            x1={toX(xMin)}
            y1={toY(visual.m * xMin + visual.b)}
            x2={toX(xMax)}
            y2={toY(visual.m * xMax + visual.b)}
            stroke="#38bdf8"
            strokeWidth="2.5"
          />
          <circle cx={toX(0)} cy={toY(visual.b)} r={4.5} fill="#facc15" />
          <text x={toX(0) + 8} y={toY(visual.b) - 4} fill="#fde047" fontSize="10">
            (0, {visual.b})
          </text>
        </svg>
      </div>
    );
  }

  if (visual.type === 'parabola') {
    const xMin = visual.xMin ?? -2;
    const xMax = visual.xMax ?? 6;
    const yMin = visual.yMin ?? -4;
    const yMax = visual.yMax ?? 18;
    const W = 360;
    const H = 190;
    const pad = 26;
    const toX = (x: number) => pad + ((x - xMin) / (xMax - xMin)) * (W - 2 * pad);
    const toY = (y: number) => H - pad - ((y - yMin) / (yMax - yMin)) * (H - 2 * pad);

    const pts: string[] = [];
    for (let i = 0; i <= 40; i++) {
      const x = xMin + (i / 40) * (xMax - xMin);
      const y = visual.a * (x - visual.h) * (x - visual.h) + visual.k;
      if (y >= yMin - 2 && y <= yMax + 2) {
        pts.push(`${toX(x).toFixed(1)},${toY(y).toFixed(1)}`);
      }
    }

    return (
      <div className="bg-slate-950/70 border border-slate-700/80 rounded-xl p-3">
        {visual.title && (
          <div className="text-xs font-medium text-slate-300 mb-1">
            <MathText text={visual.title} />
          </div>
        )}
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto max-h-44">
          <line x1={pad} y1={toY(0)} x2={W - pad} y2={toY(0)} stroke="#64748b" strokeWidth="1.5" />
          <line x1={toX(0)} y1={pad} x2={toX(0)} y2={H - pad} stroke="#64748b" strokeWidth="1.5" />
          <polyline fill="none" stroke="#38bdf8" strokeWidth="2.5" points={pts.join(' ')} />
          <circle cx={toX(visual.h)} cy={toY(visual.k)} r={4.5} fill="#facc15" />
          <text x={toX(visual.h) + 6} y={toY(visual.k) - 6} fill="#fde047" fontSize="10">
            Vertex ({visual.h}, {visual.k})
          </text>
        </svg>
      </div>
    );
  }

  return null;
};
