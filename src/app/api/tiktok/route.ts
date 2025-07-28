// File: app/api/tiktok/route.ts

import { TikTokLiveConnector, WebcastEvent, ControlEvent } from 'tiktok-live-connector';

export const dynamic = 'force-dynamic';

function createSSEStream(username: string) {
  let tiktokLiveConnector: TikTokLiveConnector;

  const stream = new ReadableStream({
    start(controller) {
      const enqueue = (event: string, data: any) => {
        try {
            controller.enqueue(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        } catch (e) {
            // The controller is likely closed, which is okay in many cases (client disconnected).
        }
      };

      console.log(`[SSE] Starting stream for @${username}`);
      tiktokLiveConnector = new TikTokLiveConnector(username, {
        requestRetryCount: 20,
        requestRetryDelay: 2000,
        fetchSubgifts: false,
      });

      tiktokLiveConnector.on(ControlEvent.CONNECTED, (state) => {
        console.log(`[TikTok] Successfully connected to stream for @${username}. Room ID: ${state.roomId}`);
        enqueue('connected', { message: `Connected to @${username}` });
      });

      tiktokLiveConnector.on(WebcastEvent.CHAT, (comment) => {
        enqueue('comment', comment);
      });

      tiktokLiveConnector.on(ControlEvent.DISCONNECTED, (reason) => {
        console.log(`[TikTok] Disconnected from @${username}'s stream. Reason: ${reason}`);
        enqueue('disconnected', { message: 'Stream disconnected.' });
        controller.close(); // Close the stream on disconnect
      });

      tiktokLiveConnector.on(ControlEvent.ERROR, (err: any) => {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`[TikTok] Error from TikTok connector for @${username}:`, errorMessage);
        enqueue('error', { message: 'An error occurred with the TikTok connection.', error: errorMessage });
        controller.close(); // Close the stream on error
      });
      
      tiktokLiveConnector.connect();
    },
    cancel() {
      console.log(`[SSE] Client disconnected from @${username}'s stream.`);
      if (tiktokLiveConnector) {
        tiktokLiveConnector.disconnect();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (!username) {
    return new Response(JSON.stringify({ error: 'Username is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const cleanedUsername = username.startsWith('@') ? username.substring(1) : username;

  return createSSEStream(cleanedUsername);
}
