import { FIRST_TRADE_SVG } from "../badges/first-trade-svg";

interface AddResponse {
  readonly Hash?: unknown;
}

function endpoint(): string {
  const value = process.env["TIDE_IPFS_API_URL"]?.replace(/\/+$/, "");
  if (value === undefined || !/^https?:\/\//.test(value)) {
    throw new Error("TIDE_IPFS_API_URL http(s) requis (API RPC IPFS /api/v0/add)");
  }
  return value;
}

async function main(): Promise<void> {
  const form = new FormData();
  form.append(
    "file",
    new Blob([FIRST_TRADE_SVG], { type: "image/svg+xml" }),
    "tide-first-trade.svg",
  );
  const authorization = process.env["TIDE_IPFS_API_AUTH"];
  const response = await fetch(
    `${endpoint()}/api/v0/add?pin=true&cid-version=1&wrap-with-directory=false`,
    {
      method: "POST",
      headers: authorization === undefined ? {} : { authorization },
      body: form,
    },
  );
  const body = await response.text();
  if (!response.ok) throw new Error(`Pinning IPFS refusé (${String(response.status)})`);
  const lines = body.trim().split("\n");
  const last = lines.at(-1);
  if (last === undefined) throw new Error("Réponse IPFS vide");
  const parsed = JSON.parse(last) as AddResponse;
  if (typeof parsed.Hash !== "string" || parsed.Hash.trim() === "") {
    throw new Error("CID absent de la réponse IPFS");
  }
  console.log(`TIDE_FIRST_TRADE_IMAGE_URI=ipfs://${parsed.Hash}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
