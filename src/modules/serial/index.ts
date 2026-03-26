/**
 * Phase 3 – Serial module entry point
 *
 * Re-exports the public API for starting/stopping serial ingestion.
 * Internal modules (transport, parser, service) should not be
 * imported directly from outside this folder.
 */

export { startSerialIngestion, stopSerialIngestion } from "./serialTransport";
export { serialDebugStore } from "./serialDebugStore";
export { clearDeviceCache } from "./serialTelemetryService";
