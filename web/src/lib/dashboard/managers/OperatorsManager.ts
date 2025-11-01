import type { Operator } from "../types";

export class OperatorsManager {
	async listOperators(): Promise<Operator[]> {
		return [
			{
				id: "1",
				nodeId: "Node_Alpha",
				staked: "50,000 VPO",
				jobsCompleted: 1247,
				lastHeartbeat: "2 min ago",
				status: "Online",
				completionRate: 99.8,
				latency: "45ms",
				rewards: "12,450 VPO"
			},
			{
				id: "2",
				nodeId: "Node_Beta",
				staked: "35,000 VPO",
				jobsCompleted: 892,
				lastHeartbeat: "1 min ago",
				status: "Online",
				completionRate: 98.5,
				latency: "52ms",
				rewards: "8,920 VPO"
			},
			{
				id: "3",
				nodeId: "Node_Gamma",
				staked: "25,000 VPO",
				jobsCompleted: 654,
				lastHeartbeat: "15 min ago",
				status: "Offline",
				completionRate: 97.2,
				latency: "N/A",
				rewards: "6,540 VPO"
			}
		];
	}

	async getOperatorById(id: string): Promise<Operator | null> {
		const operators = await this.listOperators();
		return operators.find(o => o.id === id) || null;
	}
}

