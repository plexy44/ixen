
import { TikTokLiveConnector } from 'tiktok-live-connector';

export const dynamic = 'force-dynamic'; // Defaults to auto

// Helper to create a response with Server-Sent Events
function createSSEStream(username: string) {
  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (event: string, data: any) => {
        try {
            controller.enqueue(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        } catch (e) {
            console.warn('[SSE] Could not enqueue data, controller is likely closed.', e);
        }
      };

      try {
        console.log(`[SSE] Starting stream for @${username}`);
        const tiktokLiveConnector = new TikTokLiveConnector(username, {
          // These options are recommended for stability
          requestRetryCount: 20,
          requestRetryDelay: 2000,
          fetchSubgifts: false,
        });

        tiktokLiveConnector.on('connect', (state) => {
          console.log(`[TikTok] Successfully connected to stream for @${username}. Room ID: ${state.roomId}`);
          enqueue('connected', { message: `Connected to @${username}` });
        });

        tiktokLiveConnector.on('comment', (comment) => {
          enqueue('comment', comment);
        });

        tiktokLiveConnector.on('disconnect', (reason) => {
          console.log(`[TikTok] Disconnected from @${username}'s stream. Reason: ${reason}`);
          enqueue('disconnected', { message: 'Stream disconnected.' });
          controller.close();
        });

        tiktokLiveConnector.on('error', (err) => {
          console.error(`[TikTok] Error from TikTok connector for @${username}:`, err);
          enqueue('error', { message: 'An error occurred with the TikTok connection.', error: err.toString() });
          controller.close();
        });
        
        // Asynchronously connect and handle initial connection errors
        await tiktokLiveConnector.connect();

      } catch (err: any) {
        console.error(`[SSE] Server-side error for @${username}:`, err);
        // Ensure the client gets an error event even for synchronous errors during setup
        enqueue('error', { message: `Failed to connect to @${username}. The user might not be live or the username is invalid.`, error: err.toString() });
        controller.close();
      }
    },
    cancel() {
      // This is called when the client disconnects.
      // We don't have a direct `disconnect` method on the connector instance,
      // but closing the stream should clean things up.
      console.log(`[SSE] Client disconnected from @${username}'s stream.`);
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

  // Remove leading '@' if present
  const cleanedUsername = username.startsWith('@') ? username.substring(1) : username;

  return createSSEStream(cleanedUsername);
}
