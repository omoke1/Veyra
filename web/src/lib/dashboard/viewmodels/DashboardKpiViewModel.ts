import type { Kpis } from "../types";
import { TelemetryManager } from "../managers/TelemetryManager";

export class DashboardKpiViewModel {
	private readonly telemetry: TelemetryManager;
	private _kpis: Kpis | null = null;

	constructor(telemetry: TelemetryManager) {
		this.telemetry = telemetry;
	}

	get kpis(): Kpis | null {
		return this._kpis;
	}

	async refresh(): Promise<void> {
		this._kpis = await this.telemetry.getKpis();
	}
}



