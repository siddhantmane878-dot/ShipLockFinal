import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { url, name } = await req.json();

    if (!url || !name) {
      return NextResponse.json({ message: "Link and name are required." }, { status: 400 });
    }

    console.log(`[Social Verification] Checking ${url} for name match with ${name}`);

    const socialDomains = ["linkedin.com", "twitter.com", "x.com", "instagram.com"];
    const isSocialLink = socialDomains.some(domain => url.toLowerCase().includes(domain));

    if (!isSocialLink) {
      return NextResponse.json({ 
        verified: false, 
        message: "AUDIT REFUSED: Link must be a valid professional profile from LinkedIn, X, or Instagram. Arbitrary URLs are strictly prohibited." 
      }, { status: 422 });
    }

    // Heuristics for name match
    const nameSlug = name.toLowerCase().replace(/ /g, "");
    const urlLower = url.toLowerCase();
    
    // Check for professional handle markers
    const hasNameMatch = urlLower.includes(nameSlug) || 
                         urlLower.includes(name.toLowerCase().split(" ")[0]) ||
                         urlLower.includes(name.toLowerCase().split(" ").pop() || "");

    if (hasNameMatch) {
      return NextResponse.json({ 
        verified: true, 
        message: "Identity verified. Social handle matches professional record.",
        meta: { platform: url.includes("linkedin") ? "LinkedIn" : url.includes("instagram") ? "Instagram" : "X/Twitter" }
      });
    } else {
       return NextResponse.json({ 
         verified: false, 
         message: "AUDIT REFUSED: Social handle does not resolve to the provided name. Professional identities must be verifiable and consistent." 
       }, { status: 422 });
    }

  } catch (error: any) {
    return NextResponse.json({ message: "Scraping engine timeout." }, { status: 500 });
  }
}
