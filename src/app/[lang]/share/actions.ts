"use server";
import { handleShare, type ShareState } from "@/lib/share-handler";

export async function shareSign(_prev: ShareState, f: FormData): Promise<ShareState> {
  return handleShare(f);
}
