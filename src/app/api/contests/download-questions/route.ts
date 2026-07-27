import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HackerRankClient } from "@/services/hackerrank-client";
import JSZip from "jszip";

import { jsPDF } from "jspdf";

function stripHtml(html: string) {
  let text = html;
  
  // Extract MathJax LaTeX source and replace the entire formula preview with it
  text = text.replace(/<script[^>]*type=["']math\/tex["'][^>]*>([\s\S]*?)<\/script>/gi, '$$$1$$');
  
  // Remove style, script, and svg tags completely including their content
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '');
  
  // Replace spacing tags with newlines before stripping
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<li[^>]*>/gi, '\n• ');
  
  // Strip the rest of HTML tags
  text = text.replace(/<[^>]+>/g, '');
  
  // Decode common entities
  text = text.replace(/&nbsp;/g, ' ')
             .replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/&amp;/g, '&')
             .replace(/&quot;/g, '"')
             .replace(/&#39;/g, "'");
             
  // Clean up excessive whitespace
  text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return text.trim();
}

export const maxDuration = 300; // Allow up to 5 minutes for large contests

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { error: "Missing contest slug" },
        { status: 400 }
      );
    }

    const cookie = process.env.HR_SESSION_COOKIE;
    if (!cookie) {
      return NextResponse.json(
        { error: "HR_SESSION_COOKIE not configured" },
        { status: 500 }
      );
    }

    // Get contest from DB
    const contest = await prisma.contest.findUnique({
      where: { slug },
      include: {
        problems: {
          select: { id: true, name: true, slug: true },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!contest) {
      return NextResponse.json(
        { error: "Contest not found" },
        { status: 404 }
      );
    }

    const client = new HackerRankClient({ cookie, delayMs: 50 });
    const zip = new JSZip();
    const contestFolder = zip.folder(slug)!;

    // README
    const readmeLines = [
      `Contest: ${contest.name}`,
      `Slug: ${contest.slug}`,
      `Problems: ${contest.problems.length}`,
      `Downloaded: ${new Date().toISOString()}`,
      "",
      "Structure:",
      "  {problem-slug}/",
      "    problem.html       - Full problem statement (HTML)",
      "    problem.pdf        - Full problem statement (PDF)",
      "    testcases/",
      "      input/inputNN.txt  - Test case input files",
      "      output/outputNN.txt - Expected output files",
    ];
    contestFolder.file("README.txt", readmeLines.join("\n"));

    // Fetch challenge list from HR to get numeric IDs
    const challenges = await client.getAllChallenges(slug);
    const challengeIdMap = new Map<string, number>();
    for (const ch of challenges) {
      challengeIdMap.set(ch.slug, ch.id);
    }

    const errors: string[] = [];

    // Process each problem
    for (const problem of contest.problems) {
      const problemFolder = contestFolder.folder(problem.slug)!;
      const challengeId = challengeIdMap.get(problem.slug);

      // Fetch challenge detail (problem statement)
      try {
        const detail = await client.getChallengeDetail(slug, problem.slug);
        const model = detail.model;
        
        let problemText = "";

        if (model?.body_html) {
          const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${model.name || problem.name}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #333; }
    pre { background: #f5f5f5; padding: 16px; border-radius: 8px; overflow-x: auto; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
    h1 { border-bottom: 2px solid #eee; padding-bottom: 12px; }
  </style>
</head>
<body>
  <h1>${model.name || problem.name}</h1>
  ${model.body_html}
</body>
</html>`;
          problemFolder.file("problem.html", htmlContent);
          problemText = stripHtml(model.body_html);
        } else if (model?.body) {
          problemFolder.file("problem.md", model.body);
          problemText = model.body;
        }

        // Generate PDF
        if (problemText) {
          const doc = new jsPDF();
          doc.setFontSize(18);
          doc.text(model?.name || problem.name, 10, 20);
          
          doc.setFontSize(11);
          // Split text into lines that fit on page
          const lines = doc.splitTextToSize(problemText, 190);
          let cursorY = 30;
          for (const line of lines) {
            if (cursorY > 280) {
              doc.addPage();
              cursorY = 20;
            }
            doc.text(line, 10, cursorY);
            cursorY += 6;
          }
          problemFolder.file("problem.pdf", doc.output('arraybuffer'));
        }

        // Add sample I/O if available
        if (model?.preview_input) {
          problemFolder.file("sample_input.txt", model.preview_input);
        }
        if (model?.preview_output) {
          problemFolder.file("sample_output.txt", model.preview_output);
        }
      } catch (err) {
        const msg = `Failed to fetch details for ${problem.slug}: ${err instanceof Error ? err.message : "Unknown error"}`;
        console.error(`[Download] ${msg}`);
        errors.push(msg);
      }

      // Fetch test cases via admin API
      if (!challengeId) {
        errors.push(
          `No HackerRank challenge ID found for ${problem.slug} — skipping test cases`
        );
        continue;
      }

      try {
        const tcResponse = await client.getChallengeTestCases(challengeId);

        // The response structure can vary — try multiple known formats
        // Could be { testcases: [...] }, { data: [...] }, { model: [...] }, or just [...]
        let testcases: any[];
        if (Array.isArray(tcResponse)) {
          testcases = tcResponse;
        } else {
          testcases =
            (tcResponse as any).testcases ||
            (tcResponse as any).data ||
            (tcResponse as any).model ||
            (tcResponse as any).models ||
            (tcResponse as any).test_cases ||
            [];
        }

        if (testcases.length === 0) {
          // Log the raw response keys for debugging
          const keys = typeof tcResponse === "object" ? Object.keys(tcResponse as object) : [];
          errors.push(
            `No test cases found for ${problem.slug} (response keys: ${keys.join(", ")})`
          );
          continue;
        }

        const inputFolder = problemFolder.folder("testcases/input")!;
        const outputFolder = problemFolder.folder("testcases/output")!;

        // Batch tasks for concurrency
        const tasks: (() => Promise<void>)[] = [];

        for (const tc of testcases) {
          const order = tc.order ?? tc.index ?? tc.id ?? 0;
          const idx = String(order).padStart(2, "0");

          const inputFileName =
            tc.input_file_name || tc.inputFileName || tc.input || `input${idx}.txt`;
          const outputFileName =
            tc.output_file_name || tc.outputFileName || tc.output || `output${idx}.txt`;

          if (tc.id) {
            // Task to download input
            tasks.push(async () => {
              try {
                const inputContent = await client.downloadTestCaseFile(
                  challengeId,
                  tc.id,
                  "input"
                );
                inputFolder.file(inputFileName, inputContent);
              } catch (err) {
                errors.push(
                  `Failed to download input${idx} for ${problem.slug}: ${err instanceof Error ? err.message : "Unknown"}`
                );
              }
            });

            // Task to download output
            tasks.push(async () => {
              try {
                const outputContent = await client.downloadTestCaseFile(
                  challengeId,
                  tc.id,
                  "output"
                );
                outputFolder.file(outputFileName, outputContent);
              } catch (err) {
                errors.push(
                  `Failed to download output${idx} for ${problem.slug}: ${err instanceof Error ? err.message : "Unknown"}`
                );
              }
            });
          } else {
            // If no testcase ID found, log available fields for debugging
            const tcKeys = Object.keys(tc);
            errors.push(
              `No testcase ID in test case ${idx} for ${problem.slug} (fields: ${tcKeys.join(", ")})`
            );
          }
        }

        // Execute in chunks to avoid overwhelming the server
        const concurrency = 3;
        for (let i = 0; i < tasks.length; i += concurrency) {
          const chunk = tasks.slice(i, i + concurrency);
          await Promise.all(chunk.map((task) => task()));
        }
      } catch (err) {
        const msg = `Failed to fetch test cases for ${problem.slug} (id: ${challengeId}): ${err instanceof Error ? err.message : "Unknown error"}`;
        console.error(`[Download] ${msg}`);
        errors.push(msg);
      }
    }

    // Add error log if any
    if (errors.length > 0) {
      contestFolder.file("errors.log", errors.join("\n"));
    }

    // Generate ZIP
    const zipData = await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    return new Response(zipData as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${slug}-questions.zip"`,
        "Content-Length": String(zipData.length),
      },
    });
  } catch (error) {
    console.error("[Download Questions]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to download questions",
      },
      { status: 500 }
    );
  }
}
