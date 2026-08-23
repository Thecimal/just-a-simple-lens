// apps/web/src/lib/api.js
const API_BASE = import.meta.env.PUBLIC_API_BASE_URL || 'http://localhost:8787';

/**
 * Streams analysis progress via SSE and resolves with the final report.
 * @param {string} url
 * @param {(stage: {stage: string, label: string}) => void} onStage
 * @returns {Promise<object>}
 */
export function analyzeStream(url, onStage) {
  return new Promise((resolve, reject) => {
    const es = new EventSource(
      `${API_BASE}/api/analyze/stream?url=${encodeURIComponent(url)}`
    );

    es.addEventListener('stage', (e) => onStage(JSON.parse(e.data)));

    es.addEventListener('done', (e) => {
      es.close();
      resolve(JSON.parse(e.data));
    });

    es.addEventListener('error', (e) => {
      es.close();
      const detail = e.data ? JSON.parse(e.data) : { message: 'Connection lost' };
      reject(new Error(detail.message));
    });
  });
}
