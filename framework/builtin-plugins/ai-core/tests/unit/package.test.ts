import { describe, expect, it } from "bun:test";
import manifest from "../../package";

describe("plugin manifest", () => {
  it("keeps a stable package id and primary capability", () => {
    expect(manifest.id).toBe("ai-core");
    expect(manifest.kind).toBe("ai-pack");
    expect(manifest.providesCapabilities).toContain("ai.runtime");
    expect(manifest.requestedCapabilities).toContain("ai.model.invoke");
  });
});
