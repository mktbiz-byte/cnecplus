export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // 서버 시작 시 로깅
    console.log(`[CNEC] Server started at ${new Date().toISOString()}`);
    console.log(`[CNEC] Node.js ${process.version}`);
    console.log(`[CNEC] Environment: ${process.env.NODE_ENV}`);
  }
}
