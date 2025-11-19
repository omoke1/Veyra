import Link from "next/link"
import { fetchMarket } from "@/lib/indexer"
import { QuorumSection } from "@/components/markets/QuorumSection"

export default async function MarketDetail({ params }: { params: { address: string } }) {
	const m = await fetchMarket(params.address)
	if (!m) {
		return (
			<div className="mx-auto max-w-3xl p-6">
				<p className="text-gray-600">Market not found.</p>
				<Link className="text-blue-600 hover:underline" href="/dashboard">Back</Link>
			</div>
		)
	}
	
	// Use marketId as requestId for quorum display (in production, this would come from verification request)
	const requestId = m.marketId
	
	return (
		<div className="mx-auto max-w-3xl p-6 space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-xl font-semibold">{m.question}</h1>
				<Link className="text-sm text-blue-600 hover:underline" href="/dashboard">Back</Link>
			</div>
			
			<div className="rounded-lg border p-4 text-sm space-y-2">
				<div><span className="text-gray-500">Address:</span> <span className="font-mono">{m.address}</span></div>
				<div><span className="text-gray-500">MarketId:</span> <span className="font-mono break-all">{m.marketId}</span></div>
				<div><span className="text-gray-500">End time:</span> {new Date(m.endTime * 1000).toLocaleString()}</div>
				<div><span className="text-gray-500">Vault:</span> <span className="font-mono">{m.vault}</span></div>
			</div>
			
			{/* Quorum Consensus Section */}
			<div>
				<h2 className="text-lg font-semibold mb-4">Quorum Consensus</h2>
				<QuorumSection requestId={requestId} adapterAddress={m.oracle} />
			</div>
		</div>
	)
}
