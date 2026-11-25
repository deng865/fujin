import { Buffer } from "node:buffer";
import {
  AppStoreServerAPIClient,
  Environment,
  SignedDataVerifier,
  type JWSTransactionDecodedPayload,
} from "npm:@apple/app-store-server-library@3.1.0";

const BUNDLE_ID = "life.fujin.app";
const ROOT_URLS = [
  "https://www.apple.com/appleca/AppleIncRootCertificate.cer",
  "https://www.apple.com/certificateauthority/AppleRootCA-G2.cer",
  "https://www.apple.com/certificateauthority/AppleRootCA-G3.cer",
];
let rootsPromise: Promise<Buffer[]> | null = null;

function roots() {
  rootsPromise ??= Promise.all(ROOT_URLS.map(async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Unable to load Apple root certificates");
    return Buffer.from(await response.arrayBuffer());
  }));
  return rootsPromise;
}

function credentials() {
  const signingKey = Deno.env.get("APPLE_APP_STORE_PRIVATE_KEY");
  const keyId = Deno.env.get("APPLE_APP_STORE_KEY_ID");
  const issuerId = Deno.env.get("APPLE_APP_STORE_ISSUER_ID");
  if (!signingKey || !keyId || !issuerId) throw new Error("Apple App Store server credentials are not configured");
  return { signingKey, keyId, issuerId };
}

async function signedTransaction(transactionId: string, environment: Environment) {
  const { signingKey, keyId, issuerId } = credentials();
  const client = new AppStoreServerAPIClient(signingKey, keyId, issuerId, BUNDLE_ID, environment);
  const response = await client.getTransactionInfo(transactionId);
  if (!response.signedTransactionInfo) throw new Error("Apple returned no signed transaction");
  const appAppleIdText = Deno.env.get("APPLE_APP_STORE_APP_ID");
  const appAppleId = environment === Environment.PRODUCTION ? Number(appAppleIdText) : undefined;
  if (environment === Environment.PRODUCTION && !Number.isSafeInteger(appAppleId)) {
    throw new Error("Apple App Store app ID is not configured");
  }
  const verifier = new SignedDataVerifier(await roots(), true, environment, BUNDLE_ID, appAppleId);
  return await verifier.verifyAndDecodeTransaction(response.signedTransactionInfo);
}

export async function verifiedAppleTransaction(transactionId: string): Promise<JWSTransactionDecodedPayload> {
  try {
    return await signedTransaction(transactionId, Environment.PRODUCTION);
  } catch (productionError) {
    try {
      return await signedTransaction(transactionId, Environment.SANDBOX);
    } catch {
      console.error("Apple transaction verification failed", productionError);
      throw new Error("苹果无法核实这笔交易");
    }
  }
}
