"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Code, FileSearch, Github, Search, CheckCircle2, Copy } from "lucide-react";

export default function DocsPage(): React.ReactElement {
	const [proofCID, setProofCID] = useState("");
	const [apiResponse, setApiResponse] = useState<string | null>(null);
	const [webhookUrl, setWebhookUrl] = useState("");
	const [marketResolved, setMarketResolved] = useState(true);
	const [proofPosted, setProofPosted] = useState(true);
	const [jobFailed, setJobFailed] = useState(false);

	const handleGetProof = () => {
		if (proofCID) {
			setApiResponse(`{
  "jobId": "0x123abc",
  "result": "YES",
  "timestamp": "${new Date().toISOString().slice(0, 10)}",
  "computedBy": "Node_Alpha",
  "ipfsCID": "${proofCID}"
}`);
		}
	};

	const handleCopyCode = (code: string) => {
		navigator.clipboard.writeText(code);
	};

	return (
		<div className="space-y-4 sm:space-y-6">
			<h1 className="text-xl sm:text-2xl font-semibold">Developers</h1>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
				{/* Quick Start Guides */}
				<Card>
					<CardHeader>
						<CardTitle>Quick Start Guides</CardTitle>
						<CardDescription>Get started with Veyra integration</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<Button variant="outline" className="w-full justify-start">
							<BookOpen className="w-4 h-4 mr-2" />
							Connect a New Market via Adapter
						</Button>
						<Button variant="outline" className="w-full justify-start">
							<Code className="w-4 h-4 mr-2" />
							Sample Contract Interfaces
						</Button>
						<Button variant="outline" className="w-full justify-start">
							<FileSearch className="w-4 h-4 mr-2" />
							Deploy Your Own Adapter
						</Button>
						<Button variant="outline" className="w-full justify-start">
							<Github className="w-4 h-4 mr-2" />
							View on GitHub
						</Button>
					</CardContent>
				</Card>

				{/* API Playground */}
				<Card>
					<CardHeader>
						<CardTitle>API Playground</CardTitle>
						<CardDescription>Test Veyra endpoints directly</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="space-y-2">
							<label className="text-sm font-medium">Proof CID</label>
							<Input
								placeholder="bafy2bzaced..."
								value={proofCID}
								onChange={(e) => setProofCID(e.target.value)}
							/>
						</div>
						<div className="flex gap-2">
							<Button className="flex-1" onClick={handleGetProof}>
								<Search className="w-4 h-4 mr-2" />
								Get Proof
							</Button>
							<Button variant="outline" className="flex-1">
								<CheckCircle2 className="w-4 h-4 mr-2" />
								Verify
							</Button>
						</div>
						{apiResponse && (
							<>
								<Separator />
								<div className="bg-muted p-3 rounded-md">
									<code className="text-xs whitespace-pre-wrap">{apiResponse}</code>
								</div>
							</>
						)}
					</CardContent>
				</Card>
			</div>

			{/* SDK & Documentation */}
			<Card>
				<CardHeader>
					<CardTitle>SDK & Documentation</CardTitle>
					<CardDescription>Code snippets and integration examples</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<Tabs defaultValue="nodejs" className="w-full">
						<TabsList>
							<TabsTrigger value="nodejs">Node.js</TabsTrigger>
							<TabsTrigger value="solidity">Solidity</TabsTrigger>
							<TabsTrigger value="foundry">Foundry</TabsTrigger>
						</TabsList>
						<TabsContent value="nodejs" className="mt-4">
							<div className="bg-muted p-4 rounded-md">
								<code className="text-sm whitespace-pre-wrap">{`import { VeyraClient } from '@veyra/sdk';

const client = new VeyraClient({
  apiKey: 'your-api-key'
});

const proof = await client.getProof('bafy2bzaced...');
console.log(proof.result);`}</code>
							</div>
							<Button
								variant="outline"
								size="sm"
								className="mt-3"
								onClick={() => handleCopyCode(`import { VeyraClient } from '@veyra/sdk';

const client = new VeyraClient({
  apiKey: 'your-api-key'
});

const proof = await client.getProof('bafy2bzaced...');
console.log(proof.result);`)}
							>
								<Copy className="w-4 h-4 mr-2" />
								Copy Code
							</Button>
						</TabsContent>
						<TabsContent value="solidity" className="mt-4">
							<div className="bg-muted p-4 rounded-md">
								<code className="text-sm whitespace-pre-wrap">{`interface IVPOAdapter {
  function resolveMarket(
    bytes32 marketId
  ) external returns (bool);
}`}</code>
							</div>
							<Button
								variant="outline"
								size="sm"
								className="mt-3"
								onClick={() => handleCopyCode(`interface IVPOAdapter {
  function resolveMarket(
    bytes32 marketId
  ) external returns (bool);
}`)}
							>
								<Copy className="w-4 h-4 mr-2" />
								Copy Code
							</Button>
						</TabsContent>
						<TabsContent value="foundry" className="mt-4">
							<div className="bg-muted p-4 rounded-md">
								<code className="text-sm whitespace-pre-wrap">{`forge install veyra-protocol/veyra-contracts

import "veyra-contracts/VPOAdapter.sol";`}</code>
							</div>
							<Button
								variant="outline"
								size="sm"
								className="mt-3"
								onClick={() => handleCopyCode(`forge install veyra-protocol/veyra-contracts

import "veyra-contracts/VPOAdapter.sol";`)}
							>
								<Copy className="w-4 h-4 mr-2" />
								Copy Code
							</Button>
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>

			{/* Webhooks & Events */}
			<Card>
				<CardHeader>
					<CardTitle>Webhooks & Events</CardTitle>
					<CardDescription>Subscribe to real-time notifications</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="space-y-2">
						<label className="text-sm font-medium">Webhook URL</label>
						<Input
							placeholder="https://your-app.com/webhook"
							value={webhookUrl}
							onChange={(e) => setWebhookUrl(e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<label className="text-sm font-medium">Events</label>
						<div className="space-y-2">
							<label className="flex items-center gap-2">
								<input
									type="checkbox"
									className="rounded"
									checked={marketResolved}
									onChange={(e) => setMarketResolved(e.target.checked)}
								/>
								<span className="text-sm">Market Resolved</span>
							</label>
							<label className="flex items-center gap-2">
								<input
									type="checkbox"
									className="rounded"
									checked={proofPosted}
									onChange={(e) => setProofPosted(e.target.checked)}
								/>
								<span className="text-sm">Proof Posted</span>
							</label>
							<label className="flex items-center gap-2">
								<input
									type="checkbox"
									className="rounded"
									checked={jobFailed}
									onChange={(e) => setJobFailed(e.target.checked)}
								/>
								<span className="text-sm">Job Failed</span>
							</label>
						</div>
					</div>
					<Button>Subscribe</Button>
				</CardContent>
			</Card>
		</div>
	);
}


