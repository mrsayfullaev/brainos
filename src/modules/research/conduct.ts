/**
 * V4 Research Agent — разбивка запроса, поиск, синтез отчёта
 */

import { prisma } from '../../database/client';
import { encrypt, decrypt } from '../../utils/encryption';
import { systemLLMGenerate } from '../../ai/system-llm';
import { raceAIProviders } from '../../ai/race';
import { buildSystemPrompt } from '../systemPrompt';
import { logger } from '../../utils/logger';
import { webSearch, webFetchContent } from './search';
import type { User } from '@prisma/client';

export async function conductResearch(
  userId: string,
  user: User,
  query: string
): Promise<string> {
  const report = await prisma.researchReport.create({
    data: {
      userId,
      query: encrypt(query) ?? query,
      status: 'IN_PROGRESS',
    },
  });

  try {
    const langName = user.language === 'ru' ? 'Russian' : user.language === 'en' ? 'English' : 'Russian';

    const breakdownPrompt = `Break this research question into 3-5 specific sub-queries. Respond ONLY with a JSON array of strings, no other text.
Example: ["sub-query 1", "sub-query 2"]
Question: "${query}"`;

    const breakdownRaw = await systemLLMGenerate(breakdownPrompt, { language: langName });
    const cleanJson = breakdownRaw.replace(/```\w*\n?/g, '').replace(/```/g, '').trim();
    let subQueries: string[] = [];
    try {
      subQueries = JSON.parse(cleanJson);
      if (!Array.isArray(subQueries)) subQueries = [query];
    } catch {
      subQueries = [query];
    }

    const encryptedSub = subQueries.map((q) => encrypt(q) ?? q);
    await prisma.researchReport.update({
      where: { id: report.id },
      data: { subQueries: encryptedSub },
    });

    const allFindings: { query: string; url: string; title: string; content: string }[] = [];
    for (const subQuery of subQueries) {
      const results = await webSearch(subQuery, 3);
      for (const r of results) {
        let content = r.content;
        if (!content && r.url) {
          try {
            content = await webFetchContent(r.url, 3000);
          } catch {
            content = '';
          }
        }
        allFindings.push({
          query: subQuery,
          url: r.url,
          title: r.title,
          content: content.slice(0, 5000),
        });
      }
    }

    const systemPrompt = buildSystemPrompt(user);
    const synthesisPrompt = `You conducted research on: "${query}"

Findings from ${allFindings.length} sources:
${allFindings
  .map(
    (f, i) =>
      `[${i + 1}] ${f.title} (${f.url})\n${f.content || '(no content)'}`
  )
  .join('\n---\n')}

Create a short research report in ${user.language}:
1. Executive summary (2-3 sentences)
2. Key findings (bullet points)
3. Brief recommendations or conclusions
4. Sources (numbered list)

Keep under 600 words.`;

    const result = await raceAIProviders(systemPrompt, synthesisPrompt, user.language);
    const reportText = result.winner.response;

    await prisma.researchReport.update({
      where: { id: report.id },
      data: {
        findings: allFindings as object,
        report: encrypt(reportText) ?? reportText,
        sources: allFindings.map((f) => ({ url: f.url, title: f.title })),
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    return reportText;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Research failed:', err);
    await prisma.researchReport.update({
      where: { id: report.id },
      data: { status: 'FAILED', completedAt: new Date() },
    });
    throw new Error(message);
  }
}

export async function getReportDecrypted(reportId: string) {
  const r = await prisma.researchReport.findUnique({
    where: { id: reportId },
  });
  if (!r) return null;
  return {
    ...r,
    query: decrypt(r.query) ?? r.query,
    subQueries: r.subQueries.map((q) => decrypt(q) ?? q),
    report: r.report ? decrypt(r.report) ?? r.report : null,
  };
}
