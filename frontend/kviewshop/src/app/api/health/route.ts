import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const startTime = Date.now();

export async function GET() {
  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};

  // DB 연결 확인
  const dbStart = Date.now();
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    checks.database = { status: 'ok', latencyMs: Date.now() - dbStart };
  } catch (err) {
    checks.database = {
      status: 'error',
      latencyMs: Date.now() - dbStart,
      error: err instanceof Error ? err.message : 'Unknown',
    };
  }

  // 메모리 사용량
  const mem = process.memoryUsage();
  const memoryMB = {
    rss: Math.round(mem.rss / 1024 / 1024),
    heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
    heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
  };

  const allOk = Object.values(checks).every((c) => c.status === 'ok');

  return NextResponse.json(
    {
      status: allOk ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.round((Date.now() - startTime) / 1000),
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev',
      checks,
      memory: memoryMB,
    },
    {
      status: allOk ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
