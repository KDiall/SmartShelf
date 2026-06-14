import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const ourFileRouter = {
  stgUploader: f({ pdf: { maxFileSize: "16MB", maxFileCount: 10 } })
    .middleware(async ({ req }) => {
      return { isAdmin: true };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: "admin", url: file.url };
    }),
  medicineImageUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      return { isAdmin: true };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
