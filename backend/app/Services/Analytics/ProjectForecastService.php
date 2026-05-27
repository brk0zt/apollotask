<?php

namespace App\Services\Analytics;

use App\Models\Project;
use App\Models\Task;
use Carbon\Carbon;

class ProjectForecastService
{
    /**
     * Exponential Weighted Moving Average (EWMA) smoothing factor (alpha).
     */
    protected float $ewmaAlpha = 0.3;

    /**
     * Estimate the realistic project completion date using EWMA velocity smoothing
     * and Newton-Raphson convergence of nonlinear velocity drift.
     *
     * @param int $projectId
     * @return array
     */
    public function forecastCompletion(int $projectId): array
    {
        $project = Project::find($projectId);
        if (!$project) {
            return ['success' => false, 'message' => 'Project not found.'];
        }

        // 1. Fetch completed tasks chronologically to calculate velocity profile
        $completedTasks = Task::where('project_id', $projectId)
            ->where('status', 'completed')
            ->whereNotNull('completed_at')
            ->whereNotNull('estimated_hours')
            ->whereNotNull('actual_hours')
            ->orderBy('completed_at', 'asc')
            ->get();

        $incompleteTasks = Task::where('project_id', $projectId)
            ->where('status', '!=', 'completed')
            ->get();

        if ($completedTasks->count() < 3) {
            // Fallback to naive linear average estimation if historical data is sparse
            return $this->naiveLinearForecast($project, $completedTasks, $incompleteTasks);
        }

        // 2. Smooth velocity using EWMA (Exponential Weighted Moving Average)
        // Helps filter noise (bursty task completions) and capture underlying trend
        $velocities = [];
        $ewmaVelocities = [];
        $previousEwma = null;

        foreach ($completedTasks as $index => $task) {
            // Task velocity = estimated_hours / actual_hours
            // A velocity of 1.0 means perfect estimation, > 1.0 is ahead, < 1.0 is behind
            $taskVelocity = $task->actual_hours > 0 ? (float) ($task->estimated_hours / $task->actual_hours) : 1.0;
            $velocities[] = $taskVelocity;

            if ($index === 0) {
                $currentEwma = $taskVelocity;
            } else {
                $currentEwma = $this->ewmaAlpha * $taskVelocity + (1 - $this->ewmaAlpha) * $previousEwma;
            }
            $ewmaVelocities[] = $currentEwma;
            $previousEwma = $currentEwma;
        }

        // 3. Compute Nonlinear Velocity Drift (alpha coefficient)
        // Measures if the team is speeding up (learning curve) or slowing down (fatigue/debt)
        $n = count($ewmaVelocities);
        $firstHalfAvg = array_sum(array_slice($ewmaVelocities, 0, (int)($n / 2))) / (int)($n / 2);
        $secondHalfAvg = array_sum(array_slice($ewmaVelocities, (int)($n / 2))) / ($n - (int)($n / 2));

        // Drift coefficient: positive represents slowing down, negative represents accelerating
        // We model velocity at day x as: v(x) = base_velocity * e^(-drift * x)
        $baseVelocity = $secondHalfAvg; // Current smoothed velocity
        $velocityDiff = $firstHalfAvg - $secondHalfAvg;
        $drift = $velocityDiff * 0.05; // Scaling factor for daily drift estimation

        // 4. Calculate total estimated hours remaining (R)
        $totalEstimatedRemaining = $incompleteTasks->sum('estimated_hours');
        if ($totalEstimatedRemaining <= 0) {
            return [
                'success' => true,
                'forecasted_remaining_days' => 0.0,
                'estimated_completion_date' => Carbon::now()->toDateString(),
                'method' => 'Zero remaining work',
                'confidence' => 1.0,
            ];
        }

        // 5. Newton-Raphson velocity convergence (solving non-linear transcendental equation)
        // Equation: f(x) = x * v0 * e^(-drift * x) - R = 0
        // Derivative: f'(x) = v0 * e^(-drift * x) * (1 - drift * x)
        // Convergence goal: find remaining days x* in 3-5 iterations.
        $x = $totalEstimatedRemaining / ($baseVelocity > 0 ? $baseVelocity : 1.0); // Initial guess (linear)
        $maxIterations = 10;
        $tolerance = 0.0001;
        $iterationsRun = 0;
        $converged = false;

        for ($i = 0; $i < $maxIterations; $i++) {
            $iterationsRun++;
            $expTerm = exp(-$drift * $x);
            $fx = $x * $baseVelocity * $expTerm - $totalEstimatedRemaining;
            $dfx = $baseVelocity * $expTerm * (1.0 - $drift * $x);

            if (abs($dfx) < 0.000001) {
                break; // Prevent division by zero
            }

            $nextX = $x - $fx / $dfx;

            if (abs($nextX - $x) < $tolerance) {
                $x = $nextX;
                $converged = true;
                break;
            }

            $x = $nextX;
        }

        // Ensure remaining days is a positive logical number
        $remainingDays = max(0.1, $x);
        $completionDate = Carbon::now()->addDays(ceil($remainingDays));

        // Save estimated completion date to project row for database visibility
        $project->update([
            'estimated_completion' => $completionDate->toDateString(),
        ]);

        return [
            'success' => true,
            'completed_tasks_count' => $completedTasks->count(),
            'incomplete_tasks_count' => $incompleteTasks->count(),
            'base_velocity' => round($baseVelocity, 4),
            'velocity_drift_coefficient' => round($drift, 6),
            'total_estimated_remaining_hours' => round($totalEstimatedRemaining, 2),
            'forecasted_remaining_days' => round($remainingDays, 2),
            'estimated_completion_date' => $completionDate->toDateString(),
            'newton_raphson_iterations' => $iterationsRun,
            'newton_raphson_converged' => $converged,
            'method' => 'Newton-Raphson velocity convergence (EWMA-smoothed)',
            'confidence' => $converged ? 0.95 : 0.70,
        ];
    }

    /**
     * Fallback to naive linear extrapolation when historical task completion is sparse.
     */
    protected function naiveLinearForecast(Project $project, $completedTasks, $incompleteTasks): array
    {
        $totalEstimatedRemaining = $incompleteTasks->sum('estimated_hours');
        if ($totalEstimatedRemaining <= 0) {
            return [
                'success' => true,
                'forecasted_remaining_days' => 0.0,
                'estimated_completion_date' => Carbon::now()->toDateString(),
                'method' => 'Naive (No remaining work)',
                'confidence' => 0.50,
            ];
        }

        // Calculate average velocity from completed tasks or use 1.0 (default)
        $velocitySum = 0.0;
        $count = 0;
        foreach ($completedTasks as $task) {
            if ($task->actual_hours > 0) {
                $velocitySum += ($task->estimated_hours / $task->actual_hours);
                $count++;
            }
        }
        $avgVelocity = $count > 0 ? ($velocitySum / $count) : 1.0;

        // Naive days estimation (assuming constant 8-hour developer workday)
        $remainingDays = $totalEstimatedRemaining / ($avgVelocity * 8.0);
        $remainingDays = max(1.0, $remainingDays);
        $completionDate = Carbon::now()->addDays(ceil($remainingDays));

        $project->update([
            'estimated_completion' => $completionDate->toDateString(),
        ]);

        return [
            'success' => true,
            'completed_tasks_count' => $completedTasks->count(),
            'incomplete_tasks_count' => $incompleteTasks->count(),
            'base_velocity' => round($avgVelocity, 4),
            'velocity_drift_coefficient' => 0.0,
            'total_estimated_remaining_hours' => round($totalEstimatedRemaining, 2),
            'forecasted_remaining_days' => round($remainingDays, 2),
            'estimated_completion_date' => $completionDate->toDateString(),
            'method' => 'Naive Linear Extrapolation (Insufficient history)',
            'confidence' => 0.40,
        ];
    }
}
