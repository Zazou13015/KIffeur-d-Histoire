import { NextRequest, NextResponse } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";
import { proxy } from "@/proxy";
import { updateSession } from "@/lib/supabase/proxy";

vi.mock("@/lib/supabase/proxy", () => ({ updateSession: vi.fn() }));
beforeEach(() => vi.clearAllMocks());

it("ouvre la démo sans contacter Supabase, même avec un cookie de session", async () => {
  const request = new NextRequest("http://localhost/demo/pedagogie", {
    headers: { Cookie: "sb-test-auth-token=session-fictive" },
  });
  expect((await proxy(request)).headers.get("x-middleware-next")).toBe("1");
  expect(updateSession).not.toHaveBeenCalled();
});

it("conserve le rafraîchissement de session sur les autres pages", async () => {
  const response = NextResponse.next();
  vi.mocked(updateSession).mockResolvedValue(response);
  const request = new NextRequest("http://localhost/partie/partie-fictive");
  expect(await proxy(request)).toBe(response);
  expect(updateSession).toHaveBeenCalledExactlyOnceWith(request);
});
