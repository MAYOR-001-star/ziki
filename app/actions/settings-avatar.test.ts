import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth-helpers", () => ({ requireUser }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { update: vi.fn() } } }));

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { removeAvatarAction, updateAvatarAction } from "./settings";

const update = prisma.user.update as unknown as ReturnType<typeof vi.fn>;

const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

beforeEach(() => {
  vi.clearAllMocks();
  requireUser.mockResolvedValue({ id: "user-test", role: "user" });
  update.mockResolvedValue({ id: "user-test" });
});

describe("updateAvatarAction (#290, #576)", () => {
  it("rejects when no file is uploaded", async () => {
    const formData = new FormData();
    const result = await updateAvatarAction(undefined, formData);
    expect(result.ok).toBeUndefined();
    expect(result.error).toBe("Please select an image file to upload.");
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects non-image or scriptable files like SVG", async () => {
    const formData = new FormData();
    const svgFile = new File(["<svg></svg>"], "avatar.svg", { type: "image/svg+xml" });
    formData.set("avatar", svgFile);

    const result = await updateAvatarAction(undefined, formData);
    expect(result.ok).toBeUndefined();
    expect(result.error).toBe("Please choose a PNG, JPEG, WebP, or GIF image.");
    expect(update).not.toHaveBeenCalled();
  });

  it("successfully updates avatar with valid PNG and revalidates layout & profile paths", async () => {
    const formData = new FormData();
    const pngFile = new File([pngBytes], "avatar.png", { type: "image/png" });
    formData.set("avatar", pngFile);

    const result = await updateAvatarAction(undefined, formData);
    expect(result.ok).toBe(true);
    expect(result.image).toContain("data:image/png;base64,");

    expect(update).toHaveBeenCalledWith({
      where: { id: "user-test" },
      data: { image: expect.stringMatching(/^data:image\/png;base64,/) },
    });

    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/settings");
    expect(revalidatePath).toHaveBeenCalledWith("/settings/profile");
    expect(revalidatePath).toHaveBeenCalledWith("/users/user-test");
  });
});

describe("removeAvatarAction (#290, #576)", () => {
  it("clears avatar by setting user image to null and revalidates", async () => {
    const result = await removeAvatarAction();
    expect(result).toEqual({ ok: true, image: null });

    expect(update).toHaveBeenCalledWith({
      where: { id: "user-test" },
      data: { image: null },
    });

    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/settings");
    expect(revalidatePath).toHaveBeenCalledWith("/settings/profile");
    expect(revalidatePath).toHaveBeenCalledWith("/users/user-test");
  });
});

