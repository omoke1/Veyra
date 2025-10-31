import Link from "next/link"
import { fetchMarkets } from "@/lib/indexer"

export default async function DashboardPage() {
	const markets = await fetchMarkets()
	return (
		<div className="mx-auto max-w-5xl p-6 space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">Markets</h1>
				<Link href="/" className="text-sm text-blue-600 hover:underline">Home</Link>
			</div>
			<div className="rounded-lg border border-gray-200 overflow-hidden">
				<table className="w-full text-sm">
					<thead className="bg-gray-50 text-gray-600">
						<tr>
							<th className="px-4 py-2 text-left">Question</th>
							<th className="px-4 py-2 text-left">Market</th>
							<th className="px-4 py-2 text-left">Ends</th>
						</tr>
					</thead>
					<tbody>
						{markets.length === 0 && (
							<tr><td className="px-4 py-6 text-gray-500" colSpan={3}>No markets yet. Deploy a factory and create one.</td></tr>
						)}
						{markets.map((m) => (
							<tr key={m.address} className="border-t hover:bg-gray-50">
								<td className="px-4 py-2">
									<Link href={`/dashboard/${m.address}`} className="text-blue-600 hover:underline">{m.question}</Link>
								</td>
								<td className="px-4 py-2 font-mono text-xs">{m.address.slice(0,6)}…{m.address.slice(-4)}</td>
								<td className="px-4 py-2">{new Date(m.endTime * 1000).toLocaleString()}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}


