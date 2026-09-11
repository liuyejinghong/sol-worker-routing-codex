import http from 'node:http';
export async function goObserver() {
  const requests: any[] = [];
  const allowed = new Map([['deepseek-v4.1-flash', 'max'], ['muse-spark-1.3-contributor', 'xhigh']]);
  const server = http.createServer(async (req, res) => {
    const row: any = { time: new Date().toISOString() };
    try {
      const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks); const data = JSON.parse(body.toString());
      Object.assign(row, { model: data.model, effort: data.reasoning_effort ?? data.reasoning?.effort, path: req.url, tools: (data.tools || []).map((t: any) => t.function?.name ?? t.name).filter(Boolean) }); requests.push(row);
      if (!allowed.has(data.model) || row.effort !== allowed.get(data.model) || requests.length > 50 || !['/v1/chat/completions', '/v1/responses'].includes(req.url || '')) {
        row.blocked = true; res.writeHead(403, { 'content-type': 'application/json' }).end(JSON.stringify({ error: { message: 'Acceptance observer rejected model, reasoning or request count' } })); return;
      }
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(req.headers)) if (value && !['host', 'connection', 'content-length', 'transfer-encoding', 'accept-encoding'].includes(key)) headers[key] = String(value);
      const response = await fetch('https://opencode.ai/zen/go' + req.url, { method: 'POST', headers, body, signal: AbortSignal.timeout(180000) });
      row.status = response.status; res.writeHead(response.status, { 'content-type': response.headers.get('content-type') || 'application/json' });
      let text = ''; const decoder = new TextDecoder();
      for await (const chunk of response.body!) { text += decoder.decode(chunk, { stream: true }); res.write(chunk); }
      text += decoder.decode(); res.end();
      const records: any[] = [];
      if (text.trim().startsWith('{')) { try { records.push(JSON.parse(text)); } catch {} }
      else for (const line of text.split('\n')) if (line.startsWith('data: ') && line.slice(6) !== '[DONE]') { try { records.push(JSON.parse(line.slice(6))); } catch {} }
      row.response_models = [...new Set(records.flatMap(r => [r.model, r.response?.model]).filter(Boolean))];
      row.usage = records.map(r => r.usage ?? r.response?.usage).filter(Boolean).at(-1);
    } catch (error) { row.error = error instanceof Error ? error.name : 'observer error'; res.destroy(); }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  return { url: `http://127.0.0.1:${(server.address() as any).port}/v1`, requests,
    close: async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); } };
}
