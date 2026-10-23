import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTenantUser } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { fetchTenantReviews } from "@/lib/analytics";
import { toReviewVM } from "@/lib/viewmodels";
import { categoryForKeywords, safeKws } from "@/lib/health-score";
import { getScopedLocationIds } from "@/lib/tenant-scope";

const STAFF_RE = /\b(Amit|Priya|Rahul|Vikram|Sneha|Arjun|Anand|Meera|Rohit|Lakshmi|Manoj|Kavya|Deepak|Pooja|Rajesh|Sunil|Anita|Farah)\b/;

// Review monitor list with filters (doc Part 2 inbox spec:
// location · rating · sentiment · unanswered · staff mention · issue category)
export async function GET(req: Request) {
  try {
    const sess = await requireTenantUser();
    const scopedIds = await getScopedLocationIds(sess);
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "all";
    const minStars = Number(url.searchParams.get("minStars") || 0);
    const maxStars = Number(url.searchParams.get("maxStars") || 5);
    const locationId = url.searchParams.get("locationId") || "all";
    const sentiment = url.searchParams.get("sentiment") || "all";
    const staff = url.searchParams.get("staff") || "all";
    const category = url.searchParams.get("category") || "all";
    const q = (url.searchParams.get("q") || "").toLowerCase();
    // Date-range filter (doc §1B "Filter reviews by location, rating, date and response status")
    const days = Number(url.searchParams.get("days") || 0);

    const reviews = await fetchTenantReviews(sess.tenantId!, scopedIds);
    let vms = reviews.map((r) => toReviewVM(r));
    if (scopedIds && scopedIds.length > 0) {
      vms = vms.filter((r) => scopedIds.includes(r.locationId));
    }
    if (days > 0) {
      const cutoff = Date.now() - days * 86_400_000;
      vms = vms.filter((r) => new Date(r.createdAt).getTime() >= cutoff);
    }
    if (status !== "all") vms = vms.filter((r) => r.status === status);
    if (minStars > 0) vms = vms.filter((r) => r.stars >= minStars);
    if (maxStars < 5) vms = vms.filter((r) => r.stars <= maxStars);
    if (locationId !== "all") vms = vms.filter((r) => r.locationId === locationId);
    if (sentiment !== "all") vms = vms.filter((r) => r.sentiment === sentiment);
    if (staff !== "all") {
      vms = vms.filter((r) => {
        const hay = `${r.text} ${(r.keywords || []).join(" ")}`;
        return staff === "any" ? STAFF_RE.test(hay) : new RegExp(`\\b${staff}\\b`).test(hay);
      });
    }
    if (category !== "all") {
      vms = vms.filter((r) => categoryForKeywords(r.keywords || [], r.text) === category);
    }
    if (q) vms = vms.filter((r) => r.text.toLowerCase().includes(q) || r.author.toLowerCase().includes(q));

    return NextResponse.json({ reviews: vms, total: vms.length });
  } catch (err) {
    return handleError(err);
  }
}
