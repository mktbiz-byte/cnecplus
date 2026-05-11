/**
 * Apify Instagram Profile Scraper JSON 대용량 임포트 스크립트
 *
 * 3GB+ JSON 파일을 스트리밍으로 파싱하여 Creator DB에 upsert합니다.
 * - private 계정 스킵
 * - username 없는 레코드 스킵
 * - 기존 Creator가 있으면 IG 데이터 업데이트
 * - 없으면 User + Creator 신규 생성
 *
 * Usage:
 *   npx tsx scripts/import-apify-json-stream.ts --json <path-to-json>
 *   npx tsx scripts/import-apify-json-stream.ts --json <path> --skip 5000
 *   npx tsx scripts/import-apify-json-stream.ts --json <path> --dry-run
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

// ── CLI Args ────────────────────────────────────────────────────

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag)
  return idx !== -1 ? process.argv[idx + 1] : undefined
}

const JSON_PATH = getArg('--json')
const SKIP_COUNT = parseInt(getArg('--skip') ?? '0', 10)
const DRY_RUN = process.argv.includes('--dry-run')

if (!JSON_PATH) {
  console.error('Usage: npx tsx scripts/import-apify-json-stream.ts --json <path-to-json>')
  process.exit(1)
}

const resolvedPath = path.resolve(JSON_PATH)
if (!fs.existsSync(resolvedPath)) {
  console.error(`파일을 찾을 수 없습니다: ${resolvedPath}`)
  process.exit(1)
}

// ── Types ───────────────────────────────────────────────────────

interface LatestPost {
  likesCount?: number
  commentsCount?: number
  videoViewCount?: number
  displayUrl?: string
  type?: string
  timestamp?: string
  productType?: string
}

interface ApifyProfile {
  username?: string
  biography?: string
  followersCount?: number
  followsCount?: number
  postsCount?: number
  profilePicUrl?: string
  private?: boolean
  joinedRecently?: boolean
  latestPosts?: LatestPost[]
}

// ── Helpers ─────────────────────────────────────────────────────

function calcTier(followers: number): string {
  if (followers >= 1_000_000) return 'MEGA'
  if (followers >= 100_000) return 'MACRO'
  if (followers >= 10_000) return 'MICRO'
  if (followers >= 1_000) return 'NANO'
  return 'UNDER_1K'
}

function calcEngagementRate(posts: LatestPost[], followers: number): number {
  if (followers === 0 || !posts || posts.length === 0) return 0
  const total = posts.reduce(
    (sum, p) => sum + (p.likesCount ?? 0) + (p.commentsCount ?? 0),
    0,
  )
  return Number(((total / posts.length / followers) * 100).toFixed(2))
}

function calcAvgLikes(posts: LatestPost[]): number | null {
  if (!posts || posts.length === 0) return null
  const sum = posts.reduce((s, p) => s + (p.likesCount ?? 0), 0)
  return Math.round(sum / posts.length)
}

function calcAvgComments(posts: LatestPost[]): number | null {
  if (!posts || posts.length === 0) return null
  const sum = posts.reduce((s, p) => s + (p.commentsCount ?? 0), 0)
  return Math.round(sum / posts.length)
}

function calcAvgVideoViews(posts: LatestPost[]): number | null {
  const videos = (posts ?? []).filter(p => p.type === 'Video' && p.videoViewCount)
  if (videos.length === 0) return null
  const sum = videos.reduce((s, p) => s + (p.videoViewCount ?? 0), 0)
  return Math.round(sum / videos.length)
}

function calcAvgVideoLikes(posts: LatestPost[]): number | null {
  const videos = (posts ?? []).filter(p => p.type === 'Video')
  if (videos.length === 0) return null
  const sum = videos.reduce((s, p) => s + (p.likesCount ?? 0), 0)
  return Math.round(sum / videos.length)
}

// Feed = Sidecar, Image (non-video, non-reel)
function isFeedPost(p: LatestPost): boolean {
  return p.type !== 'Video' || p.productType === 'feed'
}

function isReelPost(p: LatestPost): boolean {
  return p.type === 'Video' && (p.productType === 'clips' || p.productType === 'reels')
}

function calcAvgFeedLikes(posts: LatestPost[]): number | null {
  const feeds = (posts ?? []).filter(isFeedPost)
  if (feeds.length === 0) return null
  const sum = feeds.reduce((s, p) => s + (p.likesCount ?? 0), 0)
  return Math.round(sum / feeds.length)
}

function calcAvgFeedComments(posts: LatestPost[]): number | null {
  const feeds = (posts ?? []).filter(isFeedPost)
  if (feeds.length === 0) return null
  const sum = feeds.reduce((s, p) => s + (p.commentsCount ?? 0), 0)
  return Math.round(sum / feeds.length)
}

function calcAvgReelViews(posts: LatestPost[]): number | null {
  const reels = (posts ?? []).filter(isReelPost)
  if (reels.length === 0) return null
  const sum = reels.reduce((s, p) => s + (p.videoViewCount ?? 0), 0)
  return Math.round(sum / reels.length)
}

function calcAvgReelLikes(posts: LatestPost[]): number | null {
  const reels = (posts ?? []).filter(isReelPost)
  if (reels.length === 0) return null
  const sum = reels.reduce((s, p) => s + (p.likesCount ?? 0), 0)
  return Math.round(sum / reels.length)
}

function getLastPostDate(posts: LatestPost[]): string | null {
  if (!posts || posts.length === 0) return null
  const timestamps = posts
    .map(p => p.timestamp)
    .filter((t): t is string => !!t)
    .sort()
    .reverse()
  return timestamps[0] ?? null
}

function getPostThumbnails(posts: LatestPost[], max = 6): string[] {
  return (posts ?? [])
    .slice(0, max)
    .map(p => p.displayUrl)
    .filter((url): url is string => !!url)
}

function truncate(s: string | null, max: number): string | null {
  if (s === null) return null
  const arr = Array.from(s)
  return arr.length <= max ? s : arr.slice(0, max).join('')
}

// ── Streaming JSON Array Parser ─────────────────────────────────
// JSON 배열에서 최상위 객체를 하나씩 추출하는 경량 스트리밍 파서

async function* streamJsonArray(filePath: string): AsyncGenerator<ApifyProfile> {
  const stream = fs.createReadStream(filePath, { encoding: 'utf-8', highWaterMark: 256 * 1024 })

  let buffer = ''
  let depth = 0
  let inString = false
  let escaped = false
  let objectStart = -1

  for await (const chunk of stream) {
    for (let i = 0; i < chunk.length; i++) {
      const ch = chunk[i]

      if (escaped) {
        escaped = false
        continue
      }

      if (ch === '\\' && inString) {
        escaped = true
        continue
      }

      if (ch === '"') {
        inString = !inString
        continue
      }

      if (inString) continue

      if (ch === '{') {
        if (depth === 0) {
          objectStart = buffer.length + i
        }
        depth++
      } else if (ch === '}') {
        depth--
        if (depth === 0 && objectStart !== -1) {
          // 전체 객체를 추출해서 파싱
          const objStr = buffer.slice(objectStart) + chunk.slice(0, i + 1)
          try {
            yield JSON.parse(objStr) as ApifyProfile
          } catch {
            // 파싱 실패 — 스킵
          }
          buffer = ''
          objectStart = -1
          continue
        }
      }
    }

    if (objectStart !== -1) {
      // 객체가 여전히 진행 중이면 buffer에 누적
      buffer += chunk
    } else {
      buffer = ''
    }
  }
}

// ── Stats ───────────────────────────────────────────────────────

interface Stats {
  total: number
  skippedPrivate: number
  skippedNoUsername: number
  skippedByOffset: number
  created: number
  updated: number
  failed: number
  tier: Record<string, number>
}

const stats: Stats = {
  total: 0,
  skippedPrivate: 0,
  skippedNoUsername: 0,
  skippedByOffset: 0,
  created: 0,
  updated: 0,
  failed: 0,
  tier: {},
}

// ── Import Logic ────────────────────────────────────────────────

const BATCH_SIZE = 50
const CONCURRENCY = 10
const DATA_SOURCE = 'apify_ig_scraper_2026-04-27'

async function processRecord(
  profile: ApifyProfile,
  existingMap: Map<string, string>,
  prisma: PrismaClient,
): Promise<void> {
  const username = profile.username?.trim()
  if (!username) {
    stats.skippedNoUsername++
    return
  }

  if (profile.private) {
    stats.skippedPrivate++
    return
  }

  try {
    const followers = profile.followersCount ?? 0
    const following = profile.followsCount ?? 0
    const postsCount = profile.postsCount ?? 0
    const posts = profile.latestPosts ?? []
    const tier = calcTier(followers)
    const engagementRate = calcEngagementRate(posts, followers)

    stats.tier[tier] = (stats.tier[tier] ?? 0) + 1

    const lastPostDate = getLastPostDate(posts)
    const thumbnails = getPostThumbnails(posts)
    const now = new Date()

    const igData = {
      igUsername: username,
      igFollowers: followers,
      igFollowing: following,
      igPostsCount: postsCount,
      igBio: profile.biography || null,
      igEngagementRate: engagementRate,
      igTier: tier,
      igProfilePicUrl: profile.profilePicUrl || null,
      // 전체 평균
      igAvgLikes: calcAvgLikes(posts),
      igAvgComments: calcAvgComments(posts),
      igAvgVideoViews: calcAvgVideoViews(posts),
      igAvgVideoLikes: calcAvgVideoLikes(posts),
      // Feed (이미지/캐러셀) 평균
      igAvgFeedLikes: calcAvgFeedLikes(posts),
      igAvgFeedComments: calcAvgFeedComments(posts),
      // Reel 평균
      igAvgReelViews: calcAvgReelViews(posts),
      igAvgReelLikes: calcAvgReelLikes(posts),
      // 포스트 썸네일 + 마지막 업로드
      igRecentPostThumbnails: thumbnails.length > 0 ? thumbnails : undefined,
      igLastUploadDate: lastPostDate,
      igLastPostAt: lastPostDate ? new Date(lastPostDate) : null,
      // 동기화 추적
      igDataImportedAt: now,
      igDataSource: DATA_SOURCE,
      igLastSyncedAt: now,
      igSyncStatus: 'SUCCESS',
    }

    // 기존 Creator 찾기
    const existingId = existingMap.get(username)
    if (existingId) {
      if (!DRY_RUN) {
        await prisma.creator.update({ where: { id: existingId }, data: igData })
      }
      stats.updated++
      return
    }

    if (DRY_RUN) {
      stats.created++
      return
    }

    // 신규 User 생성
    const displayName = truncate(profile.biography?.split('\n')[0] || username, 50)
    let email = `${username}@ig.placeholder`
    let user
    try {
      user = await prisma.user.create({
        data: {
          email,
          name: truncate(username, 100) ?? username,
          role: 'creator',
          status: 'active',
        },
      })
    } catch (e) {
      const err = e as { code?: string }
      if (err?.code !== 'P2002') throw e
      email = `${username}.${randomUUID().slice(0, 4)}@ig.placeholder`
      user = await prisma.user.create({
        data: {
          email,
          name: truncate(username, 100) ?? username,
          role: 'creator',
          status: 'active',
        },
      })
    }

    // Creator 생성
    let creatorUsername = username
    try {
      await prisma.creator.create({
        data: {
          userId: user.id,
          username: creatorUsername,
          displayName,
          instagramHandle: username,
          instagram: `https://instagram.com/${username}`,
          ...igData,
        },
      })
    } catch (e) {
      const err = e as { code?: string }
      if (err?.code !== 'P2002') throw e
      creatorUsername = `${username}_${randomUUID().slice(0, 4)}`
      await prisma.creator.create({
        data: {
          userId: user.id,
          username: creatorUsername,
          displayName,
          instagramHandle: username,
          instagram: `https://instagram.com/${username}`,
          ...igData,
        },
      })
    }

    stats.created++
  } catch (err) {
    stats.failed++
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[FAIL] @${username}: ${msg}`)
  }
}

async function processBatch(
  records: ApifyProfile[],
  prisma: PrismaClient,
): Promise<void> {
  const usernames = records
    .map(r => r.username?.trim())
    .filter((u): u is string => !!u && !records.find(r => r.username === u && r.private))

  // 기존 Creator 일괄 조회
  const existingMap = new Map<string, string>()
  if (usernames.length > 0 && !DRY_RUN) {
    const existingList = await prisma.creator.findMany({
      where: {
        OR: [
          { igUsername: { in: usernames } },
          { instagramHandle: { in: usernames } },
        ],
      },
      select: { id: true, igUsername: true, instagramHandle: true },
    })
    for (const e of existingList) {
      if (e.igUsername) existingMap.set(e.igUsername, e.id)
      if (e.instagramHandle && !existingMap.has(e.instagramHandle)) {
        existingMap.set(e.instagramHandle, e.id)
      }
    }
  }

  // 병렬 처리
  for (let j = 0; j < records.length; j += CONCURRENCY) {
    const slice = records.slice(j, j + CONCURRENCY)
    await Promise.all(slice.map(r => processRecord(r, existingMap, prisma)))
  }
}

// ── Main ────────────────────────────────────────────────────────

async function main() {
  console.log(`[INFO] 파일: ${resolvedPath}`)
  console.log(`[INFO] 파일 크기: ${(fs.statSync(resolvedPath).size / (1024 ** 3)).toFixed(2)} GB`)
  console.log(`[INFO] SKIP: ${SKIP_COUNT}`)
  console.log(`[INFO] DRY_RUN: ${DRY_RUN}`)
  console.log('')

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  let batch: ApifyProfile[] = []
  let index = 0
  const startTime = Date.now()

  for await (const profile of streamJsonArray(resolvedPath)) {
    stats.total++
    index++

    if (index <= SKIP_COUNT) {
      stats.skippedByOffset++
      if (index % 10000 === 0) {
        console.log(`[SKIP] ${index}/${SKIP_COUNT}...`)
      }
      continue
    }

    batch.push(profile)

    if (batch.length >= BATCH_SIZE) {
      const currentBatch = batch
      batch = []
      await processBatch(currentBatch, prisma)

      const processed = stats.created + stats.updated + stats.failed + stats.skippedPrivate + stats.skippedNoUsername
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
      const rate = (processed / Number(elapsed) || 0).toFixed(1)
      console.log(
        `[${index}] 처리: ${processed} | 생성: ${stats.created} | 업데이트: ${stats.updated} | ` +
        `스킵(비공개): ${stats.skippedPrivate} | 실패: ${stats.failed} | ${rate}/s | ${elapsed}s`,
      )
    }
  }

  // 잔여 배치 처리
  if (batch.length > 0) {
    await processBatch(batch, prisma)
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)

  console.log('\n=== 임포트 완료 ===')
  console.log(`전체 레코드:       ${stats.total}`)
  console.log(`오프셋 스킵:       ${stats.skippedByOffset}`)
  console.log(`비공개 스킵:       ${stats.skippedPrivate}`)
  console.log(`username 없음:     ${stats.skippedNoUsername}`)
  console.log(`신규 생성:         ${stats.created}`)
  console.log(`업데이트:          ${stats.updated}`)
  console.log(`실패:              ${stats.failed}`)
  console.log(`소요 시간:         ${elapsed}s`)
  console.log('\n티어별 분포:')
  for (const [tier, count] of Object.entries(stats.tier).sort()) {
    console.log(`  ${tier}: ${count}`)
  }

  await prisma.$disconnect()
  await pool.end()
}

main().catch(err => {
  console.error('임포트 스크립트 에러:', err)
  process.exit(1)
})
