import React from 'react';
import { RiskScoringResponse } from '../../types/analytics';

interface RiskGaugeProps {
  data: RiskScoringResponse;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ data }) => {
  if (!data.success) {
    return (
      <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-white/60 text-center">
        Risk scoring could not be calculated.
      </div>
    );
  }

  const score = data.risk_score;
  
  // Resolve colors based on risk severity
  const getRiskColors = (val: number) => {
    if (val >= 0.70) return { text: 'text-rose-400', bg: 'bg-rose-500', border: 'border-rose-500/30', lightBg: 'bg-rose-500/10' };
    if (val >= 0.40) return { text: 'text-amber-400', bg: 'bg-amber-500', border: 'border-amber-500/30', lightBg: 'bg-amber-500/10' };
    return { text: 'text-emerald-400', bg: 'bg-emerald-500', border: 'border-emerald-500/30', lightBg: 'bg-emerald-500/10' };
  };

  const colors = getRiskColors(score);

  // Map metric keys to human-readable Turkish labels
  const metricLabels: Record<string, string> = {
    overdue_ratio: 'Overdue Task Ratio',
    velocity_deficit: 'Velocity Deficit',
    priority_density: 'Critical Task Density',
    inactivity_decay: 'Inactivity Decay',
    backlog_weight: 'Backlog Weight'
  };

  return (
    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur-md">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white">Jacobian Risk Score</h3>
        <p className="text-white/40 text-sm mt-0.5">
          Linearized risk matrix analysis of 5 different telemetry metrics
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Visual Score Display Gauge */}
        <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-white/5 border border-white/5 text-center">
          <div className="relative w-36 h-36 flex items-center justify-center">
            {/* SVG Background Ring and Progress Gauge */}
            <svg className="absolute w-full h-full transform -rotate-90">
              <circle
                cx="72"
                cy="72"
                r="64"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="10"
                fill="transparent"
              />
              <circle
                cx="72"
                cy="72"
                r="64"
                stroke={score >= 0.7 ? '#f43f5e' : score >= 0.4 ? '#f59e0b' : '#10b981'}
                strokeWidth="10"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 64}
                strokeDashoffset={2 * Math.PI * 64 * (1 - score)}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="flex flex-col items-center">
              <span className={`text-4xl font-extrabold tracking-tight ${colors.text}`}>
                {Math.round(score * 100)}%
              </span>
              <span className="text-white/40 text-[10px] uppercase font-bold tracking-widest mt-1">
                Risk Ratio
              </span>
            </div>
          </div>
          <span className={`mt-4 px-3 py-1 text-xs font-bold rounded-full ${colors.lightBg} ${colors.text} border ${colors.border}`}>
            {data.risk_level}
          </span>
        </div>

        {/* Jacobian Sensitivities & Metric Impact Breakdown */}
        <div className="col-span-2 space-y-4">
          <h4 className="font-semibold text-white text-sm">Metric Impact Distribution and Jacobian Sensitivities</h4>
          
          <div className="space-y-3">
            {Object.entries(data.breakdown).map(([key, contribution]) => (
              <div key={key} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/70 font-medium">{metricLabels[key] || key}</span>
                  <span className="text-white/40">
                    Partial Impact: <strong className="text-white/80">{contribution.percentage_impact}%</strong>
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${colors.bg}`}
                    style={{ width: `${contribution.percentage_impact}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-white/30">
                  <span>Measured Value: {contribution.metric_value.toFixed(2)}</span>
                  <span>Jacobian Sensitivity (∂Risk/∂m): {contribution.jacobian_sensitivity.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 p-3 rounded-lg bg-white/5 border border-white/5 text-[11px] text-white/50 text-center leading-relaxed">
        <strong>Mathematical Model:</strong> The project's multivariate state is resolved using a Taylor series linearization approach as
        <code className="text-amber-400 mx-1">Risk ≈ J · ΔM</code>. This approach models complex state transitions efficiently in
        <code className="text-amber-400 ml-1">O(m)</code> time complexity, preserving CPU resources.
      </div>
    </div>
  );
};
export default RiskGauge;
