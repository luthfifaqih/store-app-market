import { z } from "zod";

export const phoneSchema = z.string().trim().refine(
  (value) => /^(?:08|\+?628)\d{7,11}$/.test(value.replace(/[\s-]+/g, "")),
  "Masukkan nomor HP Indonesia yang valid.",
);

export const quantitySchema = z.string().trim().transform((value) => value.replace(",", ".")).pipe(
  z.string().regex(/^\d{1,5}(?:\.\d{1,3})?$/, "Gunakan maksimal tiga angka desimal.")
    .refine((value) => Number(value) > 0, "Jumlah harus lebih dari nol."),
);
