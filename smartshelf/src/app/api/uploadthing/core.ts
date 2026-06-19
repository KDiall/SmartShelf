import { createUploadthing, type FileRouter } from "uploadthing/next";
import { z } from "zod";
import { verifyToken } from "@/lib/jwt";

const f = createUploadthing();

async function verifyAuth(input: { token: string }) {
  const payload = await verifyToken(input.token);
  if (!payload) {
    console.error('[UploadThing] verifyAuth failed: invalid token');
    throw new Error("Unauthorized: invalid token");
  }
  return { userId: payload.userId, role: payload.role };
}

async function verifyAdmin(input: { token: string }) {
  const result = await verifyAuth(input);
  if (result.role !== "admin" && result.role !== "super_admin") {
    console.error(`[UploadThing] verifyAdmin failed: role=${result.role}`);
    throw new Error("Forbidden: admin or super_admin role required");
  }
  return { userId: result.userId };
}

export const ourFileRouter = {
  stgUploader: f({ pdf: { maxFileSize: "16MB", maxFileCount: 10 } })
    .input(z.object({ token: z.string() }))
    .middleware(async ({ input }) => {
      return verifyAdmin(input);
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl ?? file.url };
    }),
  medicineImageUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .input(z.object({ token: z.string() }))
    .middleware(async ({ input }) => {
      return verifyAuth(input);
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl ?? file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
