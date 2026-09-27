import { describe, expect, it, vi } from "vitest";
import { microsoftGraphRequest } from "./microsoft-graph.ts";

const allowMailFolders = (pathname: string) => pathname === "/v1.0/me/mailFolders";

describe("Microsoft Graph URL validation", () => {
  it("applies the pagination allowlist to root-relative URLs", async () => {
    const fetcher = vi.fn(async () => Response.json({}));

    await expect(
      microsoftGraphRequest("/v1.0/me/messages", {
        accessToken: "access-token",
        fetcher,
        label: "Microsoft Graph test",
        allowNextLink: allowMailFolders,
      }),
    ).rejects.toThrow("nextLink does not target an allowed Microsoft Graph endpoint");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("does not let a scheme-relative or dot-relative link skip the allowlist", async () => {
    for (const link of [
      "https:me/drive/root/children",
      "HTTPS:me/messages",
      "https:../beta/me/messages",
      "https:/v1.0/me/messages",
      "../beta/me/messages",
      "%2e%2e/beta/me/messages",
      "\\\\graph.microsoft.com\\v1.0\\me\\messages",
    ]) {
      const fetcher = vi.fn(async () => Response.json({}));

      await expect(
        microsoftGraphRequest(link, {
          accessToken: "access-token",
          fetcher,
          label: "Microsoft Graph test",
          allowNextLink: allowMailFolders,
        }),
      ).rejects.toMatchObject({ status: 400 });
      expect(fetcher).not.toHaveBeenCalled();
    }
  });

  it("resolves code-built relative paths against the v1.0 base", async () => {
    const fetcher = vi.fn(async (_input: URL | RequestInfo) => Response.json({}));

    await microsoftGraphRequest("me/messages", {
      accessToken: "access-token",
      fetcher,
      label: "Microsoft Graph test",
      allowNextLink: allowMailFolders,
    });

    expect(String(fetcher.mock.calls[0]?.[0])).toBe("https://graph.microsoft.com/v1.0/me/messages");
  });
});
