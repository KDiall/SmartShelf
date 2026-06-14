import { createUploadthing, type FileRouter } from "uploadthing/next";
import { verifyToken } from "@/lib/jwt";

const f = createUploadthing();

async function assertAdmin(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    throw new Error("Unauthorized: missing auth token");
  }
  const payload = await verifyToken(auth.slice(7));
  if (!payload || payload.role !== "admin") {
    throw new Error("Forbidden: admin role required");
  }
  return { userId: payload.userId };
}

export const ourFileRouter = {
  stgUploader: f({ pdf: { maxFileSize: "16MB", maxFileCount: 10 } })
    .middleware(async ({ req }) => {
      return assertAdmin(req);
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.url };
    }),
  medicineImageUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      const auth = req.headers.get("authorization");
      if (!auth || !auth.startsWith("Bearer ")) {
        throw new Error("Unauthorized: missing auth token");
      }
      const payload = await verifyToken(auth.slice(7));
      if (!payload) {
        throw new Error("Unauthorized: invalid token");
      }
      return { userId: payload.userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
