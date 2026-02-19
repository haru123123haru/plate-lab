import { z } from "zod";

export const signUpSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6),
});

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createPlateSchema = z.object({
  name: z.string().min(1).max(200),
  plateTypeId: z.string().min(1),
  sampleName: z.string().max(200).optional(),
  reservoirTemplateId: z.number().nullable().optional(),
  screeningTemplateId: z.number().nullable().optional(),
  notes: z.string().max(2000).optional(),
  filledPositions: z.array(z.string()).optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.string().max(100).optional(),
  email: z.string().email().optional(),
  organization: z.string().max(200).optional(),
  bio: z.string().max(1000).optional(),
});
