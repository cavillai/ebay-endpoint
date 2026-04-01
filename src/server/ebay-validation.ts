import { z } from "zod";

export const searchVideoSchema = z.object({
  storeName: z.string().min(1).optional(),
  keyword: z.string().min(1),
  style: z.enum(["carousel", "showcase"]).default("carousel"),
  itemCount: z.coerce.number().min(1).max(10).default(3),
  format: z.enum(["mp4", "png"]).default("mp4"),
});

export const itemVideoSchema = z.object({
  itemId: z.string().min(1),
  style: z.enum(["showcase", "card"]).default("showcase"),
  format: z.enum(["mp4", "png"]).default("mp4"),
});

export type SearchVideoParams = z.infer<typeof searchVideoSchema>;
export type ItemVideoParams = z.infer<typeof itemVideoSchema>;
