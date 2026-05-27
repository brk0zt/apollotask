<?php

namespace App\Services\Analytics;

use App\Models\Project;
use App\Models\Task;
use App\Models\EventStream;
use Carbon\Carbon;

class RiskScoringService
{
    /**
     * Jacobian Vector representing the partial derivatives of risk with respect to each metric:
     * J = [ dRisk/dm1, dRisk/dm2, dRisk/dm3, dRisk/dm4, dRisk/dm5 ]
     *
     * Grounded in first-order Taylor expansion for multivariate linearization.
     */
    protected array $jacobian = [
        'overdue_ratio'    => 0.35, // dRisk/dm1: High correlation with project failure
        'velocity_deficit' => 0.25, // dRisk/dm2: Velocity drop indicating bottlenecks
        'priority_density' => 0.15, // dRisk/dm3: Concentration of high-priority incomplete tasks
        'inactivity_decay' => 0.15, // dRisk/dm4: Days since last event stream log (abandonment)
        'backlog_weight'   => 0.10  // dRisk/dm5: Total incomplete tasks vs overall count
    ];

    /**
     * Compute the linearized risk score (0.0 to 1.0) and detailed Jacobian contribution breakdown.
     *
     * @param int $projectId
     * @return array
     */
    public function computeRiskScore(int $projectId): array
    {
        $project = Project::find($projectId);
        if (!$project) {
            return ['success' => false, 'message' => 'Project not found.'];
        }

        $tasks = Task::where('project_id', $projectId)->get();
        $totalTasks = $tasks->count();

        if ($totalTasks === 0) {
            return [
                'success' => true,
                'risk_score' => 0.0,
                'breakdown' => [],
                'message' => 'No tasks present; risk score is zero.'
            ];
        }

        $incompleteTasks = $tasks->where('status', '!=', 'completed');
        $completedTasks = $tasks->where('status', 'completed');

        // Metric 1: Overdue Task Ratio (m1)
        // Overdue ratio = count(overdue) / count(incomplete)
        $overdueCount = 0;
        foreach ($incompleteTasks as $task) {
            if ($task->due_date && Carbon::parse($task->due_date)->isPast()) {
                $overdueCount++;
            }
        }
        $m1 = $incompleteTasks->count() > 0 ? (float) ($overdueCount / $incompleteTasks->count()) : 0.0;

        // Metric 2: Velocity Deficit (m2)
        // Deficit = (target_velocity - current_velocity) / target_velocity (capped at 1.0)
        $m2 = $this->calculateVelocityDeficit($completedTasks);

        // Metric 3: Priority Density (m3)
        // Weighted density of incomplete tasks: sum(priority * 0.2) / count(incomplete)
        // Map priorities 1-5 to a 0.0-1.0 scale
        $prioritySum = 0.0;
        foreach ($incompleteTasks as $task) {
            $prioritySum += ($task->priority * 0.2); // Priority 5 -> 1.0, Priority 1 -> 0.2
        }
        $m3 = $incompleteTasks->count() > 0 ? (float) ($prioritySum / $incompleteTasks->count()) : 0.0;

        // Metric 4: Inactivity Decay (m4)
        // Capped ratio of days since last event stream log: min(1.0, days_since_last_event / 14.0)
        $m4 = $this->calculateInactivityDecay($projectId);

        // Metric 5: Backlog Weight (m5)
        // Backlog ratio = incomplete / total
        $m5 = (float) ($incompleteTasks->count() / $totalTasks);

        // Calculate Linearized Risk Score via Jacobian vector multiplication:
        // Risk = J · M = Σ (J_i * m_i)
        $riskScore = 0.0;
        $contributions = [];

        $metrics = [
            'overdue_ratio'    => $m1,
            'velocity_deficit' => $m2,
            'priority_density' => $m3,
            'inactivity_decay' => $m4,
            'backlog_weight'   => $m5
        ];

        foreach ($metrics as $key => $value) {
            $partialDerivative = $this->jacobian[$key];
            $contribution = $partialDerivative * $value;
            $riskScore += $contribution;

            $contributions[$key] = [
                'metric_value' => round($value, 4),
                'jacobian_sensitivity' => $partialDerivative,
                'risk_contribution' => round($contribution, 4),
                'percentage_impact' => 0.0 // computed below
            ];
        }

        // Clamp final risk score to [0.0, 1.0] range
        $riskScore = max(0.0, min(1.0, $riskScore));

        // Calculate percentage impact of each metric relative to final score
        if ($riskScore > 0) {
            foreach ($contributions as $key => &$data) {
                $data['percentage_impact'] = round(($data['risk_contribution'] / $riskScore) * 100, 2);
            }
        }

        // Persist computed risk score back to database for visibility
        $project->update([
            'risk_score' => $riskScore
        ]);

        return [
            'success' => true,
            'project_id' => $projectId,
            'risk_score' => round($riskScore, 4),
            'risk_level' => $this->getRiskLevelString($riskScore),
            'linearization_model' => 'Jacobian first-order Taylor expansion',
            'breakdown' => $contributions
        ];
    }

    /**
     * Compute velocity deficit compared to perfect estimation ratio of 1.0.
     */
    protected function calculateVelocityDeficit($completedTasks): float
    {
        if ($completedTasks->isEmpty()) {
            return 0.5; // Neutral deficit fallback when no tasks are complete
        }

        $totalEst = $completedTasks->sum('estimated_hours');
        $totalAct = $completedTasks->sum('actual_hours');

        if ($totalAct <= 0) {
            return 0.0;
        }

        $currentVelocity = $totalEst / $totalAct;
        $targetVelocity = 1.0; // Perfect estimation match

        if ($currentVelocity >= $targetVelocity) {
            return 0.0; // Overperforming or on track -> no velocity deficit risk
        }

        // Deficit percentage
        return (float) min(1.0, ($targetVelocity - $currentVelocity) / $targetVelocity);
    }

    /**
     * Compute inactivity decay from L1 event logs.
     */
    protected function calculateInactivityDecay(int $projectId): float
    {
        $lastEvent = EventStream::where('project_id', $projectId)
            ->orderBy('event_ts', 'desc')
            ->first();

        if (!$lastEvent) {
            return 0.8; // High fallback risk of inactivity if no event logs exist at all
        }

        $daysSince = Carbon::parse($lastEvent->event_ts)->diffInDays(Carbon::now());

        // Linearly decay risk over 14 days of absolute inactivity
        return (float) min(1.0, $daysSince / 14.0);
    }

    /**
     * Get descriptive risk tier.
     */
    protected function getRiskLevelString(float $score): string
    {
        if ($score >= 0.70) {
            return 'CRITICAL (CRITICAL RISK OF SPRINT FAILURE)';
        }
        if ($score >= 0.40) {
            return 'MEDIUM (ELEVATED RISK - MONITOR SYSTEM)';
        }
        return 'LOW (ON TRACK - NOMINAL STATE)';
    }
}
