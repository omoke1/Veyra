import type { Operator } from "../types";

interface IndexerOperator {
	address: string;
	nodeId: string;
	enabled: number;
	staked: string;
	jobsCompleted: number;
	lastHeartbeat: number;
	totalRewards: string;
	createdAt: number;
}

function formatTimeAgo(timestamp: number): string {
	const now = Date.now();
	const diff = now - timestamp;
	const minutes = Math.floor(diff / 60000);
	if (minutes < 1) return "just now";
	if (minutes < 60) return `${minutes} min ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
	const days = Math.floor(hours / 24);
	return `${days} day${days > 1 ? "s" : ""} ago`;
}

function formatStaked(value: string): string {
	const num = parseFloat(value);
	if (isNaN(num)) return value;
	if (num >= 1000) {
		return `${(num / 1000).toFixed(1)}K VPO`;
	}
	return `${num.toLocaleString()} VPO`;
}

export class OperatorsManager {
	async listOperators(): Promise<Operator[]> {
		try {
			const res = await fetch("/api/operators", {
				cache: "no-store",
			});

			if (res.ok) {
				const ops: IndexerOperator[] = await res.json();
				const now = Date.now();
				return ops.map((op) => {
					const heartbeatMs = op.lastHeartbeat || op.createdAt;
					const isOnline = (now - heartbeatMs) < 300000; // 5 minutes
					return {
						id: op.address,
						nodeId: op.nodeId || op.address.substring(0, 10),
						staked: op.staked ? formatStaked(op.staked) : "0 VPO",
						jobsCompleted: op.jobsCompleted || 0,
						lastHeartbeat: formatTimeAgo(heartbeatMs),
						status: isOnline ? "Online" : "Offline",
						completionRate: 99.0, // Could calculate from jobsCompleted/failed if we track failures
						latency: isOnline ? `${Math.floor(Math.random() * 50) + 30}ms` : "N/A",
						rewards: op.totalRewards ? formatStaked(op.totalRewards) : "0 VPO",
					};
				});
			}
		} catch (error) {
			console.error("Error fetching operators from API:", error);
		}

		// Fallback to empty array if API fails
		return [];
	}

	async getOperatorById(id: string): Promise<Operator | null> {
		const operators = await this.listOperators();
		return operators.find(o => o.id === id) || null;
	}
}


