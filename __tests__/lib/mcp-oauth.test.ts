/**
 * @jest-environment node
 */
import { createHash } from "crypto"

import { isInEatingWindow } from "@/lib/fasting"
import { isAllowedRedirectUri, verifyPkce } from "@/lib/mcp/oauth"

jest.mock("@/lib/db", () => ({ db: {} }))

describe("isAllowedRedirectUri", () => {
  it("accepts https and localhost http", () => {
    expect(isAllowedRedirectUri("https://claude.ai/api/mcp/auth_callback")).toBe(true)
    expect(isAllowedRedirectUri("http://localhost:6274/cb")).toBe(true)
    expect(isAllowedRedirectUri("http://127.0.0.1/cb")).toBe(true)
  })

  it("rejects plain http hosts, fragments and junk", () => {
    expect(isAllowedRedirectUri("http://evil.com/cb")).toBe(false)
    expect(isAllowedRedirectUri("https://claude.ai/cb#frag")).toBe(false)
    expect(isAllowedRedirectUri("javascript:alert(1)")).toBe(false)
    expect(isAllowedRedirectUri("not a url")).toBe(false)
  })
})

describe("verifyPkce", () => {
  const verifier = "a".repeat(43)
  const challenge = createHash("sha256").update(verifier).digest("base64url")

  it("accepts the matching S256 verifier", () => {
    expect(verifyPkce(verifier, challenge)).toBe(true)
  })

  it("rejects a wrong or too-short verifier", () => {
    expect(verifyPkce("b".repeat(43), challenge)).toBe(false)
    expect(verifyPkce("short", createHash("sha256").update("short").digest("base64url"))).toBe(false)
  })
})

describe("isInEatingWindow", () => {
  it("handles a same-day window", () => {
    expect(isInEatingWindow(12, 12, 20)).toBe(true)
    expect(isInEatingWindow(19, 12, 20)).toBe(true)
    expect(isInEatingWindow(20, 12, 20)).toBe(false)
    expect(isInEatingWindow(8, 12, 20)).toBe(false)
  })

  it("handles a window that wraps midnight", () => {
    expect(isInEatingWindow(23, 22, 6)).toBe(true)
    expect(isInEatingWindow(3, 22, 6)).toBe(true)
    expect(isInEatingWindow(12, 22, 6)).toBe(false)
  })
})
